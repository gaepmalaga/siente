import type { APIRoute } from 'astro';
import { url, urlAbsoluta } from '../lib/url';

export const GET: APIRoute = () => {
  const demo = import.meta.env.PUBLIC_NOINDEX === 'true';
  const cuerpo = demo
    ? `# Demo: no indexar hasta publicar en el dominio definitivo.
User-agent: *
Disallow: /
`
    : `User-agent: *
Allow: /
Disallow: ${url('/admin/')}

Sitemap: ${urlAbsoluta('/sitemap.xml')}
`;
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
