// El panel de principio a fin, en modo demostración (no publica nada real).
import { test as base, expect, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';

// Cada prueba falla si el panel escribe errores en la consola.
const test = base.extend<{ panel: Page }>({
  panel: async ({ page }, usar) => {
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errores.push(m.text()));
    await page.goto('admin/?demo');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await usar(page);
    expect(errores, 'errores en la consola').toEqual([]);
  },
});

const ir = (p: Page, ruta: string) => p.evaluate((r) => (location.hash = r), ruta);
const pendientes = (p: Page) => p.locator('button.cambios .cuenta');

test('la pantalla de acceso lleva al modo demostración', async ({ page }) => {
  await page.goto('admin/');
  await expect(page.getByRole('heading', { name: 'Entrar al panel' })).toBeVisible();
  await page.getByRole('link', { name: /modo demostración/ }).click();
  await expect(page.getByText('Modo demostración: toca lo que quieras')).toBeVisible();
});

test('un cierre se guarda como pendiente y se publica', async ({ panel }) => {
  await ir(panel, '/horario');
  await panel.getByRole('button', { name: 'Añadir cierre' }).click();
  await expect(pendientes(panel)).toHaveText('1');
  await panel.locator('button.cambios').click();
  await expect(panel.getByText('Cierres y vacaciones')).toBeVisible();
  await panel.getByRole('button', { name: /Publicar 1 cambio/ }).click();
  await expect(panel.getByText('Cambios guardados. Publicando en la web')).toBeVisible();
  await expect(pendientes(panel)).toHaveCount(0);
  await expect(panel.locator('.chip.ok')).toContainText('Publicado', { timeout: 25_000 });
});

test('el SEO se arregla con un clic', async ({ panel }) => {
  await ir(panel, '/blog/doce-datos-curiosos-del-oido-que-te-dejaran-sordo-de-asombro');
  const seo = panel.locator('section.seo');
  const nota = async () => Number(await seo.locator('.anillo span').textContent());
  const antes = await nota();

  await seo.getByRole('button', { name: 'Escribir uno más corto' }).click();
  const titulo = panel.locator('#campo-titulo-seo');
  await expect(titulo).toBeFocused();
  expect((await titulo.inputValue()).length).toBeLessThanOrEqual(60);

  await seo.getByRole('button', { name: 'Añadirlo al final' }).click();
  await expect(panel.locator('.editor textarea, textarea').last()).toHaveValue(/\(\/pedir-cita\/\)\.\s*$/);
  await expect.poll(nota).toBeGreaterThan(antes);

  // Elegir una palabra clave sugerida la deja puesta (y el análisis dice dónde falta).
  const sugerida = (await seo.locator('.sugerencias button').first().textContent())!.trim();
  await seo.locator('.sugerencias button').first().click();
  await expect(panel.locator('#seo-clave')).toHaveValue(sugerida);
  await expect(seo.getByText(`«${sugerida}»`)).toBeVisible();
  await expect(pendientes(panel)).toHaveText('1');
});

test('los textos de ejemplo sin completar no se pueden publicar', async ({ panel }) => {
  await ir(panel, '/blog/nuevo');
  await panel.getByLabel('Título', { exact: true }).fill('Prueba de textos de ejemplo');
  await panel.locator('section.seo').getByRole('button', { name: 'Añadir preguntas frecuentes' }).click();
  await panel.locator('button.cambios').click();
  await expect(panel.getByText(/Quedan textos de ejemplo por completar/)).toBeVisible();
  await expect(panel.getByRole('button', { name: /Publicar 1 cambio/ })).toBeDisabled();
});

test('un artículo se programa con día y hora', async ({ panel }) => {
  await ir(panel, '/blog/doce-datos-curiosos-del-oido-que-te-dejaran-sordo-de-asombro');
  await panel.locator('input[type=date]').fill('2031-12-01');
  await panel.locator('input[type=time]').fill('09:30');
  await expect(panel.getByText('Programado: aparecerá solo el 1 de diciembre a las 9:30')).toBeVisible();
  await ir(panel, '/blog');
  await expect(panel.locator('.p-chip.info', { hasText: '09:30' })).toBeVisible();
});

