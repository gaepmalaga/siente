// Colecciones de contenido. Los esquemas están en src/lib/esquemas.ts y los
// comparte el panel /admin, que valida antes de publicar.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { Articulo, Servicio } from './lib/esquemas';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: Articulo,
});

const servicios = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/servicios' }),
  schema: Servicio,
});

export const collections = { blog, servicios };
