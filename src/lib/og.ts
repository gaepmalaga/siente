// Imágenes para compartir en redes (Open Graph, 1200×630), generadas al
// compilar: cada página y cada artículo tiene la suya, con el rótulo de madera.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { negocio } from './negocio';

const fuentes = join(process.cwd(), 'node_modules', '@fontsource');
const cargar = (ruta: string) => readFile(join(fuentes, ruta));

let fuentesCache: Awaited<ReturnType<typeof cargarFuentes>> | null = null;
async function cargarFuentes() {
  const [normal, negrita, mono] = await Promise.all([
    cargar('atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff'),
    cargar('atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-800-normal.woff'),
    cargar('courier-prime/files/courier-prime-latin-700-normal.woff'),
  ]);
  return [
    { name: 'Atkinson', data: normal, weight: 400 as const, style: 'normal' as const },
    { name: 'Atkinson', data: negrita, weight: 800 as const, style: 'normal' as const },
    { name: 'Courier', data: mono, weight: 700 as const, style: 'normal' as const },
  ];
}

const GAFAS = (color: string, ondas = true) => `
  <g fill="none" stroke="${color}" stroke-linecap="round">
    <circle cx="514" cy="265" r="189" stroke-width="48"/>
    <circle cx="1086" cy="265" r="189" stroke-width="48"/>
    <path d="M690 196 Q800 100 910 196" stroke-width="46"/>
    <path d="M278 172 H336" stroke-width="56"/>
    <path d="M1322 172 H1264" stroke-width="56"/>
    ${
      ondas
        ? `<g stroke-width="22">
      <path d="M203 98 Q133 184 203 270"/><path d="M145 43 Q31 184 145 325"/><path d="M78 10 Q-58 184 78 357"/>
      <path d="M1397 98 Q1467 184 1397 270"/><path d="M1455 43 Q1569 184 1455 325"/><path d="M1522 10 Q1658 184 1522 357"/>
    </g>`
        : ''
    }
  </g>`;

const PANEL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="630" viewBox="0 0 460 630">
  <defs>
    <pattern id="l" width="23" height="630" patternUnits="userSpaceOnUse">
      <rect width="23" height="630" fill="#b98450"/>
      <rect width="2" height="630" fill="#4a2e17"/>
      <rect x="2" width="2" height="630" fill="#94602f"/>
      <rect x="13" width="4" height="630" fill="#c48f5a"/>
      <rect x="17" width="4" height="630" fill="#aa7542"/>
      <rect x="21" width="2" height="630" fill="#6a4220"/>
    </pattern>
    <radialGradient id="luz" cx="50%" cy="40%" r="62%">
      <stop offset="0" stop-color="#ffd496" stop-opacity="0.65"/>
      <stop offset="1" stop-color="#ffd496" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vineta" cx="50%" cy="42%" r="80%">
      <stop offset="0.5" stop-color="#1e1006" stop-opacity="0"/>
      <stop offset="1" stop-color="#1e1006" stop-opacity="0.55"/>
    </radialGradient>
    <filter id="brillo" x="-30%" y="-60%" width="160%" height="220%">
      <feGaussianBlur stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="460" height="630" fill="url(#l)"/>
  <rect width="460" height="630" fill="url(#luz)"/>
  <rect width="460" height="630" fill="url(#vineta)"/>
  <g filter="url(#brillo)" transform="translate(54 190) scale(0.22)">${GAFAS('#f6e2c0')}</g>
</svg>`;

const MARCA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="-12 -2 1624 486">${GAFAS('#171411')}</svg>`;

let panelCache: string | null = null;
let marcaCache: string | null = null;
const aDataUri = async (svg: string) =>
  `data:image/png;base64,${(await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64')}`;

type Nodo = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Nodo => ({
  type,
  props: { style, children, ...extra },
});

export async function generarOg({ antetitulo, titulo, subtitulo }: { antetitulo: string; titulo: string; subtitulo?: string }) {
  fuentesCache ??= await cargarFuentes();
  panelCache ??= await aDataUri(PANEL_SVG);
  marcaCache ??= await aDataUri(MARCA_SVG);

  const tamTitulo = titulo.length > 80 ? 46 : titulo.length > 50 ? 54 : 64;

  const arbol = h(
    'div',
    { display: 'flex', width: 1200, height: 630, background: '#f8f4ee', fontFamily: 'Atkinson', color: '#171411' },
    [
      h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 740, height: 630, padding: '56px 60px' }, [
        h('div', { display: 'flex', alignItems: 'center', gap: 18 }, [
          h('img', { width: 112, height: 34 }, undefined, { src: marcaCache, width: 112, height: 34 }),
          h('div', { display: 'flex', flexDirection: 'column' }, [
            h('div', { fontFamily: 'Courier', fontWeight: 700, fontSize: 34, lineHeight: 1, letterSpacing: 1.5 }, 'SIENTE'),
            h('div', { fontWeight: 800, fontSize: 13, letterSpacing: 2.5, marginTop: 6 }, 'CENTRO ÓPTICO & AUDITIVO'),
          ]),
        ]),
        h('div', { display: 'flex', flexDirection: 'column', gap: 18 }, [
          h('div', { fontFamily: 'Courier', fontWeight: 700, fontSize: 22, letterSpacing: 3, color: '#87572c', textTransform: 'uppercase' }, antetitulo),
          h('div', { fontWeight: 800, fontSize: tamTitulo, lineHeight: 1.06, letterSpacing: -1.5 }, titulo),
          ...(subtitulo ? [h('div', { fontSize: 26, lineHeight: 1.35, color: '#3a342e' }, subtitulo)] : []),
        ]),
        h('div', { display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, fontWeight: 800 }, [
          h('div', { display: 'flex', flexShrink: 0, padding: '8px 18px', borderRadius: 999, background: '#171411', color: '#ffd08c', whiteSpace: 'nowrap' }, negocio.telefono),
          h('div', { display: 'flex', whiteSpace: 'nowrap' }, `${negocio.direccion.calle} · ${negocio.direccion.barrio}`),
        ]),
      ]),
      h('div', { display: 'flex', position: 'relative', width: 460, height: 630 }, [
        h('img', { position: 'absolute', top: 0, left: 0, width: 460, height: 630 }, undefined, { src: panelCache, width: 460, height: 630 }),
        h(
          'div',
          {
            position: 'absolute',
            top: 330,
            left: 0,
            width: 460,
            display: 'flex',
            justifyContent: 'center',
            fontFamily: 'Courier',
            fontWeight: 700,
            fontSize: 84,
            letterSpacing: 4,
            color: '#f6e2c0',
            textShadow: '0 0 6px rgba(255,222,165,0.95), 0 0 26px rgba(255,190,110,0.8)',
          },
          'SIENTE',
        ),
      ]),
    ],
  );

  const svg = await satori(arbol as never, { width: 1200, height: 630, fonts: fuentesCache });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
