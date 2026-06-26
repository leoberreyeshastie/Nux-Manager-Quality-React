import { supabase } from './supabase';
import { generateRecepcionId } from '../lib/utils'; // función auxiliar

export async function getRecepciones({
  page = 1,
  limit = 10,
  search = '',
  estado = '',
  mes = '',
  anio = '',
  proveedorId = '',
  producto = '',
  fechaDesde = '',
  fechaHasta = '',
}) {
  try {
    let query = supabase
      .from('recepciones_materias_primas')
      .select(
        `
          *,
          resumen:recepcion_detalle(
            producto,
            cantidad,
            unidad_medida
          )
        `,
        { count: 'exact' }
      )
      .eq('activo', true)
      .order('fecha_recepcion', { ascending: false });

    // Búsqueda por texto (folio, proveedor)
    if (search) {
      query = query.or(
        `recepcion_id.ilike.%${search}%, proveedor_nombre.ilike.%${search}%`
      );
    }

    // Filtro por estado
    if (estado) {
      query = query.eq('estado', estado);
    }

    // Filtro por mes (si se envía, se aplica sobre fecha_recepcion)
    if (mes) {
      const mesNum = parseInt(mes);
      const anioNum = anio ? parseInt(anio) : new Date().getFullYear();
      const startDate = new Date(anioNum, mesNum - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(anioNum, mesNum, 0).toISOString().split('T')[0];
      query = query.gte('fecha_recepcion', startDate).lte('fecha_recepcion', endDate);
    } else if (anio) {
      // Si solo se filtra por año
      const anioNum = parseInt(anio);
      const startDate = new Date(anioNum, 0, 1).toISOString().split('T')[0];
      const endDate = new Date(anioNum, 11, 31).toISOString().split('T')[0];
      query = query.gte('fecha_recepcion', startDate).lte('fecha_recepcion', endDate);
    }

    // Filtro por proveedor (ID exacto)
    if (proveedorId) {
      query = query.eq('proveedor_id', proveedorId);
    }

    // Filtro por producto (búsqueda en los detalles)
    if (producto) {
      // Usamos una subconsulta para filtrar recepciones que tengan productos con ese nombre
      const { data: recepcionesConProducto, error: errorSub } = await supabase
        .from('recepcion_detalle')
        .select('recepcion_id')
        .ilike('producto', `%${producto}%`);

      if (errorSub) throw errorSub;
      const ids = recepcionesConProducto.map((item) => item.recepcion_id);
      if (ids.length === 0) {
        // Si no hay coincidencias, devolvemos un conjunto vacío
        return { data: [], count: 0, page, limit };
      }
      query = query.in('id', ids);
    }

    // Filtro por rango de fechas
    if (fechaDesde) {
      query = query.gte('fecha_recepcion', fechaDesde);
    }
    if (fechaHasta) {
      query = query.lte('fecha_recepcion', fechaHasta);
    }

    // Paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return { data, count, page, limit };
  } catch (error) {
    console.error('Error en getRecepciones:', error);
    throw new Error('No se pudieron cargar las recepciones.');
  }
}

/**
 * Obtiene una recepción por ID con su detalle y evidencias
 */
export async function getRecepcionById(id) {
  try {
    // Cabecera
    const { data: recepcion, error: errorRecep } = await supabase
      .from('recepciones_materias_primas')
      .select('*')
      .eq('id', id)
      .eq('activo', true)
      .single();
    if (errorRecep) throw errorRecep;

    // Detalle de productos
    const { data: detalles, error: errorDet } = await supabase
      .from('recepcion_detalle')
      .select('*')
      .eq('recepcion_id', id)
      .order('created_at', { ascending: true });
    if (errorDet) throw errorDet;

    // Evidencias
    const { data: evidencias, error: errorEvid } = await supabase
      .from('evidencias_recepcion')
      .select('*')
      .eq('recepcion_id', id)
      .order('created_at', { ascending: false });
    if (errorEvid) throw errorEvid;

    // Resumen de productos por unidad
    const resumen = {};
    detalles.forEach(d => {
      if (!resumen[d.unidad_medida]) resumen[d.unidad_medida] = 0;
      resumen[d.unidad_medida] += Number(d.cantidad);
    });
    const resumenText = Object.entries(resumen)
      .map(([unidad, total]) => `${total} ${unidad}`)
      .join(', ');

    return {
      ...recepcion,
      detalles: detalles || [],
      evidencias: evidencias || [],
      resumen: resumenText,
    };
  } catch (error) {
    console.error('Error en getRecepcionById:', error);
    throw new Error('No se pudo obtener el detalle de la recepción.');
  }
}

/**
 * Crea una nueva recepción con su detalle
 */
export async function createRecepcion(data) {
  try {
    const { detalles, ...cabecera } = data;
    const recepcionId = generateRecepcionId();
    const { data: user } = await supabase.auth.getUser();

    const cabeceraData = {
      ...cabecera,
      recepcion_id: recepcionId,
      creado_por: user.user.id,
    };

    const { data: newRecepcion, error: errorCab } = await supabase
      .from('recepciones_materias_primas')
      .insert([cabeceraData])
      .select()
      .single();
    if (errorCab) throw errorCab;

    // Insertar detalles
    if (detalles && detalles.length > 0) {
      const detallesData = detalles.map(d => ({
        recepcion_id: newRecepcion.id,
        producto: d.producto,
        cantidad: d.cantidad,
        unidad_medida: d.unidad_medida,
        descripcion: d.descripcion || '',
      }));
      const { error: errorDet } = await supabase
        .from('recepcion_detalle')
        .insert(detallesData);
      if (errorDet) throw errorDet;
    }

    return { ...newRecepcion, detalles };
  } catch (error) {
    console.error('Error en createRecepcion:', error);
    throw new Error('No se pudo crear la recepción.');
  }
}

/**
 * Actualiza una recepción existente (cabecera + detalle)
 */
export async function updateRecepcion(id, data) {
  try {
    const { detalles, ...cabecera } = data;

    // Actualizar cabecera
    const { data: updated, error: errorCab } = await supabase
      .from('recepciones_materias_primas')
      .update(cabecera)
      .eq('id', id)
      .select()
      .single();
    if (errorCab) throw errorCab;

    // Reemplazar detalles
    if (detalles !== undefined) {
      // Eliminar antiguos
      const { error: errorDel } = await supabase
        .from('recepcion_detalle')
        .delete()
        .eq('recepcion_id', id);
      if (errorDel) throw errorDel;
      // Insertar nuevos
      if (detalles.length > 0) {
        const detallesData = detalles.map(d => ({
          recepcion_id: id,
          producto: d.producto,
          cantidad: d.cantidad,
          unidad_medida: d.unidad_medida,
          descripcion: d.descripcion || '',
        }));
        const { error: errorIns } = await supabase
          .from('recepcion_detalle')
          .insert(detallesData);
        if (errorIns) throw errorIns;
      }
    }

    return { ...updated, detalles };
  } catch (error) {
    console.error('Error en updateRecepcion:', error);
    throw new Error('No se pudo actualizar la recepción.');
  }
}

/**
 * Elimina lógicamente (soft delete) una recepción
 */
export async function deleteRecepcion(id) {
  try {
    const { error } = await supabase
      .from('recepciones_materias_primas')
      .update({ activo: false })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error en deleteRecepcion:', error);
    throw new Error('No se pudo eliminar la recepción.');
  }
}

/**
 * Obtiene el conteo de recepciones del mes actual (para dashboard)
 */
export async function getRecepcionesCountThisMonth() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { count, error } = await supabase
      .from('recepciones_materias_primas')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .gte('fecha_recepcion', startOfMonth)
      .lte('fecha_recepcion', endOfMonth);
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error en getRecepcionesCountThisMonth:', error);
    return 0;
  }
}