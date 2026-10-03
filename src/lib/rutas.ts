// Inventario de todas las páginas públicas: lo usan el sitemap y llms.txt.
import { getCollection } from 'astro:content';
import { planVeoVigente } from './negocio';

export type Ruta = { ruta: string; titulo: string; prioridad: number; modificado?: Date };

export async function rutasPublicas(): Promise<Ruta[]> {
  const servicios = (await getCollection('servicios')).sort((a, b) => a.data.order - b.data.order);
  const posts = (await getCollection('blog', (p) => !p.data.draft)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return [
    { ruta: '/', titulo: 'Inicio', prioridad: 1 },
    { ruta: '/optica-barajas/', titulo: 'Óptica en Barajas', prioridad: 0.9 },
    ...servicios
      .filter((s) => s.data.area === 'vista')
      .map((s) => ({ ruta: `/optica-barajas/${s.id}/`, titulo: s.data.h1, prioridad: 0.8 })),
    { ruta: '/audifonos-barajas/', titulo: 'Audífonos y centro auditivo en Barajas', prioridad: 0.9 },
    ...servicios
      .filter((s) => s.data.area === 'oido')
      .map((s) => ({ ruta: `/audifonos-barajas/${s.id}/`, titulo: s.data.h1, prioridad: 0.8 })),
    ...(planVeoVigente() ? [{ ruta: '/plan-veo/', titulo: 'Plan VEO en Barajas', prioridad: 0.8 }] : []),
    { ruta: '/pedir-cita/', titulo: 'Pedir cita', prioridad: 0.7 },
    { ruta: '/contacto/', titulo: 'Contacto y cómo llegar', prioridad: 0.7 },
    { ruta: '/sobre-nosotros/', titulo: 'Sobre nosotros', prioridad: 0.6 },
    { ruta: '/blog/', titulo: 'Blog', prioridad: 0.6, modificado: posts[0]?.data.date },
    ...posts.map((p) => ({
      ruta: `/blog/${p.id}/`,
      titulo: p.data.title,
      prioridad: 0.6,
      modificado: p.data.updated ?? p.data.date,
    })),
    { ruta: '/mapa-web/', titulo: 'Mapa web', prioridad: 0.2 },
    { ruta: '/aviso-legal/', titulo: 'Aviso legal', prioridad: 0.1 },
    { ruta: '/politica-de-privacidad/', titulo: 'Política de privacidad', prioridad: 0.1 },
    { ruta: '/politica-de-cookies/', titulo: 'Política de cookies', prioridad: 0.1 },
    { ruta: '/accesibilidad/', titulo: 'Accesibilidad', prioridad: 0.1 },
  ];
}
