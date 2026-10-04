// Un artículo es público si no es borrador y su fecha (con hora, si la tiene)
// ya ha llegado. Los programados aparecen solos: un vigilante de GitHub
// Actions recompila la web en cuanto llega su momento.
// En la vista previa del panel se ven todos, también borradores y programados.
import type { CollectionEntry } from 'astro:content';

const vistaPrevia = import.meta.env.PUBLIC_VISTA_PREVIA === 'true';

export const esPublico = (p: CollectionEntry<'blog'>) => vistaPrevia || (!p.data.draft && p.data.date.getTime() <= Date.now());
