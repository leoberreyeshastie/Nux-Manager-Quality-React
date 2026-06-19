import { supabase } from './supabase';

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
  const { error } = await supabase
    .from('hallazgos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}