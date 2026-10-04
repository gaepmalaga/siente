// Dos «backends» con la misma interfaz: GitHub (el real) y Demostración (todo
// en memoria, para enseñar el panel sin tocar la web).
import { GitHub, ErrorGitHub } from './github';
import type {
  Archivo,
  ArchivoCambiado,
  Cambio,
  Colaborador,
  ConfigPanel,
  EntradaHistorial,
  EstadoDespliegue,
  Medio,
  Usuario,
} from './tipos';

export const RUTAS = {
  negocio: 'src/data/negocio.json',
  portada: 'src/data/portada.json',
  enlaces: 'src/data/enlaces.json',
  resenas: 'src/data/resenas.json',
  blog: 'src/content/blog/',
  servicios: 'src/content/servicios/',
  uploads: 'public/uploads/',
  fotos: 'src/assets/fotos/',
} as const;

const esTexto = (r: string) => /^src\/data\/[^/]+\.json$/.test(r) || /^src\/content\/(blog|servicios)\/[^/]+\.md$/.test(r);
const esMedio = (r: string) => (r.startsWith(RUTAS.uploads) || r.startsWith(RUTAS.fotos)) && /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(r);

export type Carga = {
  usuario: Usuario;
  cabeza: string;
  textos: Record<string, Archivo>;
  medios: Medio[];
  privado: boolean;
  puedeAdministrar: boolean;
};

export class Conflicto extends Error {
  constructor(public rutas: string[]) {
    super('Alguien ha cambiado estos archivos mientras editabas.');
  }
}

export interface Backend {
  modo: 'github' | 'demo';
  cargar(): Promise<Carga>;
  publicar(cambios: Cambio[], mensaje: string, base: string, forzar?: boolean): Promise<string>;
  despliegues(): Promise<EstadoDespliegue[]>;
  despliegue(id: number): Promise<EstadoDespliegue>;
  historial(pagina: number): Promise<EntradaHistorial[]>;
  detalle(sha: string): Promise<{ archivos: ArchivoCambiado[]; padre: string | null }>;
  contenidoEn(ruta: string, ref: string): Promise<string | null>;
  colaboradores(): Promise<Colaborador[]>;
  urlMedio(ruta: string, ref: string): string;
}

// ── GitHub ─────────────────────────────────────────────────────────────────

const NOMBRE_WORKFLOW = '.github/workflows/deploy.yml';
const PASOS_VISIBLES = ['Descargar el repositorio', 'Instalar dependencias', 'Compilar la web', 'Empaquetar el sitio', 'Desplegar'];

type RunApi = {
  id: number;
  status: string;
  conclusion: string | null;
  head_sha: string;
  display_title: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  path?: string;
};

function aDespliegue(r: RunApi): EstadoDespliegue {
  const estado: EstadoDespliegue['estado'] =
    r.status === 'completed'
      ? r.conclusion === 'success'
        ? 'ok'
        : r.conclusion === 'cancelled' || r.conclusion === 'skipped'
          ? 'cancelado'
          : 'error'
      : r.status === 'in_progress'
        ? 'en_curso'
        : 'en_cola';
  return { id: r.id, estado, sha: r.head_sha, mensaje: r.display_title, inicio: r.created_at, fin: r.status === 'completed' ? r.updated_at : undefined, url: r.html_url };
}

export class BackendGitHub implements Backend {
  modo = 'github' as const;
  gh: GitHub;
  /** Cliente sin token para leer lo público si el token no tiene permiso. */
  publico: GitHub;
  privado = false;

  constructor(
    token: string,
    private config: ConfigPanel,
  ) {
    this.gh = new GitHub(token, config.repo);
    this.publico = new GitHub(null, config.repo);
  }

  async cargar(): Promise<Carga> {
    const [u, repo] = await Promise.all([this.gh.usuario(), this.gh.repositorio()]);
    if (!repo.permissions?.push) throw new ErrorGitHub(403, 'Tu cuenta puede ver el repositorio pero no modificarlo. Pide acceso de escritura.');
    this.privado = repo.private;
    const cabeza = await this.gh.cabeza(this.config.rama);
    const arbol = await this.gh.arbol(cabeza);
    const textos: Record<string, Archivo> = {};
    const pendientes = arbol.tree.filter((e) => e.type === 'blob' && esTexto(e.path));
    // Descargas en paralelo, de seis en seis.
    for (let i = 0; i < pendientes.length; i += 6) {
      await Promise.all(
        pendientes.slice(i, i + 6).map(async (e) => {
          textos[e.path] = { ruta: e.path, sha: e.sha, texto: await this.gh.blobTexto(e.sha) };
        }),
      );
    }
    const medios: Medio[] = arbol.tree
      .filter((e) => e.type === 'blob' && esMedio(e.path))
      .map((e) => ({ ruta: e.path, sha: e.sha, tamano: e.size ?? 0, url: this.urlMedio(e.path, cabeza) }));
    return {
      usuario: { login: u.login, nombre: u.name || u.login, avatar: u.avatar_url, caducidad: this.gh.caducidad },
      cabeza,
      textos,
      medios,
      privado: repo.private,
      puedeAdministrar: !!repo.permissions?.admin,
    };
  }

