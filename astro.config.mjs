// @ts-check
import { defineConfig } from 'astro/config';

// La URL pública y la subcarpeta se controlan desde fuera (variables del
// workflow de GitHub Pages) para poder pasar de la demo en
// gaepmalaga.github.io/siente/ al dominio definitivo sin tocar código.
const SITE_URL = process.env.SITE_URL || 'https://www.sienteyve.es';
const BASE_PATH = process.env.BASE_PATH || '/';

// URLs de la web antigua (Hooba, con prefijo /es/). Se redirigen a las nuevas
// para no perder el posicionamiento que ya tengan en Google.
const blogAntiguo = [
  'lentillas-para-control-de-miopia-en-ninos-funciona',
  'doce-datos-curiosos-del-oido-que-te-dejaran-sordo-de-asombro',
  'cuando-un-nino-ve-mal-no-lo-dice-lo-demuestra',
  'visagismo-como-elegir-las-gafas-segun-la-forma-de-tu-cara-en-barajas',
  'tipos-usos-y-tapones-para-los-oidos-mas-efectivos',
  'cual-es-la-diferencia-entre-oftalmologo-optometrista-y-oculista-sabes-a-quien-acudir-segun-tu-problema',
  'lentillas-solo-para-ver-mejor-el-avance-estetico-que-no-te-esperas',
  'como-saber-si-unas-gafas-de-sol-estan-homologadas',
  'como-prevenir-la-fatiga-visual',
  'cada-cuanto-hay-que-revisarse-la-vista',
];

// Astro no antepone la subcarpeta a los destinos de las redirecciones.
const conBase = (ruta) => `${BASE_PATH.replace(/\/$/, '')}${ruta}`;

/** @type {Record<string, string>} */
const redirectsSinBase = {
  '/es': '/',
  '/es/sobre-nosotros': '/sobre-nosotros/',
  '/es/servicios-opticos': '/optica-barajas/',
  '/es/servicios-audiologicos': '/audifonos-barajas/',
  '/es/blog': '/blog/',
  '/es/contacto': '/contacto/',
  '/es/aviso-legal': '/aviso-legal/',
  '/es/politica-de-privacidad': '/politica-de-privacidad/',
  '/es/politica-de-cookies': '/politica-de-cookies/',
  '/es/accesibilidad': '/accesibilidad/',
  '/es/mapa-web': '/mapa-web/',
  // El enlace corto para la bio de Instagram.
  '/links': '/enlaces/',
};
for (const slug of blogAntiguo) redirectsSinBase[`/es/blog/${slug}`] = `/blog/${slug}/`;
const redirects = Object.fromEntries(Object.entries(redirectsSinBase).map(([de, a]) => [de, conBase(a)]));

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
  // Astro 7 compacta el HTML con reglas JSX y se come espacios entre un
  // <strong> y el texto de la línea siguiente. Volvemos al modo clásico.
  compressHTML: true,
});
