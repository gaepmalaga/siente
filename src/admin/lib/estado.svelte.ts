// Estado global del panel (Svelte 5). Todo lo que se edita queda como «cambio
// pendiente» hasta que se pulsa Publicar: entonces sale en un único commit.
import { BackendDemo, BackendGitHub, Conflicto, RUTAS, type Backend } from './backend';
import { ErrorGitHub } from './github';
import { leerMd } from './frontmatter';
import { Negocio, Portada, Enlaces, Resenas, Articulo, Servicio } from '../../lib/esquemas';
import type { Cambio, ConfigPanel, EstadoDespliegue, Medio, Usuario } from './tipos';

type Fase = 'acceso' | 'cargando' | 'listo';
type Aviso = { id: number; tipo: 'ok' | 'error' | 'info'; texto: string; accion?: { texto: string; fn: () => void } };

const CLAVE_TOKEN = 'siente-panel-token';

class Estado {
  config = $state<ConfigPanel>({ repo: '', rama: 'main', sitio: '/', base: '/', demoUrl: '', authUrl: '' });
  fase = $state<Fase>('acceso');
  errorAcceso = $state('');
  modo = $state<'github' | 'demo'>('github');
  usuario = $state<Usuario | null>(null);
  cabeza = $state('');
  privado = $state(false);
  puedeAdministrar = $state(false);

  originales = $state<Record<string, string>>({});
  medios = $state<Medio[]>([]);
  pendientes = $state<Record<string, Cambio>>({});
  /** Sube cuando se descartan cambios: las vistas vuelven a leer los datos. */
  revision = $state(0);

  despliegue = $state<EstadoDespliegue | null>(null);
  publicando = $state(false);
  conflicto = $state<string[] | null>(null);

  avisos = $state<Aviso[]>([]);
  bandejaAbierta = $state(false);
  paletaAbierta = $state(false);
  menuAbierto = $state(false);
  ruta = $state('/');

  backend: Backend | null = null;
  private sondeo: ReturnType<typeof setTimeout> | null = null;

  numPendientes = $derived(Object.keys(this.pendientes).length);

  // ── Arranque y acceso ────────────────────────────────────────────────────

  async iniciar(config: ConfigPanel) {
    this.config = config;
    this.ruta = location.hash.slice(1) || '/';
    addEventListener('hashchange', () => {
      this.ruta = location.hash.slice(1) || '/';
      this.menuAbierto = false;
      document.querySelector('.p-contenido')?.scrollTo({ top: 0 });
    });
    addEventListener('beforeunload', (e) => {
      if (this.numPendientes && this.modo === 'github') e.preventDefault();
    });
    if (new URLSearchParams(location.search).has('demo')) return this.entrarDemo();
    const token = leerToken();
    if (token) await this.conectar(token, true, false);
  }

  async conectar(token: string, recordar: boolean, guardar = true) {
    this.modo = 'github';
    this.backend = new BackendGitHub(token.trim(), this.config);
    const ok = await this.cargar();
    if (ok && guardar) guardarToken(token.trim(), recordar);
    if (!ok) borrarToken();
  }

  async entrarDemo() {
    this.modo = 'demo';
    this.backend = new BackendDemo(this.config);
    await this.cargar();
  }

  salir() {
    borrarToken();
    this.backend = null;
    this.usuario = null;
    this.originales = {};
    this.medios = [];
    this.pendientes = {};
    this.fase = 'acceso';
    if (this.sondeo) clearTimeout(this.sondeo);
    history.replaceState(null, '', location.pathname);
  }

