// Datos del negocio que se editan desde /admin (src/data/*.json).
// Se validan al compilar: si algo queda mal escrito, el build avisa en lugar de
// publicar una web rota.
import { z } from 'astro/zod';
import negocioJson from '../data/negocio.json';
import enlacesJson from '../data/enlaces.json';
import resenasJson from '../data/resenas.json';
import portadaJson from '../data/portada.json';
import { url } from './url';

export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type Dia = (typeof DIAS)[number];

export const NOMBRE_DIA: Record<Dia, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

const hora = z.string().regex(/^\d{1,2}:\d{2}$/, 'Usa el formato HH:MM, por ejemplo 09:30');

const Negocio = z.object({
  nombre: z.string(),
  nombreCorto: z.string(),
  eslogan: z.string(),
  razonSocial: z.string(),
  nif: z.string(),
  direccion: z.object({
    calle: z.string(),
    codigoPostal: z.string(),
    ciudad: z.string(),
    barrio: z.string(),
    region: z.string(),
  }),
  geo: z.object({ lat: z.number(), lng: z.number() }),
  comoLlegar: z.array(z.object({ medio: z.string(), texto: z.string() })).default([]),
  telefono: z.string(),
  movil: z.string(),
  whatsapp: z.string(),
  email: z.string(),
  horario: z.array(z.object({ dia: z.enum(DIAS), abre: hora, cierra: hora })),
  redes: z.object({
    instagram: z.string().optional().default(''),
    facebook: z.string().optional().default(''),
    googleMaps: z.string().optional().default(''),
    resenasGoogle: z.string().optional().default(''),
  }),
  zonas: z.array(z.string()).default([]),
  marcas: z.array(z.string()).default([]),
  aviso: z.object({
    activo: z.boolean().default(false),
    texto: z.string().optional().default(''),
    enlace: z.string().optional().default(''),
  }),
  planVeo: z.object({ activo: z.boolean().default(true), fin: z.string() }),
  analitica: z
    .object({ ga4: z.string().regex(/^(G-[A-Z0-9]+)?$/, 'El ID de Google Analytics empieza por G-').optional().default('') })
    .default({ ga4: '' }),
});

const Enlaces = z.object({
  titulo: z.string(),
  subtitulo: z.string().optional().default(''),
  enlaces: z.array(
    z.object({
      texto: z.string(),
      detalle: z.string().optional().default(''),
      tipo: z.enum(['whatsapp', 'cita', 'llamar', 'mapa', 'resenas', 'instagram', 'facebook', 'contacto', 'web']),
      url: z.string().optional().default(''),
      destacado: z.boolean().optional().default(false),
      secundario: z.boolean().optional().default(false),
      visible: z.boolean().optional().default(true),
    }),
  ),
});

// El panel puede guardar un número vacío como "" o null: se tratan igual.
const numeroOpcional = z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable());

const Resenas = z.object({
  notaMedia: numeroOpcional.optional(),
  totalResenas: numeroOpcional.optional(),
  resenas: z
    .array(
      z.object({
        autor: z.string(),
        texto: z.string(),
        estrellas: z.number().min(1).max(5).default(5),
        fecha: z.string().optional().default(''),
        fuente: z.string().optional().default('Google'),
      }),
    )
    .default([]),
});

const Portada = z.object({
  antetitulo: z.string(),
  titulo: z.string(),
  subtitulo: z.string(),
  promos: z
    .array(
      z.object({
        etiqueta: z.string().optional().default(''),
        titulo: z.string(),
        texto: z.string().optional().default(''),
        enlace: z.string().optional().default(''),
        visible: z.boolean().optional().default(true),
      }),
    )
    .default([]),
});

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

export type Tramo = { abre: string; cierra: string };

const aMinutos = (h: string) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

export function horarioPorDia(): Record<Dia, Tramo[]> {
  const porDia = Object.fromEntries(DIAS.map((d) => [d, [] as Tramo[]])) as Record<Dia, Tramo[]>;
  for (const { dia, abre, cierra } of negocio.horario) porDia[dia].push({ abre, cierra });
  for (const d of DIAS) porDia[d].sort((a, b) => aMinutos(a.abre) - aMinutos(b.abre));
  return porDia;
}

export const formatoTramo = (t: Tramo) => `${t.abre} – ${t.cierra}`;

/** Agrupa días consecutivos con el mismo horario: «Lunes a viernes», «Sábado»… */
export function horarioAgrupado(): { dias: string; tramos: string[] }[] {
  const porDia = horarioPorDia();
  const grupos: { desde: Dia; hasta: Dia; clave: string; tramos: string[] }[] = [];
  for (const d of DIAS) {
    const tramos = porDia[d].map(formatoTramo);
    const clave = tramos.join('|');
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.clave === clave) ultimo.hasta = d;
    else grupos.push({ desde: d, hasta: d, clave, tramos });
  }
  return grupos.map((g) => {
    const consecutivos = DIAS.indexOf(g.hasta) - DIAS.indexOf(g.desde);
    const dias =
      g.desde === g.hasta
        ? NOMBRE_DIA[g.desde]
        : consecutivos === 1
          ? `${NOMBRE_DIA[g.desde]} y ${NOMBRE_DIA[g.hasta].toLowerCase()}`
          : `${NOMBRE_DIA[g.desde]} a ${NOMBRE_DIA[g.hasta].toLowerCase()}`;
    return { dias, tramos: g.tramos };
  });
}

/** Horario en formato compacto para el navegador (estado «Abierto ahora»). */
export const horarioParaCliente = () => JSON.stringify(horarioPorDia());

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