  async publicar(cambios: Cambio[], mensaje: string, base: string, forzar = false): Promise<string> {
    let padre = base;
    const remota = await this.gh.cabeza(this.config.rama);
    if (remota !== base) {
      // Alguien publicó mientras editábamos: solo es un problema si tocó lo mismo.
      const tocados = await this.gh.comparar(base, remota);
      const choques = cambios.map((c) => c.ruta).filter((r) => tocados.includes(r));
      if (choques.length && !forzar) throw new Conflicto(choques);
      padre = remota;
    }
    return this.gh.commit(
      this.config.rama,
      padre,
      cambios.map((c) => ({ ruta: c.ruta, contenido: c.contenido, binario: c.binario, borrar: c.tipo === 'borrar' })),
      mensaje,
    );
  }

  /** Lee con el token y, si no tiene permiso y el repositorio es público, sin él. */
  private async leer<T>(ruta: string): Promise<T> {
    try {
      return await this.gh.pedir<T>(ruta);
    } catch (e) {
      if (e instanceof ErrorGitHub && (e.estado === 403 || e.estado === 404) && !this.privado) return this.publico.pedir<T>(ruta);
      throw e;
    }
  }

  async despliegues(): Promise<EstadoDespliegue[]> {
    const r = await this.leer<{ workflow_runs: RunApi[] }>(this.gh.r(`/actions/runs?branch=${this.config.rama}&per_page=15`));
    return r.workflow_runs.filter((w) => !w.path || w.path === NOMBRE_WORKFLOW).map(aDespliegue);
  }

  async despliegue(id: number): Promise<EstadoDespliegue> {
    const [run, trabajos] = await Promise.all([
      this.leer<RunApi>(this.gh.r(`/actions/runs/${id}`)),
      this.leer<{ jobs: { steps?: { name: string; status: string; conclusion: string | null }[] }[] }>(
        this.gh.r(`/actions/runs/${id}/jobs`),
      ),
    ]);
    const pasos = trabajos.jobs
      .flatMap((j) => j.steps ?? [])
      .filter((p) => PASOS_VISIBLES.includes(p.name))
      .map((p) => ({
        nombre: p.name,
        estado: (p.status === 'completed'
          ? p.conclusion === 'success'
            ? 'ok'
            : p.conclusion === 'skipped'
              ? 'saltado'
              : 'error'
          : p.status === 'in_progress'
            ? 'en_curso'
            : 'pendiente') as NonNullable<EstadoDespliegue['pasos']>[number]['estado'],
      }));
    // Mientras el segundo trabajo no ha empezado, «Desplegar» aún no aparece.
    for (const nombre of PASOS_VISIBLES) if (!pasos.some((p) => p.nombre === nombre)) pasos.push({ nombre, estado: 'pendiente' });
    pasos.sort((a, b) => PASOS_VISIBLES.indexOf(a.nombre) - PASOS_VISIBLES.indexOf(b.nombre));
    return { ...aDespliegue(run), pasos };
  }

  async historial(pagina: number): Promise<EntradaHistorial[]> {
    const lista = await this.gh.pedir<
      { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } }; author: { login: string; avatar_url: string } | null }[]
    >(this.gh.r(`/commits?sha=${this.config.rama}&per_page=25&page=${pagina}`));
    return lista.map((c) => ({
      sha: c.sha,
      mensaje: c.commit.message,
      autor: c.author?.login ?? c.commit.author.name,
      avatar: c.author?.avatar_url,
      fecha: c.commit.author.date,
      url: c.html_url,
    }));
  }

  async detalle(sha: string) {
    const c = await this.gh.pedir<{
      parents: { sha: string }[];
      files?: { filename: string; status: string; patch?: string; additions: number; deletions: number }[];
    }>(this.gh.r(`/commits/${sha}`));
    return {
      padre: c.parents[0]?.sha ?? null,
      archivos: (c.files ?? []).map((f) => ({
        ruta: f.filename,
        estado: (['added', 'modified', 'removed', 'renamed'].includes(f.status) ? f.status : 'modified') as ArchivoCambiado['estado'],
        parche: f.patch,
        adiciones: f.additions,
        borrados: f.deletions,
      })),
    };
  }

  async contenidoEn(ruta: string, ref: string): Promise<string | null> {
    return (await this.gh.archivoEn(ruta, ref))?.base64 ?? null;
  }

  async colaboradores(): Promise<Colaborador[]> {
    const lista = await this.gh.pedir<{ login: string; avatar_url: string; role_name?: string }[]>(this.gh.r('/collaborators?per_page=50'));
    return lista.map((c) => ({ login: c.login, avatar: c.avatar_url, rol: c.role_name ?? 'write' }));
  }

  urlMedio(ruta: string, ref: string): string {
    return `https://raw.githubusercontent.com/${this.config.repo}/${ref}/${ruta.split('/').map(encodeURIComponent).join('/')}`;
  }
}

