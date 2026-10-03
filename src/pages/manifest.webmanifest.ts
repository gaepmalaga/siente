import type { APIRoute } from 'astro';
import { negocio } from '../lib/negocio';
import { url } from '../lib/url';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: negocio.nombre,
      short_name: negocio.nombreCorto,
      description: 'Óptica y centro auditivo en Barajas (Madrid)',
      lang: 'es-ES',
      start_url: url('/'),
      scope: url('/'),
      display: 'standalone',
      background_color: '#f8f4ee',
      theme_color: '#171411',
      icons: [
        { src: url('/icon-192.png'), sizes: '192x192', type: 'image/png' },
        { src: url('/icon-512.png'), sizes: '512x512', type: 'image/png' },
        { src: url('/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } },
  );
