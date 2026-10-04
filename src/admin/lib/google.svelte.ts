// Conexión con Google Analytics y Search Console directamente desde el
// navegador (Google Identity Services). Solo se piden permisos de lectura y el
// acceso dura una hora; no se guarda nada en ningún servidor.
import { estado } from './estado.svelte';
import { RUTAS } from './backend';
import type { DatosNegocio } from '../../lib/esquemas';

const ALCANCES = ['https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/webmasters.readonly'].join(' ');
const CLAVE_SESION = 'siente-panel-google';
const CLAVE_CACHE = 'siente-panel-google-cache:';
const CACHE_MS = 15 * 60_000;

type ClienteToken = { requestAccessToken: (o?: { prompt?: string }) => void };
type GIS = {
  accounts: {
    oauth2: {
      initTokenClient: (o: {
        client_id: string;
        scope: string;
        callback: (r: { access_token?: string; expires_in?: number; error?: string; error_description?: string; scope?: string }) => void;
        error_callback?: (e: { type: string; message?: string }) => void;
      }) => ClienteToken;
      revoke: (token: string, fn?: () => void) => void;
    };
  };
};

export class ErrorGoogle extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

let gis: Promise<GIS> | null = null;
function cargarGis(): Promise<GIS> {
  gis ??= new Promise((ok, mal) => {
    const w = window as unknown as { google?: GIS };
    if (w.google?.accounts?.oauth2) return ok(w.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (w.google ? ok(w.google) : mal(new Error('No se ha podido cargar el acceso de Google.')));
    s.onerror = () => {
      gis = null;
      mal(new Error('No se ha podido cargar el acceso de Google. ¿Hay conexión a internet?'));
    };
    document.head.append(s);
  });
  return gis;
}

class ConexionGoogle {
  token = $state<string | null>(null);
  caduca = $state(0);
  conectando = $state(false);
  error = $state('');

  constructor() {
    try {
      const g = JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? 'null') as { token: string; caduca: number } | null;
      if (g && g.caduca > Date.now() + 60_000) {
        this.token = g.token;
        this.caduca = g.caduca;
      }
    } catch {
      /* sin sesión guardada */
    }
  }

  /** Ajustes guardados en los datos del centro (incluidos los cambios sin publicar). */
  get ajustes() {
    const a = estado.json<DatosNegocio>(RUTAS.negocio)?.analitica;
    return { cliente: a?.clienteGoogle ?? '', propiedad: a?.ga4Propiedad ?? '', sitio: a?.searchConsole ?? '' };
  }

  get conectado() {
    return !!this.token && this.caduca > Date.now();
  }

  async conectar(): Promise<boolean> {
    const cliente = this.ajustes.cliente;
    if (!cliente) {
      this.error = 'Falta el ID de cliente de Google.';
      return false;
    }
    this.conectando = true;
    this.error = '';
    try {
      const g = await cargarGis();
      const r = await new Promise<{ token: string; segundos: number }>((ok, mal) => {
        const c = g.accounts.oauth2.initTokenClient({
          client_id: cliente,
          scope: ALCANCES,
          callback: (x) => (x.access_token ? ok({ token: x.access_token, segundos: x.expires_in ?? 3600 }) : mal(new Error(traducirOAuth(x.error, x.error_description)))),
          error_callback: (e) => mal(new Error(e.type === 'popup_closed' ? 'Has cerrado la ventana de Google antes de terminar.' : e.type === 'popup_failed_to_open' ? 'El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes para este sitio.' : (e.message ?? e.type))),
        });
        c.requestAccessToken({ prompt: '' });
      });
      this.token = r.token;
      this.caduca = Date.now() + r.segundos * 1000;
      try {
        sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ token: this.token, caduca: this.caduca }));
      } catch {
        /* sin almacenamiento */
      }
      return true;
    } catch (e) {
      this.error = (e as Error).message;
      return false;
    } finally {
      this.conectando = false;
    }
  }

  desconectar() {
    const t = this.token;
    this.token = null;
    this.caduca = 0;
    try {
      sessionStorage.removeItem(CLAVE_SESION);
      for (const k of Object.keys(sessionStorage)) if (k.startsWith(CLAVE_CACHE)) sessionStorage.removeItem(k);
    } catch {
      /* nada */
    }
    if (t) cargarGis().then((g) => g.accounts.oauth2.revoke(t)).catch(() => {});
  }

  /** Petición a una API de Google, con caché de 15 minutos en esta pestaña. */
  async pedir<T>(url: string, cuerpo?: unknown): Promise<T> {
    if (!this.conectado) throw new ErrorGoogle(401, 'Conecta con Google para ver estos datos.');
    const clave = CLAVE_CACHE + url + (cuerpo ? JSON.stringify(cuerpo) : '');
    try {
      const c = JSON.parse(sessionStorage.getItem(clave) ?? 'null') as { t: number; v: T } | null;
      if (c && Date.now() - c.t < CACHE_MS) return c.v;
    } catch {
      /* sin caché */
    }
    const r = await fetch(url, {
      method: cuerpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${this.token}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (!r.ok) {
      let detalle = r.statusText;
      try {
        detalle = ((await r.json()) as { error?: { message?: string } }).error?.message ?? detalle;
      } catch {
        /* sin cuerpo */
      }
      if (r.status === 401) this.desconectar();
      throw new ErrorGoogle(r.status, traducirApi(r.status, detalle, url));
    }
    const v = (await r.json()) as T;
    try {
      sessionStorage.setItem(clave, JSON.stringify({ t: Date.now(), v }));
    } catch {
      /* caché llena: no pasa nada */
    }
    return v;
  }
}

function traducirOAuth(error?: string, detalle?: string): string {
  if (error === 'access_denied') return 'Google no ha dado permiso. Si sale «app no verificada», pulsa «Configuración avanzada» y continúa: es vuestra propia app.';
  if (error === 'invalid_client' || /origin/i.test(detalle ?? ''))
    return 'Google no reconoce esta web. Revisa que en el cliente OAuth esté autorizado el origen de esta web.';
  return detalle || error || 'No se ha podido conectar con Google.';
}

function traducirApi(estadoHttp: number, detalle: string, url: string): string {
  const api = url.includes('searchconsole') ? 'Google Search Console API' : url.includes('analyticsadmin') ? 'Google Analytics Admin API' : 'Google Analytics Data API';
  if (/has not been used|is disabled|not been enabled/i.test(detalle)) return `Falta activar la «${api}» en vuestro proyecto de Google Cloud.`;
  if (estadoHttp === 401) return 'El acceso a Google ha caducado. Vuelve a conectar.';
  if (estadoHttp === 403) return url.includes('searchconsole')
    ? 'Tu cuenta de Google no tiene acceso a esa propiedad de Search Console.'
    : 'Tu cuenta de Google no tiene acceso a esa propiedad de Analytics.';
  if (estadoHttp === 429) return 'Google pide esperar un poco (demasiadas consultas). Prueba en unos minutos.';
  return `Google ha respondido con un error (${estadoHttp}): ${detalle}`;
}

export const google = new ConexionGoogle();
