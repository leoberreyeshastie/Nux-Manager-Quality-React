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

export async function updateExpediente(id, updates) {
  // Solo actualizar el expediente, ignorar hallazgos
  const { hallazgos, ...expedienteUpdates } = updates;
  const { error } = await supabase
    .from('expedientes')
    .update(expedienteUpdates)
    .eq('id', id);

  if (error) throw error;
  
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