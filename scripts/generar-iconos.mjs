// Genera los iconos PNG (favicon, iPhone, Android) a partir de las gafas del
// logotipo. Uso: node scripts/generar-iconos.mjs
import sharp from 'sharp';

const gafas = (color, grosor = 1) => `
  <g fill="none" stroke="${color}" stroke-linecap="round">
    <circle cx="514" cy="265" r="182" stroke-width="${60 * grosor}"/>
    <circle cx="1086" cy="265" r="182" stroke-width="${60 * grosor}"/>
    <path d="M690 196 Q800 100 910 196" stroke-width="${54 * grosor}"/>
  </g>`;

// Cuadrado con fondo y las gafas centradas ocupando `escala` del ancho.
function icono({ lado, fondo, color, escala, radio = 0, grosor = 1 }) {
  const ancho = 1220; // ancho útil de las gafas en su sistema de coordenadas (190..1410)
  const s = (lado * escala) / ancho;
  const tx = lado / 2 - 800 * s;
  const ty = lado / 2 - 265 * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
    ${fondo ? `<rect width="${lado}" height="${lado}" rx="${radio}" fill="${fondo}"/>` : ''}
    <g transform="translate(${tx} ${ty}) scale(${s})">${gafas(color, grosor)}</g>
  </svg>`;
}

const salida = [
  ['public/favicon-32.png', icono({ lado: 32, color: '#171411', escala: 0.98, grosor: 1.35 })],
  ['public/apple-touch-icon.png', icono({ lado: 180, fondo: '#171411', color: '#ffd08c', escala: 0.7 })],
  ['public/icon-192.png', icono({ lado: 192, fondo: '#171411', color: '#ffd08c', escala: 0.7, radio: 40 })],
  ['public/icon-512.png', icono({ lado: 512, fondo: '#171411', color: '#ffd08c', escala: 0.7, radio: 100 })],
  ['public/icon-maskable-512.png', icono({ lado: 512, fondo: '#171411', color: '#ffd08c', escala: 0.56 })],
];

for (const [archivo, svg] of salida) {
  await sharp(Buffer.from(svg)).png().toFile(archivo);
  console.log('✓', archivo);
}
