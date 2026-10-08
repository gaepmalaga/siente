// Esquemas de todos los datos editables. Los usan la web (al compilar) y el
// panel /admin (antes de publicar), así ninguno de los dos puede guardar datos
// que rompan al otro.
import { z } from 'astro/zod';

export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type Dia = (typeof DIAS)[number];

const hora = z.string().regex(/^\d{1,2}:\d{2}$/, 'Usa el formato HH:MM, por ejemplo 09:30');
const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD');
const fechaOpcional = z.preprocess((v) => (v === '' || v == null ? undefined : v), fechaIso.optional());

export const Negocio = z.object({
  nombre: z.string().min(1),
  nombreCorto: z.string().min(1),
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
  telefono: z.string().min(9),
  movil: z.string().min(9),
  whatsapp: z.string().regex(/^\d{11,13}$/, 'Solo números, con el prefijo 34 delante'),
  email: z.string().email(),
  horario: z.array(z.object({ dia: z.enum(DIAS), abre: hora, cierra: hora })),
  /** Días de cierre extraordinario (vacaciones, festivos). */
  cierres: z
    .array(z.object({ desde: fechaIso, hasta: fechaIso, motivo: z.string().optional().default('') }))
    .default([]),
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
    /** Programación opcional: el aviso solo se muestra entre estas fechas. */
    desde: fechaOpcional,
    hasta: fechaOpcional,
  }),
  planVeo: z.object({ activo: z.boolean().default(true), fin: fechaIso }),
  analitica: z
    .object({
      ga4: z.string().regex(/^(G-[A-Z0-9]+)?$/, 'El ID de Google Analytics empieza por G-').optional().default(''),
      /** Número de la propiedad de Analytics (para leer las estadísticas en el panel). */
      ga4Propiedad: z.string().regex(/^\d*$/, 'Solo números').optional().default(''),
      /** Propiedad de Search Console: «sc-domain:sienteyve.es» o la URL de la web. */
      searchConsole: z.string().optional().default(''),
      /** Código de la etiqueta «google-site-verification» de Search Console. */
      verificacion: z.string().regex(/^[\w-]*$/, 'Pega solo el código, sin la etiqueta').optional().default(''),
      /** ID de cliente OAuth de Google Cloud para ver las estadísticas en el panel. */
      clienteGoogle: z
        .string()
        .regex(/^(\S+\.apps\.googleusercontent\.com)?$/, 'Termina en .apps.googleusercontent.com')
        .optional()
        .default(''),
    })
    .default({ ga4: '', ga4Propiedad: '', searchConsole: '', verificacion: '', clienteGoogle: '' }),
});
export type DatosNegocio = z.infer<typeof Negocio>;

export const TIPOS_ENLACE = ['whatsapp', 'cita', 'llamar', 'mapa', 'resenas', 'instagram', 'facebook', 'contacto', 'web'] as const;

export const Enlaces = z.object({
  titulo: z.string(),
  subtitulo: z.string().optional().default(''),
  enlaces: z.array(
    z.object({
      texto: z.string().min(1),
      detalle: z.string().optional().default(''),
      tipo: z.enum(TIPOS_ENLACE),
      url: z.string().optional().default(''),
      destacado: z.boolean().optional().default(false),
      secundario: z.boolean().optional().default(false),
      visible: z.boolean().optional().default(true),
    }),
  ),
});
export type DatosEnlaces = z.infer<typeof Enlaces>;

// Un número vacío puede llegar como "" o null: se tratan igual.
const numeroOpcional = z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable());

export const Resenas = z.object({
  notaMedia: numeroOpcional.optional(),
  totalResenas: numeroOpcional.optional(),
  resenas: z
    .array(
      z.object({
        autor: z.string().min(1),
        texto: z.string().min(1),
        estrellas: z.number().min(1).max(5).default(5),
        fecha: z.string().optional().default(''),
        fuente: z.string().optional().default('Google'),
      }),
    )
    .default([]),
});
export type DatosResenas = z.infer<typeof Resenas>;

export const Portada = z.object({
  antetitulo: z.string(),
  titulo: z.string().min(1),
  subtitulo: z.string(),
  promos: z
    .array(
      z.object({
        etiqueta: z.string().optional().default(''),
        titulo: z.string().min(1),
        texto: z.string().optional().default(''),
        enlace: z.string().optional().default(''),
        visible: z.boolean().optional().default(true),
      }),
    )
    .default([]),
});
export type DatosPortada = z.infer<typeof Portada>;

