// Estado global del panel (Svelte 5). Todo lo que se edita queda como «cambio
// pendiente» hasta que se pulsa Publicar: entonces sale en un único commit.
import { BackendDemo, BackendGitHub, Conflicto, RUTAS, type Backend } from './backend';
import { ErrorGitHub } from './github';
import { leerMd } from './frontmatter';
import { MARCA_COMPLETAR } from './seo';
import { base64ATexto } from './texto';
import { Negocio, Portada, Enlaces, Resenas, Articulo, Servicio } from '../../lib/esquemas';
import type { Cambio, ConfigPanel, ErrorRegistrado, EstadoDespliegue, Medio, Usuario, VistaPrevia } from './tipos';

type Fase = 'acceso' | 'cargando' | 'listo';
type Aviso = { id: number; tipo: 'ok' | 'error' | 'info'; texto: string; accion?: { texto: string; fn: () => void } };

const CLAVE_TOKEN = 'siente-panel-token';
const CLAVE_ERRORES = 'siente-panel-errores';
const ARCHIVOS_GESTIONABLES = (r: string) =>
  r.startsWith('src/data/') || r.startsWith(RUTAS.blog) || r.startsWith(RUTAS.servicios) || r.startsWith(RUTAS.uploads) || r.startsWith(RUTAS.fotos);

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
  previa = $state<VistaPrevia | null>(null);
  /** Últimos errores inesperados (para el informe técnico de Accesos). */
  errores = $state<ErrorRegistrado[]>(leerErrores());

  avisos = $state<Aviso[]>([]);
  bandejaAbierta = $state(false);
  paletaAbierta = $state(false);
  menuAbierto = $state(false);
  ruta = $state('/');

  backend: Backend | null = null;
  private sondeo: ReturnType<typeof setTimeout> | null = null;
  private sondeoPrevia: ReturnType<typeof setTimeout> | null = null;

  numPendientes = $derived(Object.keys(this.pendientes).length);
  /** Huella de los cambios pendientes: si cambia, la vista previa ha quedado atrás. */
  firmaPendientes = $derived(firma(Object.values(this.pendientes)));
  previaAlDia = $derived(!!this.previa && this.previa.firma === this.firmaPendientes);

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
    // Cualquier fallo inesperado queda registrado y se avisa sin romper el panel.
    addEventListener('error', (e) => this.registrarError(e.error ?? e.message, 'página'));
    addEventListener('unhandledrejection', (e) => this.registrarError(e.reason, 'operación'));
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

  subirMedio(ruta: string, base64: string, vistaPrevia: string, tamano: number, deshacer = false) {
    const existia = this.medios.some((m) => m.ruta === ruta && !m.pendiente);
    const nombre = ruta.split('/').pop();
    const descripcion = deshacer ? `Deshacer: recuperar ${nombre}` : existia ? `Foto ${nombre} retocada` : `Nueva foto ${nombre}`;
    this.pendientes[ruta] = { ruta, tipo: existia ? 'modificar' : 'crear', contenido: base64, binario: true, descripcion, vistaPrevia };
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
      const errores: string[] = [];
      if (r && !r.success) errores.push(...r.error!.issues.map((i) => `${i.path.map(String).join(' › ') || 'General'}: ${i.message}`));
      if (c.ruta.endsWith('.md') && c.contenido?.includes(MARCA_COMPLETAR))
        errores.push(`Quedan textos de ejemplo por completar: busca «${MARCA_COMPLETAR}» en el texto.`);
      if (errores.length) resultado.push({ ruta: c.ruta, errores });
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
      const [ultimo] = (await this.backend!.despliegues()).filter((d) => !d.esPrevia);
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
        const run = lista.find((d) => d.sha === sha && !d.esPrevia);
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
        // Si seguimos una compilación de vista previa que releva a una publicación, mantenemos el mensaje.
        this.despliegue = d.esPrevia && this.despliegue ? { ...d, esPrevia: false, mensaje: this.despliegue.mensaje } : d;
        if (d.estado === 'ok' && antes !== 'ok') {
          this.aviso('¡Publicado! Los cambios ya están en la web.', 'ok', { texto: 'Ver la web', fn: () => open(this.config.sitio, '_blank') });
          return;
        }
        if (d.estado === 'error') {
          const paso = d.pasos?.find((p) => p.estado === 'error')?.nombre;
          this.aviso(`La publicación ha fallado${paso ? ` en «${paso}»` : ''}. La web sigue como estaba.`, 'error', {
            texto: 'Deshacer el cambio',
            fn: () => this.prepararDeshacer(d.sha, d.mensaje),
          });
          return;
        }
        if (d.estado === 'cancelado') {
          // Otra publicación (o una vista previa) la ha relevado: seguimos a esa,
          // que compila la última versión e incluye estos cambios.
          const siguiente = (await this.backend!.despliegues()).find((x) => x.inicio > d.inicio);
          if (siguiente) {
            this.despliegue = { ...siguiente, esPrevia: false, mensaje: d.mensaje };
            return this.sondear(siguiente.id);
          }
          return;
        }
      } catch {
        /* reintento */
      }
      this.sondeo = setTimeout(paso, this.modo === 'demo' ? 700 : 3000);
    };
    paso();
  }

  // ── Vista previa ─────────────────────────────────────────────────────────

  /** Dirección de una página en la copia de vista previa. */
  urlPrevia(ruta = '/') {
    const sitio = this.config.sitio.replace(/\/$/, '');
    return this.modo === 'demo' ? `${sitio}${ruta}` : `${sitio}/vista-previa${ruta}`;
  }

  /**
   * Prepara una copia de la web con los cambios sin publicar (en /vista-previa/).
   * La compila GitHub Actions igual que la web real, así que es exacta.
   */
  async vistaPrevia(ruta = '/') {
    if (!this.backend) return;
    if (!this.numPendientes) return void open(`${this.config.sitio.replace(/\/$/, '')}${ruta}`, '_blank');
    if (this.previa && this.previaAlDia && this.previa.estado !== 'error') {
      this.previa.ruta = ruta;
      if (this.previa.estado === 'lista') open(this.urlPrevia(ruta), '_blank');
      return;
    }
    const errores = this.validar();
    if (errores.length) {
      this.aviso('Corrige los datos marcados antes de ver la vista previa.', 'error');
      this.bandejaAbierta = true;
      return;
    }
    const cambios = Object.values(this.pendientes).map((c) => ({ ...c }));
    this.previa = { estado: 'preparando', sha: '', inicio: Date.now(), ruta, firma: this.firmaPendientes };
    try {
      const sha = await this.backend.vistaPrevia(cambios);
      if (this.previa) this.previa.sha = sha;
      this.esperarVistaPrevia(sha);
    } catch (e) {
      this.previa = { ...this.previa!, estado: 'error', mensaje: (e as Error).message };
      this.aviso((e as Error).message, 'error');
    }
  }

  private esperarVistaPrevia(sha: string) {
    if (this.sondeoPrevia) clearTimeout(this.sondeoPrevia);
    const inicio = Date.now();
    const lista = () => {
      if (!this.previa || this.previa.sha !== sha) return;
      this.previa.estado = 'lista';
      if (this.modo === 'demo') this.aviso('En la demostración se abre la web actual: en el panel real verás tus cambios.', 'info');
      this.aviso('La vista previa está lista.', 'ok', { texto: 'Abrir', fn: () => open(this.urlPrevia(this.previa?.ruta), '_blank') });
    };
    const paso = async () => {
      if (!this.previa || this.previa.sha !== sha) return;
      if (this.backend instanceof BackendDemo) {
        if (this.backend.previaLista()) return lista();
      } else {
        try {
          // La prueba definitiva: la copia publicada dice qué versión contiene.
          const r = await fetch(`${this.urlPrevia('/version.txt')}?t=${Date.now()}`, { cache: 'no-store' });
          if (r.ok && (await r.text()).trim() === sha) return lista();
        } catch {
          /* aún no existe */
        }
        try {
          const run = (await this.backend!.despliegues()).find((d) => Date.parse(d.inicio) >= this.previa!.inicio - 15_000);
          if (run) this.previa.pasos = (await this.backend!.despliegue(run.id)).pasos;
          if (run?.estado === 'error') {
            this.previa = { ...this.previa, estado: 'error', mensaje: 'La compilación de la vista previa ha fallado.' };
            return;
          }
        } catch {
          /* seguimos esperando */
        }
      }
      if (Date.now() - inicio > 8 * 60_000) {
        this.previa = { ...this.previa, estado: 'error', mensaje: 'La vista previa está tardando demasiado. Inténtalo de nuevo en un rato.' };
        return;
      }
      this.sondeoPrevia = setTimeout(paso, this.modo === 'demo' ? 800 : 5000);
    };
    this.sondeoPrevia = setTimeout(paso, this.modo === 'demo' ? 800 : 8000);
  }

  // ── Deshacer ─────────────────────────────────────────────────────────────

  /** Deja como cambios pendientes la versión anterior de lo que tocó una publicación. */
  async prepararDeshacer(sha: string, mensaje: string): Promise<boolean> {
    if (!this.backend) return false;
    try {
      const detalle = await this.backend.detalle(sha);
      for (const f of detalle.archivos.filter((x) => ARCHIVOS_GESTIONABLES(x.ruta))) {
        if (f.estado === 'added') {
          this.borrar(f.ruta, `Deshacer: quitar ${f.ruta.split('/').pop()}`);
          continue;
        }
        const anterior = detalle.padre ? await this.backend.contenidoEn(f.ruta, detalle.padre) : null;
        if (anterior == null) continue;
        if (/\.(json|md)$/.test(f.ruta)) this.fijarTexto(f.ruta, base64ATexto(anterior), `Deshacer «${mensaje.split('\n')[0]}»`);
        else this.subirMedio(f.ruta, anterior, '', 0, true);
      }
      this.revision++;
      this.bandejaAbierta = true;
      this.aviso('Listo: revisa los cambios y pulsa Publicar para deshacerlo en la web.', 'info');
      return true;
    } catch (e) {
      this.aviso((e as Error).message, 'error');
      return false;
    }
  }

  // ── Errores inesperados ──────────────────────────────────────────────────

  private ultimoAvisoError = 0;

  registrarError(error: unknown, donde: string) {
    const mensaje = error instanceof Error ? error.message : String(error ?? 'Error desconocido');
    // Ruido del navegador o de extensiones: no es del panel.
    if (/ResizeObserver|^Script error|extension:\/\//i.test(mensaje)) return;
    const registro: ErrorRegistrado = {
      fecha: new Date().toISOString(),
      mensaje,
      donde,
      pila: error instanceof Error ? error.stack?.split('\n').slice(0, 6).join('\n') : undefined,
    };
    this.errores = [registro, ...this.errores].slice(0, 20);
    try {
      localStorage.setItem(CLAVE_ERRORES, JSON.stringify(this.errores));
    } catch {
      /* sin almacenamiento */
    }
    if (Date.now() - this.ultimoAvisoError > 10_000) {
      this.ultimoAvisoError = Date.now();
      this.aviso('Algo no ha salido bien. Tus cambios pendientes están a salvo.', 'error', { texto: 'Detalles', fn: () => this.ir('/accesos#diagnostico') });
    }
  }

  borrarErrores() {
    this.errores = [];
    try {
      localStorage.removeItem(CLAVE_ERRORES);
    } catch {
      /* nada */
    }
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

/** Huella rápida de una lista de cambios (no criptográfica). */
function firma(cambios: Cambio[]): string {
  let h = 2166136261;
  for (const c of [...cambios].sort((a, b) => a.ruta.localeCompare(b.ruta))) {
    const t = `${c.ruta}|${c.tipo}|${c.contenido ?? ''}`;
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  }
  return `${cambios.length}-${(h >>> 0).toString(36)}`;
}

function leerErrores(): ErrorRegistrado[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_ERRORES) ?? '[]') as ErrorRegistrado[];
  } catch {
    return [];
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
