// Páginas de la web, para insertar enlaces internos y abrir «Ver en la web».
import { estado } from './estado.svelte';
import { RUTAS } from './backend';
import { leerMd } from './frontmatter';

export type Pagina = { titulo: string; ruta: string; grupo: string };

const FIJAS: Pagina[] = [
  { titulo: 'Inicio', ruta: '/', grupo: 'Páginas' },
  { titulo: 'Pedir cita', ruta: '/pedir-cita/', grupo: 'Páginas' },
  { titulo: 'Óptica en Barajas', ruta: '/optica-barajas/', grupo: 'Páginas' },
  { titulo: 'Audífonos en Barajas', ruta: '/audifonos-barajas/', grupo: 'Páginas' },
  { titulo: 'Plan VEO', ruta: '/plan-veo/', grupo: 'Páginas' },
  { titulo: 'Contacto y cómo llegar', ruta: '/contacto/', grupo: 'Páginas' },
  { titulo: 'Sobre nosotros', ruta: '/sobre-nosotros/', grupo: 'Páginas' },
  { titulo: 'Blog', ruta: '/blog/', grupo: 'Páginas' },
  { titulo: 'Enlaces (Instagram)', ruta: '/enlaces/', grupo: 'Páginas' },
];

export const slugDe = (ruta: string) => ruta.split('/').pop()!.replace(/\.md$/, '');

export function rutaWebServicio(rutaArchivo: string): string {
  const { datos } = leerMd<{ area?: string }>(estado.texto(rutaArchivo) ?? '');
  return `/${datos.area === 'oido' ? 'audifonos-barajas' : 'optica-barajas'}/${slugDe(rutaArchivo)}/`;
}

export function paginasInternas(): Pagina[] {
  const servicios = estado.rutas(RUTAS.servicios).map((r) => ({
    titulo: String(leerMd<{ title?: string }>(estado.texto(r) ?? '').datos.title ?? slugDe(r)),
    ruta: rutaWebServicio(r),
    grupo: 'Servicios',
  }));
  const posts = estado.rutas(RUTAS.blog).map((r) => ({
    titulo: String(leerMd<{ title?: string }>(estado.texto(r) ?? '').datos.title ?? slugDe(r)),
    ruta: `/blog/${slugDe(r)}/`,
    grupo: 'Blog',
  }));
  return [...FIJAS, ...servicios, ...posts];
}

/** URL completa en la web publicada. */
export const enWeb = (ruta: string) => `${estado.config.sitio.replace(/\/$/, '')}${ruta}`;