export const CATEGORIAS = ['vista', 'oido', 'general'] as const;

export const Articulo = z.object({
  title: z.string().min(1),
  /** Título para Google, si el del artículo es demasiado largo. */
  seoTitle: z.string().optional(),
  description: z.string().min(1),
  /** Día («2026-10-10») o día y hora de Madrid («2026-10-10T09:30:00+02:00»). */
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  cover: z.string().optional(),
  coverAlt: z.string().optional(),
  category: z.enum(CATEGORIAS).default('general'),
  draft: z.boolean().default(false),
  /** Palabra clave principal (solo la usa el análisis SEO del panel). */
  keyword: z.string().optional(),
});

export const Servicio = z.object({
  title: z.string().min(1),
  h1: z.string().min(1),
  seoTitle: z.string().min(1),
  description: z.string().min(1),
  area: z.enum(['vista', 'oido']),
  order: z.number().default(10),
  icon: z.string().default('Eye'),
  summary: z.string(),
  badge: z.string().optional(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  highlights: z.array(z.string()).default([]),
  steps: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  cita: z.string().optional(),
  keyword: z.string().optional(),
});


// ── Citas online ────────────────────────────────────────────────────────────

const tramoCita = z.object({ dia: z.enum(DIAS), abre: hora, cierra: hora });

export const TipoCita = z.object({
  /** Identificador estable (no cambia aunque se renombre la cita). */
  id: z.string().regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones').min(1),
  nombre: z.string().min(1),
  /** Texto corto bajo el nombre («Gratis», «Hasta 100 €»…). */
  detalle: z.string().optional().default(''),
  icono: z.string().default('Eye'),
  /** Minutos que dura la cita. */
  duracion: z.number().int().min(5).max(240).default(30),
  activo: z.boolean().default(true),
  /** Horario propio de esta cita; si va vacío usa el horario común. */
  horarioPropio: z.boolean().default(false),
  tramos: z.array(tramoCita).default([]),
});
export type DatosTipoCita = z.infer<typeof TipoCita>;

export const FirebaseWeb = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  appId: z.string().min(1),
  storageBucket: z.string().optional().default(''),
  messagingSenderId: z.string().optional().default(''),
});

export const Citas = z.object({
  /** Interruptor general: apagado, la web vuelve a pedir cita por WhatsApp. */
  activo: z.boolean().default(true),
  /** Minutos de descanso tras cada cita. */
  descanso: z.number().int().min(0).max(120).default(10),
  /** Cada cuántos minutos puede empezar una cita. */
  hueco: z.number().int().min(5).max(120).default(30),
  /** Personas que atienden a la vez (citas simultáneas). */
  simultaneas: z.number().int().min(1).max(9).default(1),
  /** Horas mínimas de antelación para reservar. */
  antelacionHoras: z.number().int().min(0).max(720).default(2),
  /** Hasta cuántos días por delante se puede reservar. */
  maxDias: z.number().int().min(1).max(365).default(30),
  /** Horario común a todas las citas: el del centro o uno propio. */
  horarioComun: z.enum(['centro', 'propio']).default('centro'),
  tramosComunes: z.array(tramoCita).default([]),
  tipos: z.array(TipoCita).default([]),
  /** Correos del equipo que gestionan la agenda (deben coincidir con firestore.rules). */
  equipo: z.array(z.string().email()).default([]),
  /** Configuración pública de la app web de Firebase (no es secreta). */
  firebase: FirebaseWeb.optional(),
}).superRefine((c, ctx) => {
  // Las reglas de Firestore admiten hasta 12 celdas por cita.
  c.tipos.forEach((t, i) => {
    const celdas = Math.ceil((t.duracion + c.descanso) / c.hueco);
    if (celdas > 12)
      ctx.addIssue({ code: 'custom', path: ['tipos', i, 'duracion'], message: `«${t.nombre}» ocupa ${celdas} huecos (máximo 12): sube el tamaño del hueco o acorta la cita.` });
  });
});
export type DatosCitas = z.infer<typeof Citas>;
