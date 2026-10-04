import { describe, expect, it } from 'vitest';
import {
  avisoVigente,
  avisosProgramados,
  diaDeFecha,
  erroresHorario,
  estadoApertura,
  instanteMadrid,
  momentoPublicacion,
  partesFecha,
  sumarDias,
  valorFecha,
  type HorarioSemana,
} from '../../src/lib/horario';

const tramos = [
  { abre: '10:00', cierra: '13:30' },
  { abre: '17:00', cierra: '20:00' },
];
const semana: HorarioSemana = {
  lunes: tramos,
  martes: tramos,
  miercoles: tramos,
  jueves: tramos,
  viernes: tramos,
  sabado: [{ abre: '10:00', cierra: '14:00' }],
  domingo: [],
};
/** Hora de Madrid en octubre (UTC+2). */
const madrid = (iso: string, hora: string) => new Date(instanteMadrid(iso, hora));

describe('fechas en hora de Madrid', () => {
  it('pone el desfase de verano y de invierno', () => {
    expect(instanteMadrid('2026-10-10', '09:30')).toBe('2026-10-10T09:30:00+02:00');
    expect(instanteMadrid('2026-12-01', '18:05')).toBe('2026-12-01T18:05:00+01:00');
    expect(new Date(instanteMadrid('2026-10-10', '09:30')).toISOString()).toBe('2026-10-10T07:30:00.000Z');
  });

  it('acierta el día del cambio de hora', () => {
    expect(instanteMadrid('2026-03-29', '12:00')).toBe('2026-03-29T12:00:00+02:00');
    expect(instanteMadrid('2026-10-25', '12:00')).toBe('2026-10-25T12:00:00+01:00');
  });

  it('separa y vuelve a unir fecha y hora sin cambiar nada', () => {
    for (const v of ['2026-10-10T09:30:00+02:00', '2026-12-01T18:05:00+01:00']) {
      const { fecha, hora } = partesFecha(v);
      expect(valorFecha(fecha, hora)).toBe(v);
    }
    expect(partesFecha('2026-09-19')).toEqual({ fecha: '2026-09-19', hora: '' });
    expect(valorFecha('2026-09-19', '')).toBe('2026-09-19');
  });

  it('publica una fecha sin hora a las 00:00 UTC, igual que la web', () => {
    expect(momentoPublicacion('2026-09-19')).toBe(Date.UTC(2026, 8, 19));
  });

  it('suma días y sabe qué día de la semana es', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(diaDeFecha('2026-10-05')).toBe('lunes');
    expect(diaDeFecha('2026-10-11')).toBe('domingo');
  });
});

describe('«Abierto ahora»', () => {
  it('dice abierto en horario y cuándo cierra', () => {
    expect(estadoApertura(semana, [], madrid('2026-10-05', '11:00'))).toEqual({ abierto: true, texto: 'Abierto ahora · hasta las 13:30' });
    expect(estadoApertura(semana, [], madrid('2026-10-05', '13:10')).texto).toBe('Abierto · cierra en 20 min');
  });

  it('a mediodía avisa de la reapertura de la tarde', () => {
    expect(estadoApertura(semana, [], madrid('2026-10-05', '15:00'))).toEqual({ abierto: false, texto: 'Cerrado · abrimos hoy a las 17:00' });
  });

  it('el sábado por la tarde remite al lunes', () => {
    expect(estadoApertura(semana, [], madrid('2026-10-10', '18:00')).texto).toBe('Cerrado · abrimos el lunes a las 10:00');
  });

  it('respeta las vacaciones y salta al primer día que abre', () => {
    const cierres = [{ desde: '2026-10-05', hasta: '2026-10-06', motivo: 'Vacaciones' }];
    const e = estadoApertura(semana, cierres, madrid('2026-10-05', '11:00'));
    expect(e.abierto).toBe(false);
    expect(e.texto).toBe('Cerrado por vacaciones · abrimos el miércoles a las 10:00');
  });
});

describe('avisos', () => {
  it('avisa de un cierre 14 días antes y lo retira al terminar', () => {
    const [a] = avisosProgramados({ activo: false }, [{ desde: '2026-12-24', hasta: '2026-12-26' }]);
    expect(a.desde).toBe('2026-12-10');
    expect(avisoVigente(a, '2026-12-09')).toBe(false);
    expect(avisoVigente(a, '2026-12-10')).toBe(true);
    expect(avisoVigente(a, '2026-12-26')).toBe(true);
    expect(avisoVigente(a, '2026-12-27')).toBe(false);
  });

  it('el aviso manual solo sale si está activo y tiene texto', () => {
    expect(avisosProgramados({ activo: true, texto: '' }, [])).toHaveLength(0);
    expect(avisosProgramados({ activo: false, texto: 'Hola' }, [])).toHaveLength(0);
    expect(avisosProgramados({ activo: true, texto: 'Hola' }, [])).toHaveLength(1);
  });
});

describe('validación del horario', () => {
  it('detecta tramos que se pisan o al revés', () => {
    const malo = { ...semana, lunes: [{ abre: '10:00', cierra: '14:00' }, { abre: '13:00', cierra: '20:00' }], martes: [{ abre: '20:00', cierra: '10:00' }] };
    const errores = erroresHorario(malo);
    expect(errores.some((e) => e.startsWith('Lunes'))).toBe(true);
    expect(errores.some((e) => e.startsWith('Martes'))).toBe(true);
    expect(erroresHorario(semana)).toEqual([]);
  });
});
