// Reserva de citas: la web pública (con la agenda en memoria, ?memoria) y la
// configuración y la agenda del panel en modo demostración.
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

const ir = (p: Page, ruta: string) => p.evaluate((r) => (location.hash = r), ruta);

test.describe('web pública', () => {
  test('se reserva una cita, aparece en «tus citas» y se cancela', async ({ pagina }) => {
    await pagina.goto('pedir-cita/?memoria');
    const primerDia = pagina.locator('[data-rejilla] button:not([disabled])').first();
    await expect(primerDia).toBeVisible();
    await primerDia.click();
    await pagina.locator('[data-horas] button').first().click();
    const hora = (await pagina.locator('[data-horas] button[aria-pressed="true"]').textContent())!.trim();

    // Sin los datos obligatorios no se reserva.
    await pagina.getByRole('button', { name: 'Reservar mi cita' }).click();
    await expect(pagina.getByText('Escribe tu nombre')).toBeVisible();
    await expect(pagina.getByText('Escribe un teléfono de 9 cifras')).toBeVisible();

    await pagina.locator('input[name="nombre"]').fill('Carmen García');
    await pagina.locator('input[name="telefono"]').fill('612 34 56 78');
    await pagina.getByLabel(/He leído la/).check();
    await pagina.getByRole('button', { name: 'Reservar mi cita' }).click();

    await expect(pagina.getByRole('heading', { name: '¡Cita reservada!' })).toBeVisible();
    await expect(pagina.locator('[data-hecho-texto]')).toContainText(`a las ${hora}`);
    await expect(pagina.locator('[data-lista-citas] li')).toHaveCount(1);

    // La hora reservada ya no se ofrece.
    await pagina.getByRole('button', { name: 'Reservar otra cita' }).click();
    await pagina.locator('[data-rejilla] button:not([disabled])').first().click();
    await expect(pagina.locator('[data-horas] button', { hasText: hora })).toHaveCount(0);

    pagina.once('dialog', (d) => d.accept());
    await pagina.locator('[data-lista-citas] button').click();
    await expect(pagina.locator('[data-mis-citas]')).toBeHidden();
    await pagina.locator('[data-rejilla] button:not([disabled])').first().click();
    await expect(pagina.locator('[data-horas] button', { hasText: hora })).toHaveCount(1);
  });

  test('cambiar de cita recalcula los días y WhatsApp queda para las dudas', async ({ pagina }) => {
    await pagina.goto('pedir-cita/?memoria&servicio=audifonos');
    await expect(pagina.locator('input[name="tipo"][value="audifonos"]')).toBeChecked();
    await expect(pagina.locator('[data-rejilla] button:not([disabled])').first()).toBeVisible();
    await expect(pagina.getByRole('link', { name: 'Escribir por WhatsApp' }).first()).toHaveAttribute('href', /wa\.me\/\d+\?text=/);
  });
});

test.describe('panel', () => {
  test.beforeEach(async ({ pagina }) => {
    await pagina.goto('admin/?demo');
    await expect(pagina.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('una cita nueva con horario propio se guarda y se ve en la vista previa', async ({ pagina }) => {
    await ir(pagina, '/citas');
    await expect(pagina.getByRole('heading', { name: 'Tipos de cita y huecos' })).toBeVisible();
    await pagina.getByRole('button', { name: 'Nueva cita' }).click();
    await expect(pagina.locator('button.cambios .cuenta')).toHaveText('1');
    await pagina.getByLabel('Nombre', { exact: true }).fill('Audiometría completa');
    await pagina.getByLabel('Nombre', { exact: true }).blur();
    await pagina.getByText('Horario propio para esta cita').click();
    await pagina.locator('aside select').selectOption({ label: 'Audiometría completa' });
    await expect(pagina.getByText(/Sin huecos en los próximos días/)).toBeVisible();
    await pagina.getByRole('switch', { name: 'Sin citas' }).first().check({ force: true });
    await expect(pagina.getByLabel('Lunes: desde')).toBeVisible();
    await expect(pagina.locator('.dia-previa').first()).toBeVisible();
  });

  test('la agenda pide entrar y enseña las citas', async ({ pagina }) => {
    await ir(pagina, '/agenda');
    await pagina.getByRole('button', { name: 'Entrar con Google' }).click();
    await expect(pagina.getByText('Carmen García')).toBeVisible();
    pagina.once('dialog', (d) => d.accept());
    await pagina.getByRole('button', { name: 'Cancelar' }).first().click();
    await expect(pagina.getByText('Cita cancelada')).toBeVisible();
  });
});
