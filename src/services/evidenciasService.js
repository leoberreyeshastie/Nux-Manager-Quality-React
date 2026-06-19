import { supabase } from './supabase';

// Subir archivo a Storage y crear registro en evidencias
export async function uploadEvidencia(hallazgoId, file, descripcion = '', fechaCaptura = null) {
  // Comprimir la imagen antes de subir (lo haremos en el front, pero esta función solo sube)
  // Recibimos el file ya comprimido
  const filePath = `evidencias/${hallazgoId}/${Date.now()}_${file.name}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('evidencias') // nombre del bucket
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from('evidencias')
    .getPublicUrl(filePath);

  const rutaArchivo = urlData.publicUrl;

  // Insertar registro en tabla evidencias
  const evidencia = {
    hallazgo_id: hallazgoId,
    nombre_archivo: file.name,
    ruta_archivo: rutaArchivo,
    descripcion: descripcion || '',
    tamano_kb: Math.round(file.size / 1024),
    fecha_captura: fechaCaptura || new Date().toISOString().split('T')[0]
  };

  const { data: evidenciaData, error: evError } = await supabase
    .from('evidencias')
    .insert([evidencia])
    .select()
    .single();

  if (evError) throw evError;
  return evidenciaData;
}

export async function deleteEvidencia(id, rutaArchivo) {
  // Extraer la ruta del bucket de la URL pública
  // Suponiendo que la URL es algo como: https://.../storage/v1/object/public/evidencias/...
  const url = new URL(rutaArchivo);
  const pathParts = url.pathname.split('/');
  const bucketIndex = pathParts.indexOf('evidencias');
  const filePath = pathParts.slice(bucketIndex + 1).join('/');

  // Eliminar de Storage
  const { error: storageError } = await supabase.storage
    .from('evidencias')
    .remove([filePath]);

  if (storageError) throw storageError;

  // Eliminar registro
  const { error: dbError } = await supabase
    .from('evidencias')
    .delete()
    .eq('id', id);

  if (dbError) throw dbError;
}