// Test de vista online: recorrido completo de un adulto y de un niño, y el paso
// del resumen a la nota de la cita.
import { test as base, expect, type Page } from '@playwright/test';

const test = base.extend<{ pagina: Page }>({
  pagina: async ({ page }, usar) => {
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errores.push(m.text()));
    await usar(page);
    expect(errores, 'errores en la consola').toEqual([]);
  },
});

/** Contesta bien hasta `aciertos` intentos leyendo el giro real del optotipo; después, «No lo veo». */
async function agudeza(p: Page, aciertos: number) {
  let n = 0;
  while (await p.locator('.tv-cruz').count()) {
    await p.locator('.tv-optotipo:not(.oculto)').waitFor();
    const giro = await p.locator('.tv-optotipo circle, .tv-optotipo path').first().evaluate((e) => parseFloat(e.getAttribute('transform')!.match(/rotate\(([-\d.]+)/)![1]));
    const esE = (await p.locator('.tv-optotipo path').count()) > 0;
    const grados = Math.round((esE ? giro : giro - 14.32 + 360) % 360);
    const dir = ({ 0: 'der', 90: 'abajo', 180: 'izq', 270: 'arriba' } as Record<number, string>)[grados];
    await p.locator(++n > aciertos ? '[data-dir="nover"]' : `[data-dir="${dir}"]`).click();
    await p.waitForTimeout(220);
  }
}

async function laminas(p: Page) {
  for (let i = 0; i < 5; i++) {
    await p.locator('.tv-lamina canvas').waitFor();
    await p.locator('.tv-numeros .tv-numero').nth(1).click();
  }
}

test('un adulto completa el test y la nota llega a la cita', async ({ pagina: p }) => {
  await p.goto('test-de-vista-online/');
  await p.locator('[data-accion="empezar"]').click();
  await p.locator('[data-accion="ok"]').click();
  for (const _ojo of ['derecho', 'izquierdo']) {
    await p.locator('[data-accion="listo"]').click();
    await agudeza(p, 12);
    await p.locator('label.tv-opcion', { hasText: 'Igual en los dos' }).click();
    await p.locator('[data-accion="sig"]').click();
    await p.locator('label.tv-chip', { hasText: 'Todas se ven igual' }).click();
    await p.locator('[data-accion="sig"]').click();
    await p.locator('label.tv-opcion', { hasText: 'Todo se ve recto y completo' }).click();
    await p.locator('[data-accion="sig"]').click();
  }
  await p.locator('.tv-linea-cerca:has(input[value="0.8"])').click();
  await p.locator('[data-accion="sig"]').click();
  await laminas(p);
  await expect(p.locator('.tv-veredicto')).toBeVisible();
  await expect(p.locator('.tv-fila')).toHaveCount(6);
  const enlace = await p.locator('a[data-cita]').getAttribute('href');
  expect(enlace).toContain('nota=');
  expect(decodeURIComponent(enlace!)).toContain('AV OD');
});

test('una urgencia bloquea el test', async ({ pagina: p }) => {
  await p.goto('test-de-vista-online/');
  await p.locator('label.tv-opcion', { hasText: 'Pérdida brusca de visión' }).click();
  await expect(p.locator('[data-alerta-urgente]')).toBeVisible();
  await expect(p.locator('[data-accion="empezar"]')).toBeHidden();
});

test('el modo niño usa la E y solo hace agudeza y color', async ({ pagina: p }) => {
  await p.goto('test-de-vista-online/');
  await p.locator('label.tv-opcion', { hasText: 'Para un niño o niña' }).click();
  await p.locator('[data-accion="empezar"]').click();
  await p.locator('[data-accion="ok"]').click();
  for (const _ojo of ['derecho', 'izquierdo']) {
    await p.locator('[data-accion="listo"]').click();
    await agudeza(p, 11);
  }
  await laminas(p);
  await expect(p.locator('.tv-fila h3')).toHaveText(['Agudeza visual', 'Visión del color']);
});

test('la nota del test se precarga en la cita', async ({ pagina: p }) => {
  await p.goto('pedir-cita/?memoria&servicio=revision-vista&nota=Test%20online%20de%20prueba');
  await expect(p.locator('textarea[name="nota"]')).toHaveValue('Test online de prueba');
});

test.describe('en un móvil', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });

  test('la prueba del aro cabe en pantalla, bajo la cabecera y sobre la barra de acciones', async ({ pagina: p }) => {
    await p.goto('test-de-vista-online/');
    await p.locator('[data-accion="empezar"]').click();
    await p.locator('[data-accion="ok"]').click();
    await p.locator('[data-accion="listo"]').click();
    await p.locator('.tv-optotipo').waitFor();
    await p.waitForTimeout(900); // termina el desplazamiento suave
    const caja = async (sel: string) => p.locator(sel).first().evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { arriba: r.top, abajo: r.bottom };
    });
    const aro = await caja('.tv-optotipo');
    const cruz = await caja('.tv-cruz');
    // La cabecera fija mide unos 85 px y la barra de acciones del móvil, unos 90.
    expect(aro.arriba, 'el aro queda tapado por la cabecera').toBeGreaterThan(90);
    expect(cruz.abajo, 'las flechas quedan bajo la barra de acciones').toBeLessThan(780 - 90);
  });
});
