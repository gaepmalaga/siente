// Todo el contenido real del repositorio cumple las reglas de la web y el
// panel puede leerlo y volver a escribirlo sin cambiar nada por el camino.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Articulo, Enlaces, Negocio, Portada, Resenas, Servicio } from '../../src/lib/esquemas';
import { escribirMd, leerMd } from '../../src/admin/lib/frontmatter';

const json = (ruta: string) => JSON.parse(readFileSync(ruta, 'utf8'));
const mds = (carpeta: string) =>
  readdirSync(carpeta)
    .filter((a) => a.endsWith('.md'))
    .map((a) => ({ archivo: a, texto: readFileSync(`${carpeta}/${a}`, 'utf8') }));

describe('datos del centro', () => {
  it.each([
    ['negocio', Negocio],
    ['portada', Portada],
    ['enlaces', Enlaces],
    ['resenas', Resenas],
  ] as const)('src/data/%s.json es válido', (nombre, esquema) => {
    const r = esquema.safeParse(json(`src/data/${nombre}.json`));
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues, null, 2)).toBe(true);
  });

  it('el esquema rechaza datos que romperían la web', () => {
    const n = json('src/data/negocio.json');
    expect(Negocio.safeParse({ ...n, whatsapp: '641 44 68 82' }).success).toBe(false);
    expect(Negocio.safeParse({ ...n, horario: [{ dia: 'lunes', abre: '9', cierra: '14:00' }] }).success).toBe(false);
    expect(Negocio.safeParse({ ...n, analitica: { ...n.analitica, ga4: 'UA-123' } }).success).toBe(false);
  });
});

describe.each([
  ['blog', Articulo],
  ['servicios', Servicio],
] as const)('contenido de %s', (carpeta, esquema) => {
  const archivos = mds(`src/content/${carpeta}`);

  it('hay archivos', () => expect(archivos.length).toBeGreaterThan(0));

  it.each(archivos.map((a) => [a.archivo, a.texto]))('%s cumple el esquema', (_, texto) => {
    const r = esquema.safeParse(leerMd(texto).datos);
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues, null, 2)).toBe(true);
  });

  it.each(archivos.map((a) => [a.archivo, a.texto]))('%s se reescribe sin perder datos', (_, texto) => {
    const una = leerMd(texto);
    const reescrito = escribirMd(una.datos, una.cuerpo);
    const dos = leerMd(reescrito);
    expect(dos.datos).toEqual(Object.fromEntries(Object.entries(una.datos).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length))));
    expect(dos.cuerpo.trim()).toBe(una.cuerpo.trim());
    // Y una segunda pasada ya no cambia nada: abrir y cerrar no crea cambios fantasma.
    expect(escribirMd(dos.datos, dos.cuerpo)).toBe(reescrito);
  });
});

describe('cabecera de los artículos', () => {
  it('guarda la fecha con hora tal cual', () => {
    const texto = escribirMd({ title: 'Hola', description: 'x', date: '2026-10-10T09:30:00+02:00' }, 'Cuerpo');
    expect(leerMd(texto).datos.date).toBe('2026-10-10T09:30:00+02:00');
    expect(Articulo.parse(leerMd(texto).datos).date.toISOString()).toBe('2026-10-10T07:30:00.000Z');
  });

  it('protege los textos con dos puntos o signos al principio', () => {
    const datos = { title: '¿Cuál es la diferencia? Óptica: guía', description: '«Comillas» y: dos puntos' };
    expect(leerMd(escribirMd(datos, 'x')).datos).toEqual(datos);
  });
});
