import { supabase } from './supabase';

export async function getUltimosHallazgos(limite = 8) {
  const { data, error } = await supabase
    .from('hallazgos')
    .select(`
      id,
      fecha_deteccion,
      piezas_detectadas,
      defecto_id,
      observaciones,
      expediente_id,
      expedientes (
        id,
        expediente_id,
        cliente,
        producto,
        estado
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limite);

  if (error) throw error;
  return data;
}