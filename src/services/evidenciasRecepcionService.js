import { supabase } from './supabase';

/**
 * Sube una evidencia (archivo) asociada a una recepción.
 * El archivo ya debe estar comprimido si es imagen (se hace en el frontend).
 * @param {File} file - Archivo a subir (ya comprimido si es imagen).
 * @param {string} recepcionId - UUID de la recepción.
 * @param {string} tipoArchivo - Categoría (ej: 'foto_producto', 'factura_pdf').
 * @param {string} descripcion - Descripción opcional.
 * @returns {Promise<Object>} - Datos de la evidencia guardada.
 */
export async function uploadEvidencia(file, recepcionId, tipoArchivo = 'otro', descripcion = '') {
  try {
    // Sanitizar nombre del archivo para evitar caracteres inválidos en Storage
    const cleanName = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const fileName = `${timestamp}_${cleanName}`;
    const filePath = `${recepcionId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('recepciones')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Guardar SOLO la ruta (no la URL pública) para generar URL firmada después
    const { data: evidencia, error: dbError } = await supabase
      .from('evidencias_recepcion')
      .insert([{
        recepcion_id: recepcionId,
        nombre_archivo: file.name,
        ruta_archivo: filePath, // guardamos la ruta, no la URL pública
        tipo_archivo: tipoArchivo,
        descripcion,
        tamano_kb: Math.round(file.size / 1024),
      }])
      .select()
      .single();

    if (dbError) throw dbError;
    return evidencia;
  } catch (error) {
    console.error('Error en uploadEvidencia:', error);
    throw new Error('No se pudo subir la evidencia.');
  }
}

/**
 * Elimina una evidencia (tanto de Storage como de la BD)
 */
export async function deleteEvidencia(evidenciaId, filePath) {
  try {
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('recepciones')
        .remove([filePath]);
      if (storageError) throw storageError;
    }
    const { error: dbError } = await supabase
      .from('evidencias_recepcion')
      .delete()
      .eq('id', evidenciaId);
    if (dbError) throw dbError;
    return true;
  } catch (error) {
    console.error('Error en deleteEvidencia:', error);
    throw new Error('No se pudo eliminar la evidencia.');
  }
}

/**
 * Genera una URL firmada para un archivo en Storage
 * @param {string} filePath - Ruta del archivo (ej: "uuid/nombre.jpg")
 * @param {number} expiresIn - Segundos hasta que expire (default: 300 = 5 min)
 * @returns {Promise<string>} URL firmada
 */
export async function getSignedUrl(filePath, expiresIn = 300) {
  try {
    const { data, error } = await supabase.storage
      .from('recepciones')
      .createSignedUrl(filePath, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error al generar URL firmada:', error);
    throw new Error('No se pudo obtener la URL de la evidencia.');
  }
}

/**
 * Sanitiza un nombre de archivo para que sea válido en Supabase Storage.
 */
function sanitizeFileName(fileName) {
  let sanitized = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]/, '')
    .replace(/[._]$/, '');
  return sanitized;
}