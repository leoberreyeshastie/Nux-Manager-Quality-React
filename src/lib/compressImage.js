import imageCompression from 'browser-image-compression';

export async function compressImage(file, maxWidthOrHeight = 1024, quality = 0.7) {
  const options = {
    maxWidthOrHeight,
    useWebWorker: true,
    quality,
  };
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error comprimiendo imagen:', error);
    throw error;
  }
}