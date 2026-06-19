import { supabase } from './supabase';

// Obtener todos los expedientes con hallazgos y evidencias
export async function getExpedientes() {
  const { data, error } = await supabase
    .from('expedientes')
    .select(`
      *,
      hallazgos (
        *,
        evidencias (*)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Obtener un expediente por ID (UUID)
export async function getExpedienteById(id) {
  const { data, error } = await supabase
    .from('expedientes')
    .select(`
      *,
      hallazgos (
        *,
        evidencias (*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Crear expediente con hallazgos y evidencias (transacción manual)
export async function createExpediente(expedienteData) {
  // expedienteData debe contener: expediente_id, codigo_orden, interna, cliente_nux, mes_produccion, anio_produccion, consecutivo, fecha_creacion, cliente, producto, cantidad_producida, estado (opcional)
  // Además, puede tener un array 'hallazgos' con sus respectivas 'evidencias'
  const { hallazgos, ...expediente } = expedienteData;

  // 1. Insertar expediente
  const { data: expedienteInsertado, error: errExp } = await supabase
    .from('expedientes')
    .insert([expediente])
    .select()
    .single();

  if (errExp) throw errExp;

  const expedienteId = expedienteInsertado.id;

  // 2. Insertar hallazgos si existen
  if (hallazgos && hallazgos.length > 0) {
    for (const h of hallazgos) {
      const { evidencias, ...hallazgo } = h;
      hallazgo.expediente_id = expedienteId;

      const { data: hallazgoInsertado, error: errHal } = await supabase
        .from('hallazgos')
        .insert([hallazgo])
        .select()
        .single();

      if (errHal) throw errHal;

      const hallazgoId = hallazgoInsertado.id;

      // 3. Insertar evidencias si existen
      if (evidencias && evidencias.length > 0) {
        for (const ev of evidencias) {
          ev.hallazgo_id = hallazgoId;
          // Si la evidencia tiene un archivo, debemos subirlo a Storage
          // (lo haremos en un paso separado, por ahora solo guardamos la ruta)
          const { error: errEv } = await supabase
            .from('evidencias')
            .insert([ev]);

          if (errEv) throw errEv;
        }
      }
    }
  }

  // Devolver el expediente completo con sus relaciones
  return await getExpedienteById(expedienteId);
}

// Actualizar expediente (incluyendo hallazgos y evidencias)
export async function updateExpediente(id, updates) {
  // Separar hallazgos y evidencias del resto
  const { hallazgos, ...expedienteUpdates } = updates;

  // 1. Actualizar expediente
  const { error: errExp } = await supabase
    .from('expedientes')
    .update(expedienteUpdates)
    .eq('id', id);

  if (errExp) throw errExp;

  // 2. Manejar hallazgos (borrar los existentes y reinsertar? o actualizar individualmente)
  // Para simplificar, borramos todos los hallazgos del expediente y los reinsertamos
  // O podemos hacer un upsert con lógica más fina. Por ahora, reemplazamos:
  if (hallazgos !== undefined) {
    // Eliminar hallazgos actuales (y sus evidencias por cascade)
    const { error: errDel } = await supabase
      .from('hallazgos')
      .delete()
      .eq('expediente_id', id);

    if (errDel) throw errDel;

    // Reinsertar nuevos hallazgos
    for (const h of hallazgos) {
      const { evidencias, ...hallazgo } = h;
      hallazgo.expediente_id = id;

      const { data: hallazgoInsertado, error: errHal } = await supabase
        .from('hallazgos')
        .insert([hallazgo])
        .select()
        .single();

      if (errHal) throw errHal;

      const hallazgoId = hallazgoInsertado.id;

      if (evidencias && evidencias.length > 0) {
        for (const ev of evidencias) {
          ev.hallazgo_id = hallazgoId;
          const { error: errEv } = await supabase
            .from('evidencias')
            .insert([ev]);

          if (errEv) throw errEv;
        }
      }
    }
  }

  return await getExpedienteById(id);
}

// Soft delete (cambiar estado a ANULADO)
export async function deleteExpediente(id, motivo = '') {
  const { error } = await supabase
    .from('expedientes')
    .update({
      estado: 'ANULADO',
      fecha_anulacion: new Date().toISOString().split('T')[0],
      motivo_anulacion: motivo
    })
    .eq('id', id);

  if (error) throw error;
}