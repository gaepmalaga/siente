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

export type Perfil = 'adulto' | 'nino';
export type EdadNino = 'menor6' | 'mayor6';

export interface Umbrales {
  /** Agudeza decimal a partir de la cual se considera normal. */
  ok: number;
  /** Por debajo de ésta conviene revisar pronto. */
  revisar: number;
}

/**
 * Los niños pequeños no alcanzan todavía 1,0: a los 3-5 años se espera ≥ 0,5-0,63
 * y desde los 6 ≥ 0,8. Propuesta de cribado, a validar por el optometrista.
 */
export function umbralesAgudeza(perfil: Perfil = 'adulto', edad: EdadNino = 'mayor6'): Umbrales {
  if (perfil === 'adulto') return { ok: 0.8, revisar: 0.5 };
  return edad === 'menor6' ? { ok: 0.5, revisar: 0.32 } : { ok: 0.8, revisar: 0.5 };
}

export function semaforoAgudeza(r: ResultadoAgudeza, u: Umbrales = umbralesAgudeza()): Semaforo {
  const d = r.nivel?.decimal ?? 0;
  if (d >= u.ok) return 'ok';
  if (d >= u.revisar) return 'revisar';
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

// ── Duocromo (rojo / verde) ────────────────────────────────────────────────

/**
 * Qué mitad se ve más nítida. Por la aberración cromática del ojo, el rojo se
 * enfoca detrás del verde: con miopía (o una sobrecorrección de hipermetropía)
 * destaca el rojo; con hipermetropía (o sobrecorrección de miopía), el verde.
 */
export interface ResultadoDuocromo {
  /** «omitida»: no distinguía los aros, la prueba no vale. */
  lado: 'rojo' | 'igual' | 'verde' | 'omitida';
}

export const semaforoDuocromo = (r: ResultadoDuocromo): Semaforo => (r.lado === 'igual' || r.lado === 'omitida' ? 'ok' : 'revisar');

export function textoDuocromo(r: ResultadoDuocromo, usaGafas: boolean): string {
  if (r.lado === 'omitida') return 'No has distinguido los aros: prueba no valorable.';
  if (r.lado === 'igual') return 'Has visto las dos mitades igual de nítidas: buena señal.';
  const pista =
    r.lado === 'rojo'
      ? 'Las letras sobre rojo se veían más nítidas: puede indicar miopía'
      : 'Las letras sobre verde se veían más nítidas: puede indicar hipermetropía';
  return `${pista}${usaGafas ? ' (o que tus gafas no están bien ajustadas)' : ''}. Es una pista, no una medida.`;
}

// ── Visión de cerca (presbicia) ────────────────────────────────────────────

export const DISTANCIA_CERCA_MM = 400;

/** Líneas de lectura, de mayor a menor. Mismo criterio angular que la agudeza, a 40 cm. */
export const NIVELES_CERCA: { decimal: number; etiqueta: string }[] = [
  { decimal: 0.2, etiqueta: 'Muy grande' },
  { decimal: 0.32, etiqueta: 'Grande' },
  { decimal: 0.4, etiqueta: 'Titulares' },
  { decimal: 0.5, etiqueta: 'Libro de lectura' },
  { decimal: 0.63, etiqueta: 'Periódico' },
  { decimal: 0.8, etiqueta: 'Prospecto' },
  { decimal: 1.0, etiqueta: 'Letra pequeña' },
];

/** Altura de las mayúsculas en mm: 5 minutos de arco ÷ agudeza, a la distancia dada. */
export function alturaMayusculasMm(decimal: number, distanciaMm: number): number {
  return Math.tan((5 / decimal) * MINUTO_RAD) * distanciaMm;
}

export interface ResultadoCerca {
  /** Agudeza decimal de la línea más pequeña que lee con comodidad (null = ninguna). */
  decimal: number | null;
  /** Tiene que alejar el móvil o el papel para leer. */
  alejaTexto: boolean;
}

export function semaforoCerca(r: ResultadoCerca): Semaforo {
  if (r.decimal === null) return 'pronto';
  return r.decimal >= 0.63 && !r.alejaTexto ? 'ok' : 'revisar';
}

// ── Distancia con la cámara (opcional) ─────────────────────────────────────

/**
 * Estimación por el ancho de la cara detectada. Sin conocer el objetivo de la
 * cámara se supone un campo de visión horizontal de unos 65°. Error esperable:
 * ±15 %. Sirve para avisar de «acércate» o «aléjate», no para medir.
 */
export function distanciaCamaraMm(anchoCaraPx: number, anchoImagenPx: number, anchoCaraMm = 140, fovGrados = 65): number {
  if (anchoCaraPx <= 0) return Infinity;
  const focalPx = anchoImagenPx / 2 / Math.tan((fovGrados * Math.PI) / 360);
  return (focalPx * anchoCaraMm) / anchoCaraPx;
}

export function consejoDistancia(medidaMm: number, objetivoMm: number, tolerancia = 0.15): 'bien' | 'acerca' | 'aleja' {
  if (medidaMm > objetivoMm * (1 + tolerancia)) return 'acerca';
  if (medidaMm < objetivoMm * (1 - tolerancia)) return 'aleja';
  return 'bien';
}

// ── Brillo de la pantalla ──────────────────────────────────────────────────

/** Gris de cada cuadrado de la prueba de brillo (0-255). Con poco brillo los primeros se funden con el negro. */
export const ESCALA_GRISES = [0, 4, 8, 12, 16, 22];

// ── Recordatorio de revisión ───────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const fechaIcs = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

/** Fecha dentro de `meses` meses, sin desbordar el día (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(d: Date, meses: number): Date {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1));
  const ultimo = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(d.getUTCDate(), ultimo));
  return r;
}

/** Evento de día completo (.ics) para repetir el test o pedir la revisión. */
export function icsRecordatorio(hoy: Date, meses: number, enlace: string, lugar: string): string {
  const dia = sumarMeses(hoy, meses);
  const fin = new Date(dia.getTime() + 86_400_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Siente//Test de vista//ES',
    'BEGIN:VEVENT',
    `UID:test-vista-${fechaIcs(hoy)}@siente`,
    `DTSTAMP:${fechaIcs(hoy)}T090000Z`,
    `DTSTART;VALUE=DATE:${fechaIcs(dia)}`,
    `DTEND;VALUE=DATE:${fechaIcs(fin)}`,
    'SUMMARY:Repetir el test de vista o pedir revisión en Siente',
    `LOCATION:${lugar}`,
    `DESCRIPTION:Han pasado ${meses} meses desde tu último test de vista. Repítelo o pide tu revisión gratuita: ${enlace}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// ── Informe global ─────────────────────────────────────────────────────────

const ORDEN: Semaforo[] = ['ok', 'revisar', 'pronto'];
export const peor = (...s: Semaforo[]): Semaforo => s.reduce((a, b) => (ORDEN.indexOf(b) > ORDEN.indexOf(a) ? b : a), 'ok' as Semaforo);

export interface Resultados {
  usaGafas: boolean;
  /** Quién hace el test. Por defecto, un adulto. */
  perfil?: Perfil;
  edadNino?: EdadNino;
  agudeza: Record<Ojo, ResultadoAgudeza>;
  /** En niños no se hacen las pruebas de abajo. */
  astigmatismo?: Record<Ojo, ResultadoAstigmatismo>;
  duocromo?: Record<Ojo, ResultadoDuocromo>;
  cerca?: ResultadoCerca;
  color: ResultadoColor;
  amsler?: Record<Ojo, ResultadoAmsler>;
}

export interface Informe {
  global: Semaforo;
  agudeza: Record<Ojo, Semaforo>;
  astigmatismo?: Record<Ojo, Semaforo>;
  duocromo?: Record<Ojo, Semaforo>;
  cerca?: Semaforo;
  color: Semaforo;
  amsler?: Record<Ojo, Semaforo>;
  /** Diferencia de agudeza entre ojos de al menos dos niveles. */
  asimetria: boolean;
}

const porOjo = <T, R>(v: Record<Ojo, T> | undefined, f: (x: T) => R): Record<Ojo, R> | undefined =>
  v ? { derecho: f(v.derecho), izquierdo: f(v.izquierdo) } : undefined;

export function elaborarInforme(r: Resultados): Informe {
  const u = umbralesAgudeza(r.perfil ?? 'adulto', r.edadNino ?? 'mayor6');
  const agudeza = { derecho: semaforoAgudeza(r.agudeza.derecho, u), izquierdo: semaforoAgudeza(r.agudeza.izquierdo, u) };
  const asimetria = diferenciaEntreOjos(r.agudeza.derecho, r.agudeza.izquierdo) >= 2;
  const astigmatismo = porOjo(r.astigmatismo, semaforoAstigmatismo);
  const duocromo = porOjo(r.duocromo, semaforoDuocromo);
  const cerca = r.cerca ? semaforoCerca(r.cerca) : undefined;
  const color = semaforoColor(r.color);
  const amsler = porOjo(r.amsler, semaforoAmsler);
  const global = peor(
    agudeza.derecho,
    agudeza.izquierdo,
    asimetria ? 'revisar' : 'ok',
    color,
    ...(astigmatismo ? [astigmatismo.derecho, astigmatismo.izquierdo] : []),
    ...(duocromo ? [duocromo.derecho, duocromo.izquierdo] : []),
    ...(cerca ? [cerca] : []),
    ...(amsler ? [amsler.derecho, amsler.izquierdo] : []),
  );
  return { global, agudeza, astigmatismo, duocromo, cerca, color, amsler, asimetria };
}

const NOMBRE_OJO: Record<Ojo, string> = { derecho: 'ojo derecho', izquierdo: 'ojo izquierdo' };
const ETIQUETA: Record<Semaforo, string> = { ok: 'bien', revisar: 'conviene revisar', pronto: 'revisar pronto' };

/** Resumen en texto plano, pensado para pegarlo en WhatsApp o enseñarlo en la cita. */
export function resumenTexto(r: Resultados, i: Informe): string {
  const ojos: Ojo[] = ['derecho', 'izquierdo'];
  const nino = r.perfil === 'nino';
  const lineas = [nino ? 'Resultados del test de vista online de mi hijo/a (orientativo):' : 'Resultados de mi test de vista online (orientativo):'];
  for (const o of ojos) {
    const n = r.agudeza[o].nivel;
    lineas.push(`• Agudeza ${NOMBRE_OJO[o]}: ${n ? `${textoDecimal(n.decimal)} (${n.snellen})` : 'por debajo de 0,1'} · ${ETIQUETA[i.agudeza[o]]}`);
  }
  if (r.astigmatismo)
    for (const o of ojos) {
      const l = r.astigmatismo[o].linea;
      lineas.push(`• Líneas ${NOMBRE_OJO[o]}: ${l === null ? 'todas iguales' : `más nítidas las del ${textoEjeLinea(l)}`}`);
    }
  if (r.duocromo)
    for (const o of ojos) lineas.push(`• Rojo/verde ${NOMBRE_OJO[o]}: ${r.duocromo[o].lado === 'igual' ? 'igual' : r.duocromo[o].lado === 'omitida' ? 'no valorable' : `más nítido el ${r.duocromo[o].lado}`}`);
  if (r.cerca) lineas.push(`• Cerca: ${r.cerca.decimal === null ? 'no leo ninguna línea' : `leo hasta ${textoDecimal(r.cerca.decimal)}`}${r.cerca.alejaTexto ? ', alejando el texto' : ''}`);
  lineas.push(`• Color: ${r.color.aciertos}/${r.color.total} láminas · ${ETIQUETA[i.color]}`);
  if (i.amsler) for (const o of ojos) lineas.push(`• Cuadrícula ${NOMBRE_OJO[o]}: ${i.amsler[o] === 'ok' ? 'sin alteraciones' : 'veo zonas alteradas'}`);
  lineas.push(r.usaGafas ? 'Hecho con gafas o lentillas puestas.' : 'Hecho sin gafas.');
  lineas.push('Me gustaría pedir una revisión de la vista.');
  return lineas.join('\n');
}

/**
 * Versión corta para el campo «nota» de la cita (máx. 500 caracteres en las
 * reglas de Firestore). El cliente la ve y puede editarla antes de reservar.
 */
export function notaCita(r: Resultados, i: Informe, max = 480): string {
  const n = (o: Ojo) => (r.agudeza[o].nivel ? textoDecimal(r.agudeza[o].nivel!.decimal) : '<0,1');
  const partes = [
    `Test online${r.perfil === 'nino' ? ' (niño/a)' : ''}${r.usaGafas ? ' con gafas' : ' sin gafas'}:`,
    `AV OD ${n('derecho')} / OI ${n('izquierdo')}`,
  ];
  if (r.astigmatismo) {
    const a = (o: Ojo) => (r.astigmatismo![o].linea === null ? '-' : textoEjeLinea(r.astigmatismo![o].linea!));
    partes.push(`líneas OD ${a('derecho')} / OI ${a('izquierdo')}`);
  }
  if (r.duocromo) partes.push(`duocromo OD ${r.duocromo.derecho.lado} / OI ${r.duocromo.izquierdo.lado}`);
  if (r.cerca) partes.push(`cerca ${r.cerca.decimal === null ? 'no lee' : textoDecimal(r.cerca.decimal)}${r.cerca.alejaTexto ? ' (aleja)' : ''}`);
  partes.push(`color ${r.color.aciertos}/${r.color.total}`);
  if (i.amsler) partes.push(`Amsler OD ${i.amsler.derecho === 'ok' ? 'ok' : 'alterado'} / OI ${i.amsler.izquierdo === 'ok' ? 'ok' : 'alterado'}`);
  const texto = `${partes[0]} ${partes.slice(1).join('; ')}.`;
  return texto.length <= max ? texto : `${texto.slice(0, max - 1)}…`;
}
