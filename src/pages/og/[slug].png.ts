import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { generarOg } from '../../lib/og';

type Datos = { antetitulo: string; titulo: string; subtitulo?: string };

export const getStaticPaths: GetStaticPaths = async () => {
  const servicios = await getCollection('servicios');
  const posts = await getCollection('blog', (p) => !p.data.draft);
  const fijas: { slug: string; datos: Datos }[] = [
    { slug: 'inicio', datos: { antetitulo: 'Barajas · Madrid', titulo: 'Óptica y centro auditivo en Barajas', subtitulo: 'Revisión de la vista gratis · Audífonos · Plan VEO' } },
    { slug: 'optica', datos: { antetitulo: 'Óptica', titulo: 'Tu óptica en Barajas', subtitulo: 'Revisión gratis, gafas, progresivas y lentillas' } },
    { slug: 'audifonos', datos: { antetitulo: 'Centro auditivo', titulo: 'Vuelve a oír los detalles', subtitulo: 'Audiometría en cabina y audífonos a medida' } },
    { slug: 'plan-veo', datos: { antetitulo: 'Plan VEO', titulo: 'Gafas para menores de 16 con hasta 100 € de ayuda', subtitulo: 'Lo tramitamos nosotros, al momento' } },
  ];
  return [
    ...fijas.map((f) => ({ params: { slug: f.slug }, props: f.datos })),
    ...servicios.map((s) => ({
      params: { slug: `servicio-${s.id}` },
      props: { antetitulo: s.data.area === 'vista' ? 'Óptica · Barajas' : 'Centro auditivo · Barajas', titulo: s.data.h1, subtitulo: s.data.summary },
    })),
    ...posts.map((p) => ({
      params: { slug: `blog-${p.id}` },
      props: { antetitulo: 'Blog · Siente', titulo: p.data.title },
    })),
  ];
};

export const GET: APIRoute = async ({ props }) => {
  const png = await generarOg(props as Datos);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
