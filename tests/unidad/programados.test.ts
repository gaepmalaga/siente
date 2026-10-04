import { describe, expect, it } from 'vitest';
import { momentos } from '../../scripts/programados';

describe('publicaciones programadas', () => {
  it('lee los momentos del contenido real sin fallos', () => {
    const lista = momentos();
    expect(lista.length).toBeGreaterThan(0);
    for (const m of lista) expect(Number.isFinite(m.cuando)).toBe(true);
    expect(lista.some((m) => m.que.startsWith('artículo'))).toBe(true);
  });
});
