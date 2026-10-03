// Fotos del local en src/assets/fotos. Astro las optimiza (AVIF/WebP y
// tamaños responsive) al compilar. Se referencian por nombre de archivo.
import type { ImageMetadata } from 'astro';

const archivos = import.meta.glob<{ default: ImageMetadata }>('../assets/fotos/*.{jpg,jpeg,png,webp}', {
  eager: true,
});

export const fotos: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(archivos).map(([ruta, modulo]) => [ruta.split('/').pop()!.replace(/\.\w+$/, ''), modulo.default]),
);

export const foto = (clave?: string): ImageMetadata => (clave && fotos[clave]) || fotos['expositor-gafas'];