  private async cargar(): Promise<boolean> {
    this.fase = 'cargando';
    this.errorAcceso = '';
    try {
      const c = await this.backend!.cargar();
      this.usuario = c.usuario;
      this.cabeza = c.cabeza;
      this.privado = c.privado;
      this.puedeAdministrar = c.puedeAdministrar;
      this.originales = Object.fromEntries(Object.entries(c.textos).map(([r, a]) => [r, a.texto ?? '']));
      this.medios = c.medios;
      this.recuperarPendientes();
      this.fase = 'listo';
      this.vigilarUltimoDespliegue();
      return true;
    } catch (e) {
      this.fase = 'acceso';
      this.errorAcceso = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  // ── Lectura y edición ────────────────────────────────────────────────────

  texto(ruta: string): string | undefined {
    const p = this.pendientes[ruta];
    if (p) return p.tipo === 'borrar' ? undefined : p.contenido;
    return this.originales[ruta];
  }

  json<T>(ruta: string): T {
    return JSON.parse(this.texto(ruta) ?? 'null') as T;
  }

  /** Rutas de una carpeta (incluidos los archivos nuevos sin publicar). */
  rutas(prefijo: string): string[] {
    const todas = new Set([...Object.keys(this.originales), ...Object.keys(this.pendientes)]);
    return [...todas].filter((r) => r.startsWith(prefijo) && this.texto(r) !== undefined).sort();
  }

  fijarTexto(ruta: string, texto: string, descripcion: string) {
    const actual = this.pendientes[ruta];
    // Sin cambios reales no tocamos nada (evita bucles en las vistas que guardan al editar).
    if (actual && actual.contenido === texto && actual.descripcion === descripcion && actual.tipo !== 'borrar') return;
    if (this.originales[ruta] === texto) {
      if (!actual) return;
      delete this.pendientes[ruta];
    } else {
      this.pendientes[ruta] = { ruta, tipo: ruta in this.originales ? 'modificar' : 'crear', contenido: texto, descripcion };
    }
    this.guardarPendientes();
  }

  fijarJson(ruta: string, valor: unknown, descripcion: string) {
    this.fijarTexto(ruta, `${JSON.stringify(valor, null, 2)}\n`, descripcion);
  }

  borrar(ruta: string, descripcion: string) {
    if (ruta in this.originales) this.pendientes[ruta] = { ruta, tipo: 'borrar', descripcion };
    else delete this.pendientes[ruta];
    if (this.medios.some((m) => m.ruta === ruta && m.pendiente)) this.medios = this.medios.filter((m) => m.ruta !== ruta);
    this.guardarPendientes();
  }

  subirMedio(ruta: string, base64: string, vistaPrevia: string, tamano: number) {
    this.pendientes[ruta] = { ruta, tipo: 'crear', contenido: base64, binario: true, descripcion: `Nueva foto ${ruta.split('/').pop()}`, vistaPrevia };
    this.medios = [{ ruta, sha: '', tamano, url: vistaPrevia, pendiente: true }, ...this.medios.filter((m) => m.ruta !== ruta)];
  }

  descartar(ruta: string) {
    const p = this.pendientes[ruta];
    delete this.pendientes[ruta];
    if (p?.binario) this.medios = this.medios.filter((m) => m.ruta !== ruta || !m.pendiente);
    this.revision++;
    this.guardarPendientes();
  }

  descartarTodo() {
    this.medios = this.medios.filter((m) => !m.pendiente);
    this.pendientes = {};
    this.revision++;
    this.guardarPendientes();
  }

  // ── Validación ───────────────────────────────────────────────────────────

  validar(): { ruta: string; errores: string[] }[] {
    const resultado: { ruta: string; errores: string[] }[] = [];
    for (const c of Object.values(this.pendientes)) {
      if (c.tipo === 'borrar' || c.binario) continue;
      let r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } | null = null;
      try {
        if (c.ruta === RUTAS.negocio) r = Negocio.safeParse(JSON.parse(c.contenido!));
        else if (c.ruta === RUTAS.portada) r = Portada.safeParse(JSON.parse(c.contenido!));
        else if (c.ruta === RUTAS.enlaces) r = Enlaces.safeParse(JSON.parse(c.contenido!));
        else if (c.ruta === RUTAS.resenas) r = Resenas.safeParse(JSON.parse(c.contenido!));
        else if (c.ruta.startsWith(RUTAS.blog)) r = Articulo.safeParse(leerMd(c.contenido!).datos);
        else if (c.ruta.startsWith(RUTAS.servicios)) r = Servicio.safeParse(leerMd(c.contenido!).datos);
      } catch (e) {
        resultado.push({ ruta: c.ruta, errores: [`El archivo no se puede leer: ${(e as Error).message}`] });
        continue;
      }
      if (r && !r.success) {
        resultado.push({ ruta: c.ruta, errores: r.error!.issues.map((i) => `${i.path.map(String).join(' › ') || 'General'}: ${i.message}`) });
      }
    }
    return resultado;
  }

  // ── Publicar ─────────────────────────────────────────────────────────────

  async publicar(mensajeUsuario: string, forzar = false): Promise<boolean> {
    if (!this.backend || this.publicando || !this.numPendientes) return false;
    const errores = this.validar();
    if (errores.length) {
      this.aviso('Hay datos que corregir antes de publicar.', 'error');
      return false;
    }
    this.publicando = true;
    this.conflicto = null;
    const cambios = Object.values(this.pendientes).map((c) => ({ ...c }));
    const resumen = cambios.map((c) => `- ${c.descripcion}`).join('\n');
    const titulo = mensajeUsuario.trim() || resumirCambios(cambios);
    const mensaje = `${titulo}\n\n${resumen}\n\nPublicado desde el panel de Siente.`;
    try {
      const sha = await this.backend.publicar(cambios, mensaje, this.cabeza, forzar);
      for (const c of cambios) {
        if (c.binario) continue;
        if (c.tipo === 'borrar') delete this.originales[c.ruta];
        else this.originales[c.ruta] = c.contenido ?? '';
      }
      this.medios = this.medios
        .filter((m) => !cambios.some((c) => c.tipo === 'borrar' && c.ruta === m.ruta))
        .map((m) => (m.pendiente ? { ...m, pendiente: false, sha } : m));
      this.cabeza = sha;
      this.pendientes = {};
      this.guardarPendientes();
      this.bandejaAbierta = false;
      this.aviso('Cambios guardados. Publicando en la web…', 'ok');
      this.seguirDespliegue(sha);
      return true;
    } catch (e) {
      if (e instanceof Conflicto) {
        this.conflicto = e.rutas;
      } else {
        this.aviso(e instanceof Error ? e.message : String(e), 'error');
        if (e instanceof ErrorGitHub && e.estado === 401) this.salir();
      }
      return false;
    } finally {
      this.publicando = false;
    }
  }

  // ── Despliegue (GitHub Actions) ──────────────────────────────────────────

  private async vigilarUltimoDespliegue() {
    try {
      const [ultimo] = await this.backend!.despliegues();
      this.despliegue = ultimo ?? null;
      if (ultimo && (ultimo.estado === 'en_curso' || ultimo.estado === 'en_cola')) this.sondear(ultimo.id);
    } catch {
      this.despliegue = null;
    }
  }

  private seguirDespliegue(sha: string, intento = 0) {
    if (this.sondeo) clearTimeout(this.sondeo);
    this.despliegue = { id: 0, estado: 'en_cola', sha, mensaje: '', inicio: new Date().toISOString(), url: '' };
    const buscar = async () => {
      try {
        const lista = await this.backend!.despliegues();
        const run = lista.find((d) => d.sha === sha);
        if (run) return this.sondear(run.id);
      } catch {
        /* lo intentamos de nuevo */
      }
      if (intento++ < 40) this.sondeo = setTimeout(buscar, 3000);
    };
    this.sondeo = setTimeout(buscar, this.modo === 'demo' ? 300 : 4000);
  }

  private sondear(id: number) {
    const paso = async () => {
      try {
        const d = await this.backend!.despliegue(id);
        const antes = this.despliegue?.estado;
        this.despliegue = d;
        if (d.estado === 'ok' && antes !== 'ok') {
          this.aviso('¡Publicado! Los cambios ya están en la web.', 'ok', { texto: 'Ver la web', fn: () => open(this.config.sitio, '_blank') });
          return;
        }
        if (d.estado === 'error') {
          this.aviso('La publicación ha fallado. Revisa el historial: puedes deshacer el último cambio.', 'error');
          return;
        }
        if (d.estado === 'cancelado') return;
      } catch {
        /* reintento */
      }
      this.sondeo = setTimeout(paso, this.modo === 'demo' ? 700 : 3000);
    };
    paso();
  }

  // ── Pendientes guardados en el navegador ─────────────────────────────────

  private get clavePendientes() {
    return `siente-panel-pendientes:${this.config.repo}:${this.modo}`;
  }

  private guardarPendientes() {
    try {
      const texto = Object.values(this.pendientes).filter((c) => !c.binario);
      if (texto.length) localStorage.setItem(this.clavePendientes, JSON.stringify(texto));
      else localStorage.removeItem(this.clavePendientes);
    } catch {
      /* sin almacenamiento */
    }
  }

  private recuperarPendientes() {
    try {
      const guardados = JSON.parse(localStorage.getItem(this.clavePendientes) ?? '[]') as Cambio[];
      const validos = guardados.filter((c) => c.tipo === 'borrar' || this.originales[c.ruta] !== c.contenido);
      if (validos.length) {
        this.pendientes = Object.fromEntries(validos.map((c) => [c.ruta, c]));
        this.aviso(`Hemos recuperado ${validos.length === 1 ? '1 cambio' : `${validos.length} cambios`} sin publicar.`, 'info', {
          texto: 'Revisar',
          fn: () => (this.bandejaAbierta = true),
        });
      }
    } catch {
      /* nada que recuperar */
    }
  }

  // ── Avisos emergentes ────────────────────────────────────────────────────

  aviso(texto: string, tipo: Aviso['tipo'] = 'info', accion?: Aviso['accion']) {
    const id = Date.now() + Math.random();
    this.avisos = [...this.avisos, { id, tipo, texto, accion }];
    setTimeout(() => (this.avisos = this.avisos.filter((a) => a.id !== id)), tipo === 'error' ? 9000 : 5500);
  }

  ir(ruta: string) {
    location.hash = ruta;
  }
}

function resumirCambios(cambios: Cambio[]): string {
  const zonas = new Set(
    cambios.map((c) =>
      c.ruta === RUTAS.negocio
        ? 'datos del centro'
        : c.ruta === RUTAS.portada
          ? 'portada'
          : c.ruta === RUTAS.enlaces
            ? 'página de enlaces'
            : c.ruta === RUTAS.resenas
              ? 'reseñas'
              : c.ruta.startsWith(RUTAS.blog)
                ? 'blog'
                : c.ruta.startsWith(RUTAS.servicios)
                  ? 'servicios'
                  : 'fotos',
    ),
  );
  return `Panel: ${[...zonas].join(', ')}`;
}

function leerToken(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_TOKEN) ?? localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

function guardarToken(token: string, recordar: boolean) {
  try {
    (recordar ? localStorage : sessionStorage).setItem(CLAVE_TOKEN, token);
  } catch {
    /* sin almacenamiento: habrá que volver a entrar */
  }
}

function borrarToken() {
  try {
    localStorage.removeItem(CLAVE_TOKEN);
    sessionStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* nada */
  }
}

export const estado = new Estado();
