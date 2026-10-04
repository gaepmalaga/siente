// Prueba real contra GitHub: crea una rama temporal, publica como lo hace el
// panel, comprueba el resultado y la borra. Se ejecuta en GitHub Actions con
// el token del propio workflow; sin GITHUB_TOKEN se salta.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GitHub } from '../../src/admin/lib/github';
import { BackendGitHub, Conflicto } from '../../src/admin/lib/backend';
import { base64ATexto } from '../../src/admin/lib/texto';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY ?? 'gaepmalaga/siente';
const rama = `prueba-panel-${Date.now()}`;
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe.skipIf(!token)('publicación real en GitHub', () => {
  const gh = new GitHub(token!, repo);
  const backend = new BackendGitHub(token!, { repo, rama, sitio: '/', base: '/', demoUrl: '', authUrl: '' });
  let base = '';
  let primero = '';
  let segundo = '';

  beforeAll(async () => {
    base = await gh.cabeza('main');
    await gh.moverRama(rama, base, false, true);
  });

  afterAll(async () => {
    await gh.borrarRama(rama);
  });

  it('publica texto e imagen en un solo commit', async () => {
    primero = await backend.publicar(
      [
        { ruta: 'pruebas-panel/nota.md', tipo: 'crear', contenido: '---\ntitle: Prueba\n---\n\nHola, ñandú.\n', descripcion: 'nota' },
        { ruta: 'pruebas-panel/punto.png', tipo: 'crear', contenido: PNG, binario: true, descripcion: 'foto' },
      ],
      'Prueba automática del panel',
      base,
    );
    expect(await gh.cabeza(rama)).toBe(primero);
    expect(base64ATexto((await gh.archivoEn('pruebas-panel/nota.md', primero))!.base64)).toContain('ñandú');
    expect((await gh.archivoEn('pruebas-panel/punto.png', primero))!.base64).toBe(PNG);
  });

  it('borra archivos y registra qué cambió', async () => {
    segundo = await backend.publicar([{ ruta: 'pruebas-panel/nota.md', tipo: 'borrar', descripcion: 'borrar' }], 'Prueba: borrar', primero);
    expect(await gh.archivoEn('pruebas-panel/nota.md', segundo)).toBeNull();
    expect(await gh.comparar(primero, segundo)).toEqual(['pruebas-panel/nota.md']);
  });

  it('detecta a otra persona publicando lo mismo', async () => {
    // Publicamos desde una versión vieja (primero) algo que «segundo» ya tocó.
    await expect(
      backend.publicar([{ ruta: 'pruebas-panel/nota.md', tipo: 'crear', contenido: 'otra', descripcion: 'x' }], 'x', primero),
    ).rejects.toBeInstanceOf(Conflicto);
    // Pero algo que nadie tocó sí entra, encima de lo último.
    const tercero = await backend.publicar(
      [{ ruta: 'pruebas-panel/otra.md', tipo: 'crear', contenido: 'x', descripcion: 'x' }],
      'x',
      primero,
    );
    expect(await gh.comparar(segundo, tercero)).toEqual(['pruebas-panel/otra.md']);
  });
});