// ── Demostración ───────────────────────────────────────────────────────────

type DatosDemo = { textos: Record<string, string>; medios: { ruta: string; tamano: number }[] };

export class BackendDemo implements Backend {
  modo = 'demo' as const;
  private publicaciones: { sha: string; mensaje: string; fecha: string; cambios: Cambio[]; previos: Record<string, string | null> }[] = [];
  private textos: Record<string, string> = {};
  private inicioDespliegue = 0;

  constructor(private config: ConfigPanel) {}

  async cargar(): Promise<Carga> {
    const r = await fetch(this.config.demoUrl);
    const datos = (await r.json()) as DatosDemo;
    this.textos = { ...datos.textos };
    const textos: Record<string, Archivo> = {};
    for (const [ruta, texto] of Object.entries(datos.textos)) textos[ruta] = { ruta, sha: 'demo', texto };
    return {
      usuario: { login: 'demo', nombre: 'Modo demostración', avatar: '' },
      cabeza: 'demo-0',
      textos,
      medios: datos.medios.map((m) => ({ ruta: m.ruta, sha: 'demo', tamano: m.tamano, url: this.urlMedio(m.ruta, this.config.rama) })),
      privado: false,
      puedeAdministrar: true,
    };
  }

  async publicar(cambios: Cambio[], mensaje: string): Promise<string> {
    await new Promise((r) => setTimeout(r, 700));
    const previos: Record<string, string | null> = {};
    for (const c of cambios) {
      previos[c.ruta] = this.textos[c.ruta] ?? null;
      if (c.tipo === 'borrar') delete this.textos[c.ruta];
      else if (!c.binario) this.textos[c.ruta] = c.contenido ?? '';
    }
    const sha = `demo-${this.publicaciones.length + 1}`;
    this.publicaciones.unshift({ sha, mensaje, fecha: new Date().toISOString(), cambios, previos });
    this.inicioDespliegue = Date.now();
    return sha;
  }

  private simulado(): EstadoDespliegue | null {
    const ultima = this.publicaciones[0];
    if (!ultima) return null;
    const t = (Date.now() - this.inicioDespliegue) / 1000;
    const limites = [2, 5, 9, 11, 13];
    const pasos = ['Descargar el repositorio', 'Instalar dependencias', 'Compilar la web', 'Empaquetar el sitio', 'Desplegar'].map((nombre, i) => ({
      nombre,
      estado: (t >= limites[i] ? 'ok' : t >= (limites[i - 1] ?? 0) ? 'en_curso' : 'pendiente') as 'ok' | 'en_curso' | 'pendiente',
    }));
    const listo = t >= 13;
    return {
      id: this.publicaciones.length,
      estado: listo ? 'ok' : 'en_curso',
      sha: ultima.sha,
      mensaje: ultima.mensaje.split('\n')[0],
      inicio: new Date(this.inicioDespliegue).toISOString(),
      fin: listo ? new Date(this.inicioDespliegue + 13_000).toISOString() : undefined,
      url: '#',
      pasos,
    };
  }

  async despliegues() {
    const d = this.simulado();
    return d ? [d] : [];
  }

  async despliegue() {
    return this.simulado()!;
  }

  async historial(): Promise<EntradaHistorial[]> {
    return [
      ...this.publicaciones.map((p) => ({ sha: p.sha, mensaje: p.mensaje, autor: 'demo', fecha: p.fecha, url: '#' })),
      { sha: 'demo-0', mensaje: 'Versión publicada actualmente', autor: 'gaepmalaga', fecha: new Date(Date.now() - 86_400_000).toISOString(), url: '#' },
    ];
  }

  async detalle(sha: string) {
    const p = this.publicaciones.find((x) => x.sha === sha);
    if (!p) return { padre: null, archivos: [] };
    const i = this.publicaciones.indexOf(p);
    return {
      padre: this.publicaciones[i + 1]?.sha ?? 'demo-0',
      archivos: p.cambios.map((c) => ({
        ruta: c.ruta,
        estado: (c.tipo === 'crear' ? 'added' : c.tipo === 'borrar' ? 'removed' : 'modified') as ArchivoCambiado['estado'],
        adiciones: 0,
        borrados: 0,
      })),
    };
  }

  async contenidoEn(ruta: string, ref: string): Promise<string | null> {
    // Versión anterior de un archivo tocado en una publicación de esta sesión.
    const p = this.publicaciones.find((x) => this.publicaciones.indexOf(x) >= 0 && x.sha !== ref && ruta in x.previos);
    const previo = p?.previos[ruta];
    if (previo == null) return null;
    return btoa(String.fromCharCode(...new TextEncoder().encode(previo)));
  }

  async colaboradores(): Promise<Colaborador[]> {
    return [{ login: 'gaepmalaga', avatar: '', rol: 'admin' }];
  }

  urlMedio(ruta: string, _ref?: string): string {
    if (ruta.startsWith('public/')) return `${this.config.base}${ruta.slice('public/'.length)}`;
    return `https://raw.githubusercontent.com/${this.config.repo}/${this.config.rama}/${ruta}`;
  }
}