test('la vista previa se prepara antes de publicar', async ({ panel }) => {
  await ir(panel, '/horario');
  await panel.getByRole('button', { name: 'Añadir cierre' }).click();
  await panel.locator('button.cambios').click();
  await panel.locator('.previa').getByRole('button', { name: 'Vista previa' }).click();
  await expect(panel.getByText('Preparando la vista previa')).toBeVisible();
  await expect(panel.getByText('Vista previa lista')).toBeVisible({ timeout: 20_000 });
  await expect(panel.locator('.previa').getByRole('link', { name: 'Abrir' })).toHaveAttribute('href', /gaepmalaga\.github\.io\/siente\//);
});

test('las estadísticas de ejemplo se ven completas', async ({ panel }) => {
  await ir(panel, '/estadisticas');
  await expect(panel.getByText('Datos de ejemplo')).toBeVisible();
  await expect(panel.locator('.kpi', { hasText: 'Contactos' })).toBeVisible();
  await expect(panel.locator('.grafica svg')).toHaveCount(2);
  await panel.getByRole('tab', { name: '3 meses' }).click();
  await expect(panel.getByRole('heading', { name: 'Qué busca la gente' })).toBeVisible();
});

/** PNG de color liso, generado al vuelo. */
function png(ancho: number, alto: number): Buffer {
  const crc = (b: Buffer) => {
    let c = ~0;
    for (const x of b) {
      c ^= x;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const bloque = (tipo: string, datos: Buffer) => {
    const t = Buffer.concat([Buffer.from(tipo), datos]);
    const l = Buffer.alloc(4);
    l.writeUInt32BE(datos.length);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(t));
    return Buffer.concat([l, t, c]);
  };
  const cab = Buffer.alloc(13);
  cab.writeUInt32BE(ancho, 0);
  cab.writeUInt32BE(alto, 4);
  cab[8] = 8;
  cab[9] = 2;
  const fila = Buffer.concat([Buffer.from([0]), Buffer.alloc(ancho * 3, 0xb9)]);
  const crudo = Buffer.concat(Array.from({ length: alto }, () => fila));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloque('IHDR', cab), bloque('IDAT', deflateSync(crudo)), bloque('IEND', Buffer.alloc(0))]);
}

test('una foto se recorta y se convierte a WebP al subirla', async ({ panel }) => {
  await ir(panel, '/fotos');
  await panel.locator('input[type=file]').first().setInputFiles({ name: 'Foto Movil.png', mimeType: 'image/png', buffer: png(1200, 800) });
  const dialogo = panel.getByRole('dialog', { name: 'Recortar y girar' });
  await expect(dialogo.getByText('Resultado: 1200 × 800 px')).toBeVisible();
  await dialogo.getByRole('radio', { name: '1:1' }).click();
  await expect(dialogo.getByText('Resultado: 800 × 800 px')).toBeVisible();
  await dialogo.getByRole('button', { name: 'Girar' }).click();
  await dialogo.getByRole('button', { name: 'Recortar y subir' }).click();
  await expect(panel.getByText(/Foto lista/)).toBeVisible();
  await expect(panel.locator('.rejilla li.pendiente .nombre')).toHaveText('foto-movil.webp');
  await expect(pendientes(panel)).toHaveText('1');
});

test('el diagnóstico permite copiar un informe técnico', async ({ panel, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ir(panel, '/accesos');
  await expect(panel.getByRole('heading', { name: 'Diagnóstico' })).toBeVisible();
  await panel.getByRole('button', { name: 'Copiar informe técnico' }).click();
  const informe = JSON.parse(await panel.evaluate(() => navigator.clipboard.readText()));
  expect(informe).toMatchObject({ modo: 'demo', errores: [] });
});
