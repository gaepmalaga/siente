// Cliente mínimo de la API de GitHub para el panel. GitHub hace de base de
// datos: cada publicación es un commit con todos los cambios a la vez.
import { base64ATexto } from './texto';

export class ErrorGitHub extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export class GitHub {
  /** Fecha de caducidad del token, si GitHub la indica. */
  caducidad: string | null = null;

  constructor(
    private token: string | null,
    public repo: string,
  ) {}

  async pedir<T = unknown>(ruta: string, opciones: RequestInit & { crudo?: boolean } = {}): Promise<T> {
    const cabeceras: Record<string, string> = {
      Accept: opciones.crudo ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.token) cabeceras.Authorization = `Bearer ${this.token}`;
    if (opciones.body) cabeceras['Content-Type'] = 'application/json';
    const url = ruta.startsWith('http') ? ruta : `https://api.github.com${ruta}`;
    const r = await fetch(url, { ...opciones, headers: { ...cabeceras, ...(opciones.headers as object) }, cache: 'no-store' });
    const cad = r.headers.get('github-authentication-token-expiration');
    if (cad) this.caducidad = cad;
    if (!r.ok) {
      let detalle = r.statusText;
      try {
        detalle = ((await r.json()) as { message?: string }).message ?? detalle;
      } catch {
        /* sin cuerpo */
      }
      throw new ErrorGitHub(r.status, traducir(r.status, detalle));
    }
    if (r.status === 204) return undefined as T;
    return (opciones.crudo ? await r.text() : await r.json()) as T;
  }

  r = (sub = '') => `/repos/${this.repo}${sub}`;

  usuario = () => this.pedir<{ login: string; name: string | null; avatar_url: string }>('/user');
  repositorio = () =>
    this.pedir<{ private: boolean; default_branch: string; permissions?: { push: boolean; admin: boolean } }>(this.r());

  cabeza = async (rama: string) => (await this.pedir<{ object: { sha: string } }>(this.r(`/git/ref/heads/${rama}`))).object.sha;

  arbol = (sha: string) =>
    this.pedir<{ tree: { path: string; type: string; sha: string; size?: number }[]; truncated: boolean }>(
      this.r(`/git/trees/${sha}?recursive=1`),
    );

  async blobTexto(sha: string): Promise<string> {
    const b = await this.pedir<{ content: string }>(this.r(`/git/blobs/${sha}`));
    return base64ATexto(b.content);
  }

  async blobBase64(sha: string): Promise<string> {
    return (await this.pedir<{ content: string }>(this.r(`/git/blobs/${sha}`))).content.replace(/\n/g, '');
  }

  /** Contenido de un archivo en una versión concreta (o null si no existía). */
  async archivoEn(ruta: string, ref: string): Promise<{ sha: string; base64: string } | null> {
    try {
      const a = await this.pedir<{ sha: string; content?: string; encoding?: string }>(
        this.r(`/contents/${ruta.split('/').map(encodeURIComponent).join('/')}?ref=${ref}`),
      );
      const base64 = a.content && a.encoding === 'base64' ? a.content.replace(/\n/g, '') : await this.blobBase64(a.sha);
      return { sha: a.sha, base64 };
    } catch (e) {
      if (e instanceof ErrorGitHub && e.estado === 404) return null;
      throw e;
    }
  }

  /**
   * Un único commit con todos los cambios (crear, modificar, borrar) sobre la
   * rama, construido con la API de bajo nivel de Git.
   */
  async commit(
    rama: string,
    base: string,
    cambios: { ruta: string; contenido?: string; binario?: boolean; borrar?: boolean }[],
    mensaje: string,
    opciones: { forzar?: boolean; crear?: boolean } = {},
  ): Promise<string> {
    const commitBase = await this.pedir<{ tree: { sha: string } }>(this.r(`/git/commits/${base}`));
    const entradas = await Promise.all(
      cambios.map(async (c) => {
        if (c.borrar) return { path: c.ruta, mode: '100644', type: 'blob', sha: null };
        const blob = await this.pedir<{ sha: string }>(this.r('/git/blobs'), {
          method: 'POST',
          body: JSON.stringify({ content: c.contenido ?? '', encoding: c.binario ? 'base64' : 'utf-8' }),
        });
        return { path: c.ruta, mode: '100644', type: 'blob', sha: blob.sha };
      }),
    );
    const arbol = await this.pedir<{ sha: string }>(this.r('/git/trees'), {
      method: 'POST',
      body: JSON.stringify({ base_tree: commitBase.tree.sha, tree: entradas }),
    });
    const nuevo = await this.pedir<{ sha: string }>(this.r('/git/commits'), {
      method: 'POST',
      body: JSON.stringify({ message: mensaje, tree: arbol.sha, parents: [base] }),
    });
    await this.moverRama(rama, nuevo.sha, opciones.forzar ?? false, opciones.crear ?? false);
    return nuevo.sha;
  }

  /** Apunta la rama al commit. Sin «forzar», GitHub lo rechaza si alguien publicó entretanto. */
  async moverRama(rama: string, sha: string, forzar = false, crear = false): Promise<void> {
    try {
      await this.pedir(this.r(`/git/refs/heads/${rama}`), { method: 'PATCH', body: JSON.stringify({ sha, force: forzar }) });
    } catch (e) {
      if (!(crear && e instanceof ErrorGitHub && (e.estado === 422 || e.estado === 404))) throw e;
      await this.pedir(this.r('/git/refs'), { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${rama}`, sha }) });
    }
  }

  /** Borra una rama (si existe). */
  async borrarRama(rama: string): Promise<void> {
    try {
      await this.pedir(this.r(`/git/refs/heads/${rama}`), { method: 'DELETE' });
    } catch (e) {
      if (!(e instanceof ErrorGitHub && (e.estado === 404 || e.estado === 422))) throw e;
    }
  }

  /** Archivos que han cambiado entre dos versiones. */
  async comparar(base: string, cabeza: string): Promise<string[]> {
    if (base === cabeza) return [];
    const c = await this.pedir<{ files?: { filename: string }[] }>(this.r(`/compare/${base}...${cabeza}`));
    return (c.files ?? []).map((f) => f.filename);
  }
}

function traducir(estado: number, detalle: string): string {
  if (estado === 401) return 'El acceso ha caducado o no es válido. Vuelve a entrar con un token nuevo.';
  if (estado === 403 && /rate limit/i.test(detalle)) return 'GitHub nos pide esperar unos minutos (límite de peticiones).';
  if (estado === 403) return 'Tu acceso no tiene permiso para esto. Revisa que el token tenga «Contents: Read and write».';
  if (estado === 404) return 'No encontramos el repositorio o el archivo. ¿Tiene el token acceso a este repositorio?';
  if (estado === 409 || estado === 422) return `GitHub ha rechazado el cambio: ${detalle}`;
  return `Error de GitHub (${estado}): ${detalle}`;
}
