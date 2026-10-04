// Optimización de imágenes en el navegador antes de subirlas: se reducen a un
// tamaño razonable y se convierten a WebP (o JPEG si el navegador no sabe).
import { bytesABase64, slug } from './texto';

export type ImagenLista = { nombre: string; base64: string; tamano: number; ancho: number; alto: number; vistaPrevia: string; tipo: string };

export async function prepararImagen(archivo: File, ladoMaximo = 1600, calidad = 0.82): Promise<ImagenLista> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  let blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/webp', calidad));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/jpeg', 0.86));
  if (!blob) throw new Error('No se ha podido procesar la imagen.');
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const base = slug(archivo.name.replace(/\.[^.]+$/, '')) || 'imagen';
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    nombre: `${base}.${ext}`,
    base64: bytesABase64(bytes),
    tamano: bytes.length,
    ancho,
    alto,
    vistaPrevia: URL.createObjectURL(blob),
    tipo: blob.type,
  };
}
