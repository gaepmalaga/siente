// Lógica de horario sin dependencias: la usan la web al compilar, el navegador
// («Abierto ahora», días de cita) y el panel /admin (vista previa).

export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type Dia = (typeof DIAS)[number];
export type Tramo = { abre: string; cierra: string };
export type Cierre = { desde: string; hasta: string; motivo?: string };
export type HorarioSemana = Record<Dia, Tramo[]>;

export const NOMBRE_DIA: Record<Dia, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

// Índice de Date.getDay() (0 = domingo) → nuestro día.
const POR_INDICE: Dia[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const aMinutos = (h: string) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

export const formatoTramo = (t: Tramo) => `${t.abre} – ${t.cierra}`;

export function porDia(horario: { dia: Dia; abre: string; cierra: string }[]): HorarioSemana {
  const semana = Object.fromEntries(DIAS.map((d) => [d, [] as Tramo[]])) as HorarioSemana;
  for (const { dia, abre, cierra } of horario) semana[dia]?.push({ abre, cierra });
  for (const d of DIAS) semana[d].sort((a, b) => aMinutos(a.abre) - aMinutos(b.abre));
  return semana;
}

/** Agrupa días consecutivos con el mismo horario: «Lunes a viernes», «Sábado»… */
export function agrupar(semana: HorarioSemana): { dias: string; claves: Dia[]; tramos: string[] }[] {
  const grupos: { claves: Dia[]; clave: string; tramos: string[] }[] = [];
  for (const d of DIAS) {
    const tramos = semana[d].map(formatoTramo);
    const clave = tramos.join('|');
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.clave === clave) ultimo.claves.push(d);
    else grupos.push({ claves: [d], clave, tramos });
  }
  return grupos.map((g) => {
    const [a, b] = [g.claves[0], g.claves.at(-1)!];
    const dias =
      g.claves.length === 1
        ? NOMBRE_DIA[a]
        : g.claves.length === 2
          ? `${NOMBRE_DIA[a]} y ${NOMBRE_DIA[b].toLowerCase()}`
          : `${NOMBRE_DIA[a]} a ${NOMBRE_DIA[b].toLowerCase()}`;
    return { dias, claves: g.claves, tramos: g.tramos };
  });
}

/** Errores de un horario semanal (tramos al revés o que se pisan). */
export function erroresHorario(semana: HorarioSemana): string[] {
  const errores: string[] = [];
  for (const d of DIAS) {
    const tramos = semana[d];
    tramos.forEach((t, i) => {
      if (!/^\d{1,2}:\d{2}$/.test(t.abre) || !/^\d{1,2}:\d{2}$/.test(t.cierra)) {
        errores.push(`${NOMBRE_DIA[d]}: escribe las horas como 09:30`);
      } else if (aMinutos(t.cierra) <= aMinutos(t.abre)) {
        errores.push(`${NOMBRE_DIA[d]}: el tramo ${formatoTramo(t)} cierra antes de abrir`);
      } else if (i > 0 && aMinutos(t.abre) < aMinutos(tramos[i - 1].cierra)) {
        errores.push(`${NOMBRE_DIA[d]}: los tramos ${formatoTramo(tramos[i - 1])} y ${formatoTramo(t)} se pisan`);
      }
    });
  }
  return errores;
}

// ── Fechas (siempre en hora de Madrid) ─────────────────────────────────────

export function ahoraEnMadrid(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  const indice = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(v('weekday'));
  return {
    iso: `${v('year')}-${v('month')}-${v('day')}`,
    dia: POR_INDICE[indice],
    minuto: Number(v('hour')) * 60 + Number(v('minute')),
  };
}

export function sumarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

