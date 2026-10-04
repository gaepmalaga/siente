// Optimización de imágenes en el navegador antes de subirlas: se giran y
// recortan si hace falta, se reducen a un tamaño razonable y se convierten a
// WebP (o JPEG si el navegador no sabe).
import { bytesABase64, slug } from './texto';

export type ImagenLista = { nombre: string; base64: string; tamano: number; ancho: number; alto: number; vistaPrevia: string; tipo: string };

/** Zona a conservar, en píxeles de la imagen ya girada. */
export type Recorte = { x: number; y: number; ancho: number; alto: number };
export type Giro = 0 | 90 | 180 | 270;

export type Opciones = {
  ladoMaximo?: number;
  calidad?: number;
  recorte?: Recorte | null;
  giro?: Giro;
  /** Formato de salida. Por defecto WebP; al retocar una foto existente se mantiene el suyo. */
  formato?: 'webp' | 'jpeg' | 'png';
  /** Nombre del archivo de salida (sin cambiar si se retoca una foto existente). */
  nombre?: string;
};

/** Dibuja la imagen girada en un lienzo (para recortarla después o mostrarla). */
export function lienzoGirado(img: ImageBitmap, giro: Giro, escala = 1): HTMLCanvasElement {
  const lado = giro === 90 || giro === 270;
  const w = Math.round((lado ? img.height : img.width) * escala);
  const h = Math.round((lado ? img.width : img.height) * escala);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.translate(w / 2, h / 2);
  ctx.rotate((giro * Math.PI) / 180);
  const [dw, dh] = [img.width * escala, img.height * escala];
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  return c;
}

export async function prepararImagen(origen: Blob | File, opciones: Opciones = {}): Promise<ImagenLista> {
  const { ladoMaximo = 1600, calidad = 0.82, recorte = null, giro = 0, formato = 'webp' } = opciones;
  const bitmap = await createImageBitmap(origen);
  const girada = giro ? lienzoGirado(bitmap, giro) : null;
  const fuente: CanvasImageSource = girada ?? bitmap;
  const anchoFuente = girada?.width ?? bitmap.width;
  const altoFuente = girada?.height ?? bitmap.height;
  const zona = recorte ?? { x: 0, y: 0, ancho: anchoFuente, alto: altoFuente };

  const escala = Math.min(1, ladoMaximo / Math.max(zona.ancho, zona.alto));
  const ancho = Math.max(1, Math.round(zona.ancho * escala));
  const alto = Math.max(1, Math.round(zona.alto * escala));
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fuente, zona.x, zona.y, zona.ancho, zona.alto, 0, 0, ancho, alto);
  bitmap.close();

  const tipo = `image/${formato}`;
  let blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, tipo, calidad));
  if (!blob || blob.type !== tipo) blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/jpeg', 0.86));
  if (!blob) throw new Error('No se ha podido procesar la imagen.');
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  const original = origen instanceof File ? origen.name : 'imagen';
  const base = slug(original.replace(/\.[^.]+$/, '')) || 'imagen';
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    nombre: opciones.nombre ?? `${base}.${ext}`,
    base64: bytesABase64(bytes),
    tamano: bytes.length,
    ancho,
    alto,
    vistaPrevia: URL.createObjectURL(blob),
    tipo: blob.type,
  };
}

/** Formato que corresponde a una extensión, para retocar una foto sin cambiar su nombre. */
export const formatoDe = (ruta: string): 'webp' | 'jpeg' | 'png' =>
  /\.png$/i.test(ruta) ? 'png' : /\.jpe?g$/i.test(ruta) ? 'jpeg' : 'webp';
