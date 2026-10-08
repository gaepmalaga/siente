// Cálculo de los huecos de cita. Es lógica pura (sin Firebase ni navegador): la
// usan la web al reservar, el panel para la vista previa y las pruebas.
//
// La agenda se divide en «celdas» de `hueco` minutos alineadas a las 00:00. Una
// cita ocupa las celdas que necesita (duración + descanso) en un «puesto»; con
// varias personas atendiendo hay un puesto por persona. Cada celda ocupada es
// un documento con identificador único, y eso es lo que impide dos reservas en
// el mismo hueco.
import {
  DIAS,
  aMinutos,
  ahoraEnMadrid,
  cierreEn,
  diaDeFecha,
  porDia,
  sumarDias,
  type Cierre,
  type HorarioSemana,
  type Tramo,
} from './horario';
import type { DatosCitas, DatosTipoCita } from './esquemas';

export type { DatosCitas, DatosTipoCita };

const dos = (n: number) => String(n).padStart(2, '0');
export const textoHora = (minutos: number) => `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;

/** Horario semanal que se aplica a una cita (el suyo, el común o el del centro). */
export function semanaDeTipo(citas: DatosCitas, tipo: DatosTipoCita, semanaCentro: HorarioSemana): HorarioSemana {
  if (tipo.horarioPropio) return porDia(tipo.tramos);
  return citas.horarioComun === 'propio' ? porDia(citas.tramosComunes) : semanaCentro;
}

/** Celdas que ocupa una cita: la duración más el descanso, redondeado hacia arriba. */
export const celdasNecesarias = (citas: DatosCitas, tipo: DatosTipoCita) => Math.max(1, Math.ceil((tipo.duracion + citas.descanso) / citas.hueco));

export const idCelda = (iso: string, minutos: number, puesto: number) => `${iso}_${dos(Math.floor(minutos / 60))}${dos(minutos % 60)}_${puesto}`;

/** Identificadores de todas las celdas de una cita que empieza a esa hora. */
export function celdasDeCita(citas: DatosCitas, tipo: Pick<DatosTipoCita, 'duracion'>, iso: string, minutos: number, puesto: number): string[] {
  const n = Math.max(1, Math.ceil((tipo.duracion + citas.descanso) / citas.hueco));
  return Array.from({ length: n }, (_, i) => idCelda(iso, minutos + i * citas.hueco, puesto));
}

/** Horas de inicio posibles de un día según el horario (sin mirar lo ocupado). */
export function horasDeInicio(citas: DatosCitas, tipo: DatosTipoCita, tramos: Tramo[]): number[] {
  const horas = new Set<number>();
  for (const t of tramos) {
    const abre = aMinutos(t.abre);
    const cierra = aMinutos(t.cierra);
    for (let m = Math.ceil(abre / citas.hueco) * citas.hueco; m + tipo.duracion <= cierra; m += citas.hueco) horas.add(m);
  }
  return [...horas].sort((a, b) => a - b);
}

/** Minutos que faltan desde ahora hasta ese día y hora (en hora de Madrid). */
function minutosHasta(iso: string, minutos: number, ahora: { iso: string; minuto: number }): number {
  const dia = (s: string) => {
    const [a, m, d] = s.split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((dia(iso) - dia(ahora.iso)) / 60_000) + minutos - ahora.minuto;
}

export type Hueco = { hora: string; minutos: number; puesto: number };

export type Entorno = {
  citas: DatosCitas;
  semanaCentro: HorarioSemana;
  cierres: Cierre[];
  /** Celdas ocupadas (identificadores). */
  ocupadas: ReadonlySet<string>;
  ahora?: Date;
};

/** Primer puesto libre para toda la duración de la cita, o -1. */
export function puestoLibre(e: Pick<Entorno, 'citas' | 'ocupadas'>, tipo: Pick<DatosTipoCita, 'duracion'>, iso: string, minutos: number): number {
  for (let p = 0; p < e.citas.simultaneas; p++) {
    if (celdasDeCita(e.citas, tipo, iso, minutos, p).every((id) => !e.ocupadas.has(id))) return p;
  }
  return -1;
}

/** Huecos libres de un día para un tipo de cita. */
export function huecosDelDia(e: Entorno, tipo: DatosTipoCita, iso: string): Hueco[] {
  const ahora = ahoraEnMadrid(e.ahora);
  if (!e.citas.activo || !tipo.activo) return [];
  if (iso < ahora.iso || minutosHasta(iso, 0, ahora) > e.citas.maxDias * 1440) return [];
  if (cierreEn(e.cierres, iso)) return [];
  const tramos = semanaDeTipo(e.citas, tipo, e.semanaCentro)[diaDeFecha(iso)];
  const salida: Hueco[] = [];
  for (const minutos of horasDeInicio(e.citas, tipo, tramos)) {
    if (minutosHasta(iso, minutos, ahora) < e.citas.antelacionHoras * 60) continue;
    const puesto = puestoLibre(e, tipo, iso, minutos);
    if (puesto >= 0) salida.push({ hora: textoHora(minutos), minutos, puesto });
  }
  return salida;
}

/** Días (AAAA-MM-DD) desde hoy hasta el límite, con la cantidad de huecos libres de cada uno. */
export function diasConHuecos(e: Entorno, tipo: DatosTipoCita): Map<string, number> {
  const hoy = ahoraEnMadrid(e.ahora).iso;
  const mapa = new Map<string, number>();
  for (let i = 0; i <= e.citas.maxDias; i++) {
    const iso = sumarDias(hoy, i);
    const n = huecosDelDia(e, tipo, iso).length;
    if (n) mapa.set(iso, n);
  }
  return mapa;
}

/** Problemas de configuración que el panel enseña antes de publicar. */
export function avisosCitas(citas: DatosCitas, semanaCentro: HorarioSemana): string[] {
  const avisos: string[] = [];
  const ids = new Set<string>();
  for (const t of citas.tipos) {
    if (ids.has(t.id)) avisos.push(`Hay dos citas con el mismo identificador («${t.id}»).`);
    ids.add(t.id);
    if (!t.activo) continue;
    const semana = semanaDeTipo(citas, t, semanaCentro);
    if (!DIAS.some((d) => horasDeInicio(citas, t, semana[d]).length))
      avisos.push(`«${t.nombre}» no tiene ningún hueco posible: revisa su horario y su duración.`);
  }
  return avisos;
}
