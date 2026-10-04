// Datos del negocio que se editan desde /admin (src/data/*.json).
// Se validan al compilar: si algo queda mal escrito, el build avisa en lugar de
// publicar una web rota.
import negocioJson from '../data/negocio.json';
import enlacesJson from '../data/enlaces.json';
import resenasJson from '../data/resenas.json';
import portadaJson from '../data/portada.json';
import { url } from './url';
import { Negocio, Enlaces, Resenas, Portada } from './esquemas';
import * as H from './horario';

export { DIAS, NOMBRE_DIA, formatoTramo } from './horario';
export type { Dia, Tramo } from './horario';

export const negocio = Negocio.parse(negocioJson);
export const enlacesPagina = Enlaces.parse(enlacesJson);
export const resenas = Resenas.parse(resenasJson);
export const portada = Portada.parse(portadaJson);

// ── Contacto ────────────────────────────────────────────────────────────────

const soloDigitos = (s: string) => s.replace(/\D/g, '');

export const telHref = (numero = negocio.telefono) => `tel:+34${soloDigitos(numero).replace(/^34(?=\d{9}$)/, '')}`;

export function waHref(texto?: string): string {
  const numero = soloDigitos(negocio.whatsapp);
  const base = `https://wa.me/${numero.length === 9 ? `34${numero}` : numero}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

export const WA_SALUDO = 'Hola, os escribo desde la web. Me gustaría pedir cita.';

export const direccionCorta = `${negocio.direccion.calle}, ${negocio.direccion.barrio}`;
export const direccionCompleta = `${negocio.direccion.calle}, ${negocio.direccion.codigoPostal} ${negocio.direccion.ciudad}`;

const destino = encodeURIComponent(`${negocio.nombre}, ${direccionCompleta}`);
export const mapas = {
  google: negocio.redes.googleMaps || `https://www.google.com/maps/search/?api=1&query=${destino}`,
  comoLlegar: `https://www.google.com/maps/dir/?api=1&destination=${negocio.geo.lat},${negocio.geo.lng}`,
  apple: `https://maps.apple.com/?daddr=${negocio.geo.lat},${negocio.geo.lng}&q=${destino}`,
  waze: `https://waze.com/ul?ll=${negocio.geo.lat},${negocio.geo.lng}&navigate=yes`,
};

// ── Horario ─────────────────────────────────────────────────────────────────

export const horarioPorDia = () => H.porDia(negocio.horario);

/** Agrupa días consecutivos con el mismo horario: «Lunes a viernes», «Sábado»… */
export const horarioAgrupado = () => H.agrupar(horarioPorDia()).map(({ dias, tramos }) => ({ dias, tramos }));

/** Horario y cierres para el navegador («Abierto ahora», días de cita, avisos). */
export const horarioParaCliente = () => JSON.stringify({ dias: horarioPorDia(), cierres: negocio.cierres });

/** Avisos de la barra superior (manual y por cierres), con sus fechas. */
export const avisosWeb = () => H.avisosProgramados(negocio.aviso, negocio.cierres);

/** Cierres que aún no han terminado (para los datos estructurados). */
export const cierresPendientes = (hoy = H.ahoraEnMadrid().iso) => negocio.cierres.filter((c) => c.hasta >= hoy);

// ── Enlaces de la página /enlaces/ ──────────────────────────────────────────

export function resolverEnlace(e: (typeof enlacesPagina.enlaces)[number]): { href: string; externo: boolean } {
  switch (e.tipo) {
    case 'whatsapp':
      return { href: waHref(WA_SALUDO), externo: true };
    case 'cita':
      return { href: url('/pedir-cita/'), externo: false };
    case 'llamar':
      return { href: telHref(), externo: false };
    case 'mapa':
      return { href: mapas.comoLlegar, externo: true };
    case 'resenas':
      return { href: negocio.redes.resenasGoogle || mapas.google, externo: true };
    case 'instagram':
      return { href: negocio.redes.instagram, externo: true };
    case 'facebook':
      return { href: negocio.redes.facebook, externo: true };
    case 'contacto':
      return { href: url('/siente.vcf'), externo: false };
    default: {
      const externo = /^https?:/i.test(e.url);
      return { href: externo ? e.url : url(e.url || '/'), externo };
    }
  }
}

// ── Plan VEO ────────────────────────────────────────────────────────────────

/** El Plan VEO tiene fecha de fin: pasada esa fecha, la web deja de anunciarlo sola. */
export function planVeoVigente(hoy = new Date()): boolean {
  if (!negocio.planVeo.activo) return false;
  const fin = new Date(`${negocio.planVeo.fin}T23:59:59+01:00`);
  return hoy <= fin;
}

export const planVeoFin = new Date(`${negocio.planVeo.fin}T23:59:59+01:00`);
