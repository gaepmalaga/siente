import { describe, expect, it } from 'vitest';
import {
  NIVELES,
  LAMINAS_COLOR,
  casillasAmsler,
  diametroPx,
  elaborarInforme,
  opcionesLamina,
  pxPorMm,
  resolverAgudeza,
  resolverColor,
  resumenTexto,
  semaforoAgudeza,
  textoDecimal,
  textoEjeLinea,
  unidadMm,
  type Resultados,
} from '../../src/lib/testVista';

const todos = (n: number) => NIVELES.map(() => n);

describe('tamaño de los optotipos', () => {
  it('a 1 m, 20/20 mide 1,454 mm por 5 unidades (5 minutos de arco)', () => {
    const n = NIVELES.find((x) => x.snellen === '20/20')!;
    expect(unidadMm(n, 1000) * 5).toBeCloseTo(1.454, 2);
  });

  it('20/200 es diez veces mayor que 20/20', () => {
    const grande = diametroPx(NIVELES[0], 1000, 4);
    const pequeno = diametroPx(NIVELES[NIVELES.length - 1], 1000, 4);
    expect(grande / pequeno).toBeCloseTo(10, 1);
  });

  it('el tamaño crece con la distancia y con los píxeles por milímetro', () => {
    const n = NIVELES[3];
    expect(diametroPx(n, 1000, 4)).toBeGreaterThan(diametroPx(n, 600, 4));
    expect(diametroPx(n, 600, 6)).toBeGreaterThan(diametroPx(n, 600, 4));
  });

  it('la calibración con la tarjeta (53,98 mm de ancho)', () => {
    expect(pxPorMm(215.92)).toBeCloseTo(4, 3);
  });

  it('la tabla va de mayor a menor y 1/decimal es el MAR', () => {
    for (let i = 1; i < NIVELES.length; i++) expect(NIVELES[i].decimal).toBeGreaterThan(NIVELES[i - 1].decimal);
    expect(NIVELES[0].mar).toBeCloseTo(10, 5);
  });
});

describe('agudeza', () => {
  it('ve todos los niveles: 1,0', () => {
    const r = resolverAgudeza(todos(3));
    expect(r.nivel?.snellen).toBe('20/20');
    expect(r.vioTodo).toBe(true);
    expect(semaforoAgudeza(r)).toBe('ok');
  });

  it('para en el primer nivel que no supera, aunque acierte después por azar', () => {
    const r = resolverAgudeza([3, 3, 3, 3, 1, 3, 3, 3]);
    expect(r.nivel?.snellen).toBe('20/50');
    expect(r.vioTodo).toBe(false);
  });

  it('dos aciertos de tres bastan para superar el nivel', () => {
    expect(resolverAgudeza([2, 2, 2, 2, 2, 2, 0]).nivel?.snellen).toBe('20/32');
  });

  it('no supera ni el nivel más grande', () => {
    const r = resolverAgudeza([0]);
    expect(r.nivel).toBeNull();
    expect(semaforoAgudeza(r)).toBe('pronto');
  });

  it('semáforo por tramos', () => {
    expect(semaforoAgudeza(resolverAgudeza([3, 3, 3, 3, 3, 3, 3, 0]))).toBe('ok'); // 0,8
    expect(semaforoAgudeza(resolverAgudeza([3, 3, 3, 3, 3, 3, 0]))).toBe('revisar'); // 0,63
    expect(semaforoAgudeza(resolverAgudeza([3, 3, 3, 3, 0]))).toBe('pronto'); // 0,4
  });
});

describe('textos', () => {
  it('decimal con coma y sin ceros de más', () => {
    expect(textoDecimal(1)).toBe('1,0');
    expect(textoDecimal(0.8)).toBe('0,8');
    expect(textoDecimal(0.63)).toBe('0,63');
  });

  it('eje: la línea y su opuesta del reloj', () => {
    expect(textoEjeLinea(3)).toBe('3 y 9');
    expect(textoEjeLinea(9)).toBe('3 y 9');
    expect(textoEjeLinea(12)).toBe('6 y 12');
  });
});

describe('color', () => {
  const buenas = LAMINAS_COLOR.map((l) => l.numero);

  it('todo bien', () => {
    const r = resolverColor(buenas);
    expect(r).toEqual({ aciertos: 4, total: 4, controlFallido: false });
  });

  it('fallar una lámina se tolera; dos, no', () => {
    const una = [...buenas];
    una[1] = 3;
    expect(resolverColor(una).aciertos).toBe(3);
    const dos = [...una];
    dos[2] = 70;
    expect(resolverColor(dos).aciertos).toBe(2);
  });

  it('si no ve la lámina de control se avisa', () => {
    expect(resolverColor([null, 8, 29, 5, 74]).controlFallido).toBe(true);
  });

  it('cada lámina ofrece 4 opciones distintas con la correcta dentro', () => {
    for (const l of LAMINAS_COLOR) {
      const o = opcionesLamina(l.numero);
      expect(o).toHaveLength(4);
      expect(new Set(o).size).toBe(4);
      expect(o).toContain(l.numero);
    }
  });
});

describe('Amsler', () => {
  it('la rejilla se adapta a la pantalla, entre 10 y 20 casillas', () => {
    expect(casillasAmsler(300)).toBe(20);
    expect(casillasAmsler(65)).toBe(13);
    expect(casillasAmsler(20)).toBe(10);
  });
});

describe('informe', () => {
  const normal: Resultados = {
    usaGafas: false,
    agudeza: { derecho: resolverAgudeza(todos(3)), izquierdo: resolverAgudeza(todos(3)) },
    astigmatismo: { derecho: { linea: null }, izquierdo: { linea: null } },
    color: { aciertos: 4, total: 4, controlFallido: false },
    amsler: { derecho: { marcas: 0, todoNormal: true }, izquierdo: { marcas: 0, todoNormal: true } },
  };

  it('todo normal: verde', () => {
    expect(elaborarInforme(normal).global).toBe('ok');
  });

  it('astigmatismo sospechado: ámbar', () => {
    const i = elaborarInforme({ ...normal, astigmatismo: { ...normal.astigmatismo, derecho: { linea: 3 } } });
    expect(i.global).toBe('revisar');
    expect(i.astigmatismo.derecho).toBe('revisar');
  });

  it('una alteración en Amsler: rojo, gane lo que gane el resto', () => {
    const i = elaborarInforme({ ...normal, amsler: { ...normal.amsler, izquierdo: { marcas: 2, todoNormal: false } } });
    expect(i.global).toBe('pronto');
  });

  it('ojos muy distintos (2+ niveles) piden revisión aunque ambos aprueben', () => {
    const i = elaborarInforme({
      ...normal,
      agudeza: { derecho: resolverAgudeza(todos(3)), izquierdo: resolverAgudeza([3, 3, 3, 3, 3, 3, 3, 0]) },
    });
    expect(i.agudeza.izquierdo).toBe('ok');
    expect(i.asimetria).toBe(false); // 1,0 frente a 0,8: un solo nivel
    const j = elaborarInforme({
      ...normal,
      agudeza: { derecho: resolverAgudeza(todos(3)), izquierdo: resolverAgudeza([3, 3, 3, 3, 3, 3, 0]) },
    });
    expect(j.asimetria).toBe(true);
    expect(j.global).toBe('revisar');
  });

  it('el resumen para WhatsApp recoge los resultados', () => {
    const t = resumenTexto(normal, elaborarInforme(normal));
    expect(t).toContain('Agudeza ojo derecho: 1,0 (20/20)');
    expect(t).toContain('Color: 4/4');
    expect(t).toContain('sin gafas');
  });
});
