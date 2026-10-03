// Todas las rutas internas pasan por aquí para respetar la subcarpeta
// (BASE_PATH) cuando la web vive en gaepmalaga.github.io/siente/.

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const EXTERNA = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/** Ruta interna con la subcarpeta delante: url('/contacto/') → '/siente/contacto/'. */
export function url(ruta = '/'): string {
  if (EXTERNA.test(ruta)) return ruta;
  const limpia = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${BASE}${limpia}`;
}

/** URL absoluta (canónicas, Open Graph, sitemap, datos estructurados). */
export function urlAbsoluta(ruta = '/'): string {
  if (/^https?:/i.test(ruta)) return ruta;
  return new URL(url(ruta), import.meta.env.SITE).href;
}

/**
 * El HTML que sale del Markdown trae rutas como /uploads/foto.webp o
 * /pedir-cita/. Se les añade la subcarpeta para que funcionen igual en la demo
 * y en el dominio definitivo.
 */
export function rutasEnHtml(html: string): string {
  if (!BASE) return html;
  return html.replace(/\b(src|href)="\/(?!\/)/g, `$1="${BASE}/`);
}
