// Colecciones de contenido. Los archivos .md los edita el panel /admin
// (Sveltia CMS), así que los campos de aquí tienen que coincidir con los de
// src/pages/admin/config.yml.ts.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    category: z.enum(['vista', 'oido', 'general']).default('general'),
    draft: z.boolean().default(false),
  }),
});

const servicios = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/servicios' }),
  schema: z.object({
    title: z.string(),
    h1: z.string(),
    seoTitle: z.string(),
    description: z.string(),
    area: z.enum(['vista', 'oido']),
    order: z.number().default(10),
    icon: z.string().default('Eye'),
    summary: z.string(),
    badge: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    highlights: z.array(z.string()).default([]),
    steps: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    cita: z.string().optional(),
  }),
});

export const collections = { blog, servicios };
