// Lógica del test de vista online: tamaños de optotipos, puntuación y semáforo.
// Es código puro (sin DOM) para poder probarlo con vitest. La interfaz está en
// src/components/TestVista.astro.
//
// IMPORTANTE: los umbrales del semáforo son una propuesta basada en criterios
// habituales de cribado (agudeza decimal, Ishihara, Amsler). Debe validarlos el
// optometrista del centro antes de darlos por buenos. El test es orientativo y
// nunca sustituye a una revisión.

export type Ojo = 'derecho' | 'izquierdo';
export type Semaforo = 'ok' | 'revisar' | 'pronto';
export type Dispositivo = 'movil' | 'ordenador';

/** Una tarjeta bancaria (ISO 7810 ID-1) mide 85,60 × 53,98 mm. */
export const TARJETA_MM = { ancho: 53.98, alto: 85.6 } as const;

/** Distancia de la prueba, en mm, según el dispositivo. */
export const DISTANCIA_MM: Record<Dispositivo, number> = { movil: 600, ordenador: 1000 };

/** Distancia de la cuadrícula de Amsler, en mm (la estándar es 30 cm). */
export const DISTANCIA_AMSLER_MM = 300;

// Un optotipo de Landolt mide 5 u de diámetro, con trazo y abertura de 1 u.
// 1 u subtiende 1 minuto de arco cuando la agudeza es 1,0 (20/20).
export interface NivelAgudeza {
  /** Agudeza decimal (1,0 = 20/20). */
  decimal: number;
  /** Notación Snellen en pies. */
  snellen: string;
  /** Ángulo mínimo de resolución, en minutos de arco (1 / decimal). */
  mar: number;
}

const nivel = (decimal: number, snellen: string): NivelAgudeza => ({ decimal, snellen, mar: 1 / decimal });

/** De más grande a más pequeño. */
export const NIVELES: NivelAgudeza[] = [
  nivel(0.1, '20/200'),
  nivel(0.2, '20/100'),
  nivel(0.32, '20/63'),
  nivel(0.4, '20/50'),
  nivel(0.5, '20/40'),
  nivel(0.63, '20/32'),
  nivel(0.8, '20/25'),
  nivel(1.0, '20/20'),
];

/** Intentos por nivel y aciertos necesarios para darlo por superado. */
export const INTENTOS_POR_NIVEL = 3;
export const ACIERTOS_PARA_SUPERAR = 2;

const MINUTO_RAD = Math.PI / (180 * 60);

/** Milímetros que mide 1 u (un minuto de arco × MAR) a esa distancia. */
export function unidadMm(nivel: NivelAgudeza, distanciaMm: number): number {
  return Math.tan(nivel.mar * MINUTO_RAD) * distanciaMm;
}

/** Diámetro del optotipo (5 u) en píxeles CSS. */
export function diametroPx(nivel: NivelAgudeza, distanciaMm: number, pxPorMm: number): number {
  return 5 * unidadMm(nivel, distanciaMm) * pxPorMm;
}

/** Píxeles por milímetro a partir del ancho en píxeles que ocupa la tarjeta. */
export function pxPorMm(anchoTarjetaPx: number): number {
  return anchoTarjetaPx / TARJETA_MM.ancho;
}

// ── Agudeza ────────────────────────────────────────────────────────────────

export interface ResultadoAgudeza {
  /** Último nivel superado, o null si no superó ni el más grande. */
  nivel: NivelAgudeza | null;
  /** Hay un nivel más pequeño que no llegó a ver, o vio todo. */
  vioTodo: boolean;
}

/**
 * aciertosPorNivel[i] = aciertos en el nivel i (de los INTENTOS_POR_NIVEL).
 * Se avanza nivel a nivel y se para en el primero que no se supera.
 */
export function resolverAgudeza(aciertosPorNivel: number[]): ResultadoAgudeza {
  let ultimo: NivelAgudeza | null = null;
  let vioTodo = true;
  for (let i = 0; i < NIVELES.length; i++) {
    const aciertos = aciertosPorNivel[i];
    if (aciertos === undefined) break;
    if (aciertos >= ACIERTOS_PARA_SUPERAR) {
      ultimo = NIVELES[i];
    } else {
      vioTodo = false;
      break;
    }
  }
  if (aciertosPorNivel.length < NIVELES.length && ultimo !== NIVELES[NIVELES.length - 1]) vioTodo = false;
  return { nivel: ultimo, vioTodo };
}

