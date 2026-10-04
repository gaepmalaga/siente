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
    .object({ ga4: z.string().regex(/^(G-[A-Z0-9]+)?$/, 'El ID de Google Analytics empieza por G-').optional().default('') })
    .default({ ga4: '' }),
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
  description: z.string().min(1),
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
