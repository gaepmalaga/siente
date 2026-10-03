// Consentimiento de cookies + Google Analytics 4 + eventos de los botones
// importantes (WhatsApp, llamar, cita, cómo llegar…).
// Nada de esto se ejecuta si no hay un ID de Analytics configurado.

type Consentimiento = { analitica: boolean; fecha: number; version: 1 };
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    sienteEvento?: (nombre: string, parametros?: Record<string, unknown>) => void;
  }
}

const CLAVE = 'siente-consentimiento';
const VIGENCIA = 365 * 86_400_000; // se vuelve a preguntar al año

function leer(): Consentimiento | null {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Consentimiento | null;
    if (!valor || Date.now() - valor.fecha > VIGENCIA) return null;
    return valor;
  } catch {
    return null;
  }
}

function guardar(analitica: boolean) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ analitica, fecha: Date.now(), version: 1 }));
  } catch {
    /* modo privado: se volverá a preguntar */
  }
}

function cargarAnalytics(id: string) {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', id);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

function borrarCookiesAnalytics() {
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  const partes = location.hostname.split('.');
  const dominios = partes.map((_, i) => partes.slice(i).join('.')).filter((d) => d.includes('.'));
  for (const c of document.cookie.split(';')) {
    const nombre = c.split('=')[0].trim();
    if (!nombre.startsWith('_ga')) continue;
    for (const d of ['', ...dominios]) {
      document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
    }
  }
}

// ── Eventos ─────────────────────────────────────────────────────────────────

export function evento(nombre: string, parametros: Record<string, unknown> = {}) {
  window.gtag?.('event', nombre, parametros);
}

function clasificar(enlace: HTMLAnchorElement): string | null {
  const href = enlace.getAttribute('href') ?? '';
  if (href.startsWith('https://wa.me/?')) return 'compartir_whatsapp';
  if (href.startsWith('https://wa.me')) return 'clic_whatsapp';
  if (href.startsWith('tel:')) return 'clic_llamar';
  if (href.startsWith('mailto:')) return 'clic_email';
  if (/maps\.google|google\.[a-z.]+\/maps|maps\.apple|waze\.com/.test(href)) return 'clic_como_llegar';
  if (href.endsWith('.vcf')) return 'guardar_contacto';
  if (href.includes('/pedir-cita/')) return 'clic_pedir_cita';
  if (enlace.closest('[data-zona="bio-instagram"]')) return 'clic_enlace_bio';
  return null;
}

function escucharClics() {
  document.addEventListener(
    'click',
    (e) => {
      if (!window.gtag) return;
      const enlace = (e.target as Element | null)?.closest?.('a');
      if (!enlace) return;
      const nombre = clasificar(enlace);
      if (!nombre) return;
      evento(nombre, {
        zona: enlace.closest<HTMLElement>('[data-zona]')?.dataset.zona ?? 'contenido',
        texto: (enlace.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
        pagina: location.pathname,
      });
    },
    { capture: true },
  );
}

// ── Aviso ───────────────────────────────────────────────────────────────────

export function iniciarCookies() {
  window.sienteEvento = evento;
  const aviso = document.querySelector<HTMLElement>('[data-cookies]');
  if (!aviso) return;
  const id = aviso.dataset.ga ?? '';
  // Al cargar la página no se roba el foco; solo al reabrirlo a propósito.
  const mostrar = (enfocar = false) => {
    aviso.hidden = false;
    if (enfocar) aviso.querySelector<HTMLButtonElement>('[data-cookies-rechazar]')?.focus();
  };

  const decision = leer();
  if (decision?.analitica) cargarAnalytics(id);
  if (!decision) mostrar();

  aviso.querySelector('[data-cookies-aceptar]')?.addEventListener('click', () => {
    guardar(true);
    aviso.hidden = true;
    cargarAnalytics(id);
  });
  aviso.querySelector('[data-cookies-rechazar]')?.addEventListener('click', () => {
    guardar(false);
    aviso.hidden = true;
    borrarCookiesAnalytics();
  });
  document.querySelectorAll('[data-abrir-cookies]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.preventDefault();
      mostrar(true);
    }),
  );
  escucharClics();
}