export function semaforoAgudeza(r: ResultadoAgudeza): Semaforo {
  const d = r.nivel?.decimal ?? 0;
  if (d >= 0.8) return 'ok';
  if (d >= 0.5) return 'revisar';
  return 'pronto';
}

/** Diferencia entre ojos en niveles de la tabla (≥ 2 niveles ya merece revisión). */
export function diferenciaEntreOjos(a: ResultadoAgudeza, b: ResultadoAgudeza): number {
  const idx = (r: ResultadoAgudeza) => (r.nivel ? NIVELES.indexOf(r.nivel) : -1);
  return Math.abs(idx(a) - idx(b));
}

export const textoDecimal = (d: number): string => d.toFixed(2).replace('.', ',').replace(/0$/, '');

// ── Astigmatismo (esfera de líneas) ────────────────────────────────────────

/** 6 diámetros cada 30° (12 extremos, numerados como las horas de un reloj). */
export const LINEAS_ASTIGMATISMO = 6;

export interface ResultadoAstigmatismo {
  /** null = todas las líneas igual; si no, el diámetro (1-6) que se ve más nítido u oscuro. */
  linea: number | null;
}

export const semaforoAstigmatismo = (r: ResultadoAstigmatismo): Semaforo => (r.linea === null ? 'ok' : 'revisar');

/** El diámetro n (1-6) pasa por las horas n y n+6: forma n·30° con la vertical (6 = la vertical). */
export function anguloLinea(n: number): number {
  return (n % LINEAS_ASTIGMATISMO) * 30;
}

/** Texto del eje aproximado: las dos horas del reloj por donde pasa el diámetro n (n y n+6). */
export function textoEjeLinea(n: number): string {
  const a = ((n - 1) % 6) + 1;
  return `${a} y ${a + 6}`;
}

// ── Color (láminas tipo Ishihara) ──────────────────────────────────────────

export interface LaminaColor {
  /** Número que se dibuja en la lámina. */
  numero: number;
  /** control = la ve cualquiera; prueba = la confunde un daltonismo rojo-verde. */
  tipo: 'control' | 'prueba';
}

export const LAMINAS_COLOR: LaminaColor[] = [
  { numero: 12, tipo: 'control' },
  { numero: 8, tipo: 'prueba' },
  { numero: 29, tipo: 'prueba' },
  { numero: 5, tipo: 'prueba' },
  { numero: 74, tipo: 'prueba' },
];

/** Opciones de respuesta (la correcta más tres señuelos, siempre en orden estable). */
export function opcionesLamina(numero: number): number[] {
  const señuelos: Record<number, number[]> = {
    12: [17, 42, 72],
    8: [3, 6, 9],
    29: [70, 26, 20],
    5: [2, 6, 3],
    74: [21, 71, 34],
  };
  return [numero, ...(señuelos[numero] ?? [1, 2, 3])].sort((a, b) => a - b);
}

export interface ResultadoColor {
  aciertos: number;
  total: number;
  /** El usuario no ve la lámina de control: la pantalla o el filtro no sirven. */
  controlFallido: boolean;
}

export function resolverColor(respuestas: (number | null)[]): ResultadoColor {
  const control = LAMINAS_COLOR.findIndex((l) => l.tipo === 'control');
  const pruebas = LAMINAS_COLOR.map((l, i) => ({ l, i })).filter(({ l }) => l.tipo === 'prueba');
  const aciertos = pruebas.filter(({ l, i }) => respuestas[i] === l.numero).length;
  return { aciertos, total: pruebas.length, controlFallido: respuestas[control] !== LAMINAS_COLOR[control].numero };
}

export function semaforoColor(r: ResultadoColor): Semaforo {
  return r.aciertos >= r.total - 1 ? 'ok' : 'revisar';
}

// ── Amsler ─────────────────────────────────────────────────────────────────

export interface ResultadoAmsler {
  /** Casillas marcadas como torcidas, borrosas o ausentes. */
  marcas: number;
  /** Marcó expresamente que todo se veía recto. */
  todoNormal: boolean;
}

