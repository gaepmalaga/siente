// Un artículo es público si no es borrador y su fecha ya ha llegado: los
// artículos con fecha futura quedan programados y aparecen solos (la web se
// recompila cada mañana).
import type { CollectionEntry } from 'astro:content';

export const esPublico = (p: CollectionEntry<'blog'>) => !p.data.draft && p.data.date.getTime() <= Date.now();
