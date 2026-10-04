import { describe, expect, it } from 'vitest';
import { analizar, proponerTitulo, sugerirClaves, type Entrada } from '../../src/admin/lib/seo';

const base: Entrada = {
  tipo: 'articulo',
  titulo: 'Cómo prevenir la fatiga visual',
  tituloSeo: 'Cómo prevenir la fatiga visual | Blog Siente',
  descripcion: 'Consejos sencillos para evitar la fatiga visual delante de pantallas: la regla 20-20-20, luz, distancia y cuándo revisar la vista en Barajas.',
  cuerpo: [
    'La fatiga visual aparece tras horas delante de una pantalla.',
    '## Qué es la fatiga visual',
    'Es el cansancio de los músculos que enfocan. Te contamos cómo evitarla.',
    '## Consejos',
    'Sigue la regla 20-20-20. Revisa tu [graduación](/optica-barajas/revision-de-la-vista/) y lee nuestro [blog](/blog/).',
    'En Siente, en Barajas, te ayudamos.',
    '[Pide tu cita](/pedir-cita/).',
  ].join('\n\n'),
  slug: 'como-prevenir-la-fatiga-visual',
  palabraClave: 'fatiga visual',
  imagen: '/uploads/blog/fatiga.webp',
  textoImagen: 'Ojo cansado frente a una pantalla',
};

const de = (e: Entrada) => Object.fromEntries(analizar(e).comprobaciones.map((c) => [c.id, c]));

describe('análisis SEO', () => {
  it('un texto bien hecho no tiene avisos graves', () => {
    const c = de(base);
    expect(c.titulo.nivel).toBe('bien');
    expect(c.clave.nivel).toBe('bien');
    expect(c.cita.nivel).toBe('bien');
    expect(c.local.nivel).toBe('bien');
    expect(c.enlaces.nivel).toBe('bien');
  });

  it('cada aviso arreglable trae su arreglo', () => {
    const c = de({ ...base, tituloSeo: 'x'.repeat(75), cuerpo: 'Texto corto sin nada más.', palabraClave: '', textoImagen: '' });
    expect(c.titulo.arreglo).toMatchObject({ tipo: 'campo', campo: 'tituloSeo' });
    expect(c.clave.arreglo).toMatchObject({ tipo: 'campo', campo: 'clave' });
    expect(c.cita.arreglo).toMatchObject({ tipo: 'insertar', bloque: 'cita' });
    expect(c.local.arreglo).toBeUndefined(); // la descripción ya menciona Barajas
    expect(c.subtitulos.arreglo).toMatchObject({ tipo: 'insertar', bloque: 'subtitulo' });
    expect(c.longitud.arreglo).toMatchObject({ tipo: 'insertar', bloque: 'preguntas' });
    expect(c.imagen.arreglo).toMatchObject({ tipo: 'campo', campo: 'textoImagen' });
  });

  it('dice qué frases son demasiado largas', () => {
    const larga = Array.from({ length: 30 }, (_, i) => `palabra${i}`).join(' ') + '.';
    const c = de({ ...base, cuerpo: `${larga}\n\n${larga}\n\nCorta y clara aquí.` });
    expect(c.lectura.nivel).toBe('mejorable');
    expect(c.lectura.detalles?.length).toBe(2);
  });

  it('dice dónde falta la palabra clave', () => {
    const c = de({ ...base, palabraClave: 'gafas progresivas' });
    expect(c.clave.nivel).toBe('mal');
    expect(c.clave.detalles).toContain('Falta en la descripción');
  });

  it('la nota sube al arreglar avisos', () => {
    const peor = analizar({ ...base, palabraClave: '', cuerpo: base.cuerpo.replace('[Pide tu cita](/pedir-cita/).', '') }).puntuacion;
    expect(analizar(base).puntuacion).toBeGreaterThan(peor);
  });
});

describe('título para Google', () => {
  it('añade la marca si cabe y si no recorta por palabras', () => {
    expect(proponerTitulo('Fatiga visual')).toBe('Fatiga visual | Siente');
    const largo = 'Doce datos curiosos del oído que te dejarán sordo de asombro y alguno más';
    const p = proponerTitulo(largo);
    expect(p.length).toBeLessThanOrEqual(60);
    expect(largo.startsWith(p)).toBe(true);
    expect(p).not.toMatch(/\s(de|y|que)$/);
  });
});

describe('palabras clave sugeridas', () => {
  it('prioriza las búsquedas reales y luego las que encajan con el texto', () => {
    const s = sugerirClaves({ titulo: base.titulo, cuerpo: base.cuerpo, categoria: 'vista', consultas: ['cansancio ocular'] });
    expect(s[0]).toBe('cansancio ocular');
    expect(s).toContain('fatiga visual');
    expect(s).not.toContain('audífonos en Barajas');
  });
});