export const semaforoAmsler = (r: ResultadoAmsler): Semaforo => (r.marcas > 0 || !r.todoNormal ? 'pronto' : 'ok');

/** Casillas de 5 mm que caben en la pantalla (máximo 20, que es la rejilla estándar). */
export function casillasAmsler(menorLadoMm: number): number {
  return Math.max(10, Math.min(20, Math.floor(menorLadoMm / 5)));
}

// ── Informe global ─────────────────────────────────────────────────────────

const ORDEN: Semaforo[] = ['ok', 'revisar', 'pronto'];
export const peor = (...s: Semaforo[]): Semaforo => s.reduce((a, b) => (ORDEN.indexOf(b) > ORDEN.indexOf(a) ? b : a), 'ok' as Semaforo);

export interface Resultados {
  usaGafas: boolean;
  agudeza: Record<Ojo, ResultadoAgudeza>;
  astigmatismo: Record<Ojo, ResultadoAstigmatismo>;
  color: ResultadoColor;
  amsler: Record<Ojo, ResultadoAmsler>;
}

export interface Informe {
  global: Semaforo;
  agudeza: Record<Ojo, Semaforo>;
  astigmatismo: Record<Ojo, Semaforo>;
  color: Semaforo;
  amsler: Record<Ojo, Semaforo>;
  /** Diferencia de agudeza entre ojos de al menos dos niveles. */
  asimetria: boolean;
}

export function elaborarInforme(r: Resultados): Informe {
  const agudeza = { derecho: semaforoAgudeza(r.agudeza.derecho), izquierdo: semaforoAgudeza(r.agudeza.izquierdo) };
  const asimetria = diferenciaEntreOjos(r.agudeza.derecho, r.agudeza.izquierdo) >= 2;
  const astigmatismo = {
    derecho: semaforoAstigmatismo(r.astigmatismo.derecho),
    izquierdo: semaforoAstigmatismo(r.astigmatismo.izquierdo),
  };
  const color = semaforoColor(r.color);
  const amsler = { derecho: semaforoAmsler(r.amsler.derecho), izquierdo: semaforoAmsler(r.amsler.izquierdo) };
  const global = peor(
    agudeza.derecho,
    agudeza.izquierdo,
    astigmatismo.derecho,
    astigmatismo.izquierdo,
    color,
    amsler.derecho,
    amsler.izquierdo,
    asimetria ? 'revisar' : 'ok',
  );
  return { global, agudeza, astigmatismo, color, amsler, asimetria };
}

const NOMBRE_OJO: Record<Ojo, string> = { derecho: 'ojo derecho', izquierdo: 'ojo izquierdo' };

/** Resumen en texto plano, pensado para pegarlo en WhatsApp o enseñarlo en la cita. */
export function resumenTexto(r: Resultados, i: Informe): string {
  const ojos: Ojo[] = ['derecho', 'izquierdo'];
  const etiqueta: Record<Semaforo, string> = { ok: 'bien', revisar: 'conviene revisar', pronto: 'revisar pronto' };
  const lineas = ['Resultados de mi test de vista online (orientativo):'];
  for (const o of ojos) {
    const n = r.agudeza[o].nivel;
    lineas.push(
      `• Agudeza ${NOMBRE_OJO[o]}: ${n ? `${textoDecimal(n.decimal)} (${n.snellen})` : 'por debajo de 0,1'} · ${etiqueta[i.agudeza[o]]}`,
    );
  }
  for (const o of ojos) {
    const l = r.astigmatismo[o].linea;
    lineas.push(`• Líneas ${NOMBRE_OJO[o]}: ${l === null ? 'todas iguales' : `más nítidas las del ${textoEjeLinea(l)}`}`);
  }
  lineas.push(`• Color: ${r.color.aciertos}/${r.color.total} láminas · ${etiqueta[i.color]}`);
  for (const o of ojos) {
    lineas.push(`• Cuadrícula ${NOMBRE_OJO[o]}: ${i.amsler[o] === 'ok' ? 'sin alteraciones' : 'veo zonas alteradas'}`);
  }
  lineas.push(r.usaGafas ? 'Hecho con mis gafas o lentillas puestas.' : 'Hecho sin gafas.');
  lineas.push('Me gustaría pedir una revisión de la vista.');
  return lineas.join('\n');
}
