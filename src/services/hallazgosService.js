import { supabase } from './supabase';
import { deleteEvidencia } from './evidenciasService';

export async function getHallazgosByExpediente(expedienteId) {
  const { data, error } = await supabase
    .from('hallazgos')
    .select('*, evidencias(*)')
    .eq('expediente_id', expedienteId);

  if (error) throw error;
  return data;
}

export async function createHallazgo(hallazgoData) {
  const { data, error } = await supabase
    .from('hallazgos')
    .insert([hallazgoData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHallazgo(id, updates) {
  console.log("Id a actulizar",id);
  console.log("Hallazgo a actulizar",updates);
  const { data, error } = await supabase
    .from('hallazgos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHallazgo(id) {
  // 1. Obtener las evidencias del hallazgo para eliminar los archivos
  const { data: evidencias, error: errGet } = await supabase
    .from('evidencias')
    .select('id, ruta_archivo')
    .eq('hallazgo_id', id);

  if (errGet) throw errGet;

  // 2. Eliminar cada evidencia (archivo + registro)
  for (const ev of evidencias) {
    await deleteEvidencia(ev.id, ev.ruta_archivo);
  }

  // 3. Eliminar el hallazgo (se eliminarán las evidencias en cascada, pero ya las borramos)
  const { error } = await supabase
    .from('hallazgos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}