// El corazón del panel: cómo construye una publicación en GitHub. Se simula la
// API para comprobar cada petición sin tocar el repositorio real.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorGitHub, GitHub } from '../../src/admin/lib/github';
import { BackendGitHub, Conflicto } from '../../src/admin/lib/backend';

type Peticion = { metodo: string; ruta: string; cuerpo?: Record<string, unknown> };

function simularApi(respuestas: (p: Peticion) => { estado?: number; json?: unknown }) {
  const peticiones: Peticion[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, op: RequestInit = {}) => {
      const p = { metodo: op.method ?? 'GET', ruta: url.replace('https://api.github.com', ''), cuerpo: op.body ? JSON.parse(String(op.body)) : undefined };
      peticiones.push(p);
      const r = respuestas(p);
      const estado = r.estado ?? 200;
      return new Response(estado === 204 ? null : JSON.stringify(r.json ?? {}), { status: estado, headers: { 'content-type': 'application/json' } });
    }),
  );
  return peticiones;
}

afterEach(() => vi.unstubAllGlobals());

describe('commit atómico', () => {
  it('sube blobs, crea árbol y commit, y mueve la rama sin forzar', async () => {
    const pet = simularApi((p) => {
      if (p.ruta.startsWith('/repos/o/r/git/commits/base')) return { json: { tree: { sha: 'arbol-base' } } };
      if (p.ruta === '/repos/o/r/git/blobs') return { json: { sha: `blob-${(p.cuerpo!.content as string).slice(0, 4)}` } };
      if (p.ruta === '/repos/o/r/git/trees') return { json: { sha: 'arbol-nuevo' } };
      if (p.ruta === '/repos/o/r/git/commits') return { json: { sha: 'commit-nuevo' } };
      return { json: {} };
    });
    const gh = new GitHub('t', 'o/r');
    const sha = await gh.commit(
      'main',
      'base',
      [
        { ruta: 'src/data/negocio.json', contenido: '{"a":1}' },
        { ruta: 'public/uploads/x.webp', contenido: 'AAAA', binario: true },
        { ruta: 'src/content/blog/viejo.md', borrar: true },
      ],
      'Mensaje',
    );
    expect(sha).toBe('commit-nuevo');
    const blobs = pet.filter((p) => p.ruta === '/repos/o/r/git/blobs');
    expect(blobs.map((b) => b.cuerpo!.encoding).sort()).toEqual(['base64', 'utf-8']);
    const arbol = pet.find((p) => p.ruta === '/repos/o/r/git/trees')!.cuerpo!;
    expect(arbol.base_tree).toBe('arbol-base');
    expect(arbol.tree).toContainEqual({ path: 'src/content/blog/viejo.md', mode: '100644', type: 'blob', sha: null });
    const commit = pet.find((p) => p.ruta === '/repos/o/r/git/commits' && p.metodo === 'POST')!.cuerpo!;
    expect(commit).toMatchObject({ message: 'Mensaje', tree: 'arbol-nuevo', parents: ['base'] });
    const ref = pet.find((p) => p.metodo === 'PATCH')!;
    expect(ref.ruta).toBe('/repos/o/r/git/refs/heads/main');
    expect(ref.cuerpo).toEqual({ sha: 'commit-nuevo', force: false });
  });

  it('crea la rama de vista previa si aún no existe', async () => {
    const pet = simularApi((p) => (p.metodo === 'PATCH' ? { estado: 422, json: { message: 'Reference does not exist' } } : { json: {} }));
    await new GitHub('t', 'o/r').moverRama('vista-previa', 'abc', true, true);
    expect(pet.at(-1)).toMatchObject({ metodo: 'POST', ruta: '/repos/o/r/git/refs', cuerpo: { ref: 'refs/heads/vista-previa', sha: 'abc' } });
  });

  it('traduce los errores de GitHub', async () => {
    simularApi(() => ({ estado: 401, json: { message: 'Bad credentials' } }));
    await expect(new GitHub('t', 'o/r').usuario()).rejects.toMatchObject({ estado: 401, message: expect.stringContaining('caducado') });
    simularApi(() => ({ estado: 403, json: { message: 'API rate limit exceeded' } }));
    await expect(new GitHub('t', 'o/r').usuario()).rejects.toBeInstanceOf(ErrorGitHub);
  });
});

describe('publicar con otras personas editando', () => {
  const config = { repo: 'o/r', rama: 'main', sitio: '/', base: '/', demoUrl: '', authUrl: '' };
  const cambio = (ruta: string) => ({ ruta, tipo: 'modificar' as const, contenido: 'x', descripcion: 'x' });

  function backend(cabezaRemota: string, tocados: string[]) {
    const b = new BackendGitHub('t', config);
    vi.spyOn(b.gh, 'cabeza').mockResolvedValue(cabezaRemota);
    vi.spyOn(b.gh, 'comparar').mockResolvedValue(tocados);
    const commit = vi.spyOn(b.gh, 'commit').mockResolvedValue('nuevo');
    return { b, commit };
  }

  it('si nadie ha publicado, publica sobre lo que tenía', async () => {
    const { b, commit } = backend('mia', []);
    await b.publicar([cambio('src/data/negocio.json')], 'm', 'mia');
    expect(commit.mock.calls[0][1]).toBe('mia');
  });

  it('si otra persona publicó otros archivos, publica encima sin molestar', async () => {
    const { b, commit } = backend('suya', ['src/data/resenas.json']);
    await b.publicar([cambio('src/data/negocio.json')], 'm', 'mia');
    expect(commit.mock.calls[0][1]).toBe('suya');
  });

  it('si tocó los mismos archivos, avisa del conflicto en vez de pisarlos', async () => {
    const { b, commit } = backend('suya', ['src/data/negocio.json']);
    await expect(b.publicar([cambio('src/data/negocio.json')], 'm', 'mia')).rejects.toBeInstanceOf(Conflicto);
    expect(commit).not.toHaveBeenCalled();
  });

  it('con «Publicar mi versión» sustituye esos archivos a sabiendas', async () => {
    const { b, commit } = backend('suya', ['src/data/negocio.json']);
    await b.publicar([cambio('src/data/negocio.json')], 'm', 'mia', true);
    expect(commit).toHaveBeenCalled();
  });

  it('la vista previa va a su rama, forzada y sobre lo último publicado', async () => {
    const { b, commit } = backend('ultima', []);
    await b.vistaPrevia([cambio('src/data/negocio.json')]);
    expect(commit.mock.calls[0][0]).toBe('vista-previa');
    expect(commit.mock.calls[0][1]).toBe('ultima');
    expect(commit.mock.calls[0][4]).toEqual({ forzar: true, crear: true });
  });
});
