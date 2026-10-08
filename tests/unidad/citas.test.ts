import { describe, expect, it } from 'vitest';
import { Citas } from '../../src/lib/esquemas';
import { porDia } from '../../src/lib/horario';
import { avisosCitas, celdasDeCita, diasConHuecos, huecosDelDia, idCelda, puestoLibre, type Entorno } from '../../src/lib/citas';
import { readFileSync } from 'node:fs';

const citas = Citas.parse({
  hueco: 30,
  descanso: 0,
  simultaneas: 1,
  antelacionHoras: 0,
  maxDias: 30,
  tipos: [
    { id: 'vista', nombre: 'Vista', duracion: 30 },
    { id: 'larga', nombre: 'Larga', duracion: 60 },
    { id: 'oido', nombre: 'Oído', duracion: 30, horarioPropio: true, tramos: [{ dia: 'martes', abre: '16:00', cierra: '18:00' }] },
  ],
});
const semana = porDia([
  { dia: 'lunes', abre: '10:00', cierra: '12:00' },
  { dia: 'martes', abre: '10:00', cierra: '12:00' },
  { dia: 'martes', abre: '16:00', cierra: '20:00' },
]);
// Lunes 12 de octubre de 2026, 08:00 en Madrid (06:00 UTC, horario de verano).
const AHORA = new Date('2026-10-12T06:00:00Z');
const entorno = (extra: Partial<Entorno> = {}): Entorno => ({ citas, semanaCentro: semana, cierres: [], ocupadas: new Set(), ahora: AHORA, ...extra });
const [vista, larga, oido] = citas.tipos;
const horas = (e: Entorno, t = vista, iso = '2026-10-12') => huecosDelDia(e, t, iso).map((h) => h.hora);

describe('huecos de un día', () => {
  it('sigue el horario del centro y encaja la duración', () => {
    expect(horas(entorno())).toEqual(['10:00', '10:30', '11:00', '11:30']);
    expect(horas(entorno(), larga)).toEqual(['10:00', '10:30', '11:00']);
  });
  it('un día sin horario no tiene huecos', () => expect(horas(entorno(), vista, '2026-10-14')).toEqual([]));
  it('un tipo con horario propio usa el suyo', () => {
    expect(horas(entorno(), oido, '2026-10-13')).toEqual(['16:00', '16:30', '17:00', '17:30']);
    expect(horas(entorno(), oido, '2026-10-12')).toEqual([]);
  });
  it('el horario común propio sustituye al del centro', () => {
    const c = Citas.parse({ ...citas, horarioComun: 'propio', tramosComunes: [{ dia: 'lunes', abre: '09:00', cierra: '10:00' }] });
    expect(horas(entorno({ citas: c }), c.tipos[0])).toEqual(['09:00', '09:30']);
  });
  it('respeta cierres, días pasados y el máximo de días', () => {
    expect(horas(entorno({ cierres: [{ desde: '2026-10-12', hasta: '2026-10-12', motivo: '' }] }))).toEqual([]);
    expect(horas(entorno(), vista, '2026-10-05')).toEqual([]);
    expect(horas(entorno({ citas: { ...citas, maxDias: 3 } }), vista, '2026-10-19')).toEqual([]);
  });
  it('exige antelación mínima, también de varios días', () => {
    const tarde = new Date('2026-10-12T08:15:00Z'); // 10:15 en Madrid
    expect(horas(entorno({ ahora: tarde, citas: { ...citas, antelacionHoras: 1 } }))).toEqual(['11:30']);
    expect(horas(entorno({ citas: { ...citas, antelacionHoras: 48 } }), vista, '2026-10-13')).toEqual([]);
    expect(horas(entorno({ citas: { ...citas, antelacionHoras: 48 } }), vista, '2026-10-14')).toEqual([]); // miércoles sin horario
  });
  it('el descanso alarga lo que ocupa cada cita', () => {
    const c = { ...citas, descanso: 10, hueco: 10 };
    const t = c.tipos[0];
    expect(celdasDeCita(c, t, '2026-10-12', 600, 0)).toHaveLength(4); // 30 + 10 → 4 celdas de 10
    const ocupadas = new Set(celdasDeCita(c, t, '2026-10-12', 600, 0));
    expect(horas(entorno({ citas: c, ocupadas }), t).slice(0, 3)).toEqual(['10:40', '10:50', '11:00']);
  });
});

describe('reservas y puestos', () => {
  it('una celda ocupada quita los huecos que se pisan', () => {
    const ocupadas = new Set([idCelda('2026-10-12', 10 * 60 + 30, 0)]);
    expect(horas(entorno({ ocupadas }))).toEqual(['10:00', '11:00', '11:30']);
    expect(horas(entorno({ ocupadas }), larga)).toEqual(['11:00']);
  });
  it('con dos personas se usa el segundo puesto', () => {
    const c = { ...citas, simultaneas: 2 };
    const ocupadas = new Set(celdasDeCita(c, vista, '2026-10-12', 600, 0));
    expect(puestoLibre({ citas: c, ocupadas }, vista, '2026-10-12', 600)).toBe(1);
    expect(horas(entorno({ citas: c, ocupadas }))).toContain('10:00');
    celdasDeCita(c, vista, '2026-10-12', 600, 1).forEach((id) => ocupadas.add(id));
    expect(horas(entorno({ citas: c, ocupadas }))).not.toContain('10:00');
  });
  it('los días sin huecos no salen en el calendario', () => {
    const dias = diasConHuecos(entorno(), vista);
    expect(dias.get('2026-10-12')).toBe(4);
    expect(dias.has('2026-10-14')).toBe(false);
    expect(dias.get('2026-10-13')).toBe(12); // 4 por la mañana + 8 por la tarde
  });
  it('una cita apagada o la web apagada no ofrecen nada', () => {
    expect(horas(entorno({ citas: { ...citas, activo: false } }))).toEqual([]);
    expect(huecosDelDia(entorno(), { ...vista, activo: false }, '2026-10-12')).toEqual([]);
  });
});

describe('configuración', () => {
  it('avisa de una cita imposible', () => {
    const c = Citas.parse({ ...citas, tipos: [{ id: 'x', nombre: 'X', duracion: 240 }] });
    expect(avisosCitas(c, porDia([{ dia: 'lunes', abre: '10:00', cierra: '12:00' }]))).toHaveLength(1);
    expect(avisosCitas(citas, semana)).toEqual([]);
  });
  it('src/data/citas.json es válido y todas sus citas tienen huecos posibles', () => {
    const real = Citas.parse(JSON.parse(readFileSync('src/data/citas.json', 'utf8')));
    const negocio = JSON.parse(readFileSync('src/data/negocio.json', 'utf8'));
    expect(avisosCitas(real, porDia(negocio.horario))).toEqual([]);
  });
});