export function diaDeFecha(iso: string): Dia {
  const [a, m, d] = iso.split('-').map(Number);
  return POR_INDICE[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
}

/** «25 de agosto» */
export function fechaLarga(iso: string, conAnio = false): string {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]}${conAnio ? ` de ${a}` : ''}`;
}

export const cierreEn = (cierres: Cierre[], iso: string) => cierres.find((c) => c.desde <= iso && iso <= c.hasta);

/** ¿Abre ese día? (tiene horario y no cae en un cierre) */
export const abreEl = (semana: HorarioSemana, cierres: Cierre[], iso: string) =>
  semana[diaDeFecha(iso)].length > 0 && !cierreEn(cierres, iso);

// ── «Abierto ahora» ─────────────────────────────────────────────────────────

export function estadoApertura(semana: HorarioSemana, cierres: Cierre[] = [], fecha = new Date()) {
  const { iso, dia, minuto } = ahoraEnMadrid(fecha);
  const cierre = cierreEn(cierres, iso);
  const proximaApertura = (desde: number) => {
    for (let i = desde; i <= 60; i++) {
      const otro = sumarDias(iso, i);
      if (!abreEl(semana, cierres, otro)) continue;
      const tramo = semana[diaDeFecha(otro)][0];
      const cuando = i === 1 ? 'mañana' : i < 7 ? `el ${NOMBRE_DIA[diaDeFecha(otro)].toLowerCase()}` : `el ${fechaLarga(otro)}`;
      return `abrimos ${cuando} a las ${tramo.abre}`;
    }
    return '';
  };

  if (cierre) {
    const motivo = cierre.motivo ? ` por ${cierre.motivo.toLowerCase()}` : '';
    const vuelta = proximaApertura(1);
    return { abierto: false, texto: `Cerrado${motivo}${vuelta ? ` · ${vuelta}` : ''}` };
  }
  const hoy = semana[dia];
  const abierto = hoy.find((t) => minuto >= aMinutos(t.abre) && minuto < aMinutos(t.cierra));
  if (abierto) {
    const quedan = aMinutos(abierto.cierra) - minuto;
    return { abierto: true, texto: quedan <= 30 ? `Abierto · cierra en ${quedan} min` : `Abierto ahora · hasta las ${abierto.cierra}` };
  }
  const luego = hoy.find((t) => aMinutos(t.abre) > minuto);
  if (luego) return { abierto: false, texto: `Cerrado · abrimos hoy a las ${luego.abre}` };
  const siguiente = proximaApertura(1);
  return { abierto: false, texto: siguiente ? `Cerrado · ${siguiente}` : 'Cerrado' };
}

// ── Avisos (manual y automáticos por cierre) ────────────────────────────────

export type Aviso = { texto: string; enlace?: string; desde?: string; hasta?: string };

/** Días antes de un cierre en los que la web empieza a avisar. */
export const DIAS_PREAVISO = 14;

export function textoCierre(c: Cierre): string {
  const motivo = c.motivo ? ` por ${c.motivo.toLowerCase()}` : '';
  const rango = c.desde === c.hasta ? `el ${fechaLarga(c.desde)}` : `del ${fechaLarga(c.desde)} al ${fechaLarga(c.hasta)}`;
  return `Cerramos ${rango}${motivo}. Pide tu cita para antes o para la vuelta.`;
}

/** Todos los avisos posibles, cada uno con su ventana de fechas. */
export function avisosProgramados(
  aviso: { activo: boolean; texto?: string; enlace?: string; desde?: string; hasta?: string },
  cierres: Cierre[],
): Aviso[] {
  const lista: Aviso[] = [];
  if (aviso.activo && aviso.texto) lista.push({ texto: aviso.texto, enlace: aviso.enlace, desde: aviso.desde, hasta: aviso.hasta });
  for (const c of cierres) lista.push({ texto: textoCierre(c), enlace: '/pedir-cita/', desde: sumarDias(c.desde, -DIAS_PREAVISO), hasta: c.hasta });
  return lista;
}

export const avisoVigente = (a: Aviso, iso: string) => (!a.desde || a.desde <= iso) && (!a.hasta || iso <= a.hasta);
