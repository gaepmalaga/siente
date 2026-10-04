// Análisis SEO de artículos y servicios, pensado para una óptica de barrio.
//
// La nota la pone el panel, no Google: resume las pautas públicas de Google
// para títulos, descripciones y estructura, más dos cosas que importan a un
// negocio local (que se hable de Barajas y que haya una llamada a pedir cita).
// Cada aviso trae, cuando se puede, un «arreglo» que el panel aplica con un
// clic o que lleva al campo exacto que hay que tocar.
import { marked } from 'marked';
import { contarPalabras, normalizar } from './texto';

export type Nivel = 'bien' | 'mejorable' | 'mal';

/** Qué hacer para resolver un aviso. Lo interpreta el editor. */
export type Arreglo =
  | { tipo: 'campo'; campo: 'tituloSeo' | 'descripcion' | 'clave' | 'textoImagen'; texto: string }
  | { tipo: 'imagen'; texto: string }
  | { tipo: 'insertar'; texto: string; bloque: BloqueTexto };

export type BloqueTexto = 'cita' | 'barajas' | 'enlace' | 'subtitulo' | 'preguntas';

export type Comprobacion = {
  id: string;
  nivel: Nivel;
  texto: string;
  consejo?: string;
  /** Datos concretos: qué frases son largas, dónde falta la palabra clave… */
  detalles?: string[];
  arreglo?: Arreglo;
  peso: number;
};
export type Analisis = { puntuacion: number; comprobaciones: Comprobacion[]; palabras: number; lectura: number };

export type Entrada = {
  tipo: 'articulo' | 'servicio';
  titulo: string;
  tituloSeo: string;
  descripcion: string;
  cuerpo: string;
  slug: string;
  palabraClave?: string;
  imagen?: string;
  textoImagen?: string;
  extra?: { faqs?: number };
};

/** Marca de los textos de ejemplo que inserta el panel: no se puede publicar mientras quede alguna. */
export const MARCA_COMPLETAR = '[completa aquí]';

const contiene = (texto: string, clave: string) => normalizar(texto).includes(normalizar(clave));
const recortar = (t: string, n = 90) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

export function analizar(e: Entrada): Analisis {
  const c: Comprobacion[] = [];
  const add = (x: Omit<Comprobacion, 'peso'> & { peso?: number }) => c.push({ peso: 1, ...x });

  const plano = e.cuerpo.replace(/[#*_>`[\]()!-]/g, ' ');
  const palabras = contarPalabras(plano);
  const h2 = [...e.cuerpo.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]);
  const enlaces = [...e.cuerpo.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  const internos = enlaces.filter((u) => u.startsWith('/') || /sienteyve\.es|github\.io\/siente/.test(u));
  const primerParrafo = e.cuerpo.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith('#')) ?? '';
  const frases = e.cuerpo
    .replace(/^#+.*$/gm, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_>`]/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((f) => f.trim())
    .filter((f) => contarPalabras(f) > 3);
  const largas = frases.filter((f) => contarPalabras(f) > 25);
  const clave = (e.palabraClave ?? '').trim();

  // Título que verá Google
  const lt = e.tituloSeo.length;
  if (lt >= 30 && lt <= 65) add({ id: 'titulo', nivel: 'bien', texto: `Título para Google de ${lt} caracteres`, peso: 2 });
  else
    add({
      id: 'titulo',
      nivel: 'mejorable',
      texto: lt < 30 ? `Título para Google corto (${lt} caracteres)` : `Título para Google largo (${lt} caracteres)`,
      consejo: lt < 30 ? 'Apunta a 40–60 caracteres y añade el servicio o «Barajas».' : 'Google corta a partir de unos 60: el final no se verá.',
      arreglo: { tipo: 'campo', campo: 'tituloSeo', texto: lt < 30 ? 'Mejorar el título' : 'Escribir uno más corto' },
      peso: 2,
    });

  // Descripción
  const ld = e.descripcion.length;
  if (ld >= 110 && ld <= 165) add({ id: 'descripcion', nivel: 'bien', texto: `Descripción de ${ld} caracteres`, peso: 2 });
  else
    add({
      id: 'descripcion',
      nivel: ld === 0 ? 'mal' : 'mejorable',
      texto: ld === 0 ? 'Falta la descripción' : `Descripción de ${ld} caracteres`,
      consejo: ld === 0 ? 'Es el texto gris que aparece bajo el título en Google.' : ld < 110 ? 'Alárgala hasta 120–160 caracteres.' : 'Recórtala a menos de 160 caracteres.',
      arreglo: { tipo: 'campo', campo: 'descripcion', texto: 'Ir a la descripción' },
      peso: 2,
    });

  // Palabra clave
  if (!clave) {
    add({
      id: 'clave',
      nivel: 'mejorable',
      texto: 'Sin palabra clave principal',
      consejo: 'Elige lo que buscaría alguien en Google para encontrar este texto.',
      arreglo: { tipo: 'campo', campo: 'clave', texto: 'Elegir una' },
      peso: 3,
    });
  } else {
    const donde = [
      ['el título', contiene(e.tituloSeo, clave) || contiene(e.titulo, clave)],
      ['la descripción', contiene(e.descripcion, clave)],
      ['el primer párrafo', contiene(primerParrafo, clave)],
      ['algún subtítulo', h2.some((h) => contiene(h, clave))],
    ] as const;
    const faltan = donde.filter(([, ok]) => !ok).map(([n]) => n);
    if (faltan.length === 0) add({ id: 'clave', nivel: 'bien', texto: `«${clave}» aparece donde debe`, peso: 3 });
    else
      add({
        id: 'clave',
        nivel: faltan.length <= 2 ? 'mejorable' : 'mal',
        texto: `«${clave}» no aparece en ${faltan.length === 1 ? faltan[0] : `${faltan.length} sitios clave`}`,
        consejo: 'Escríbela con naturalidad; no hace falta repetirla mucho.',
        detalles: faltan.map((f) => `Falta en ${f}`),
        arreglo: faltan.includes('la descripción') ? { tipo: 'campo', campo: 'descripcion', texto: 'Ir a la descripción' } : undefined,
        peso: 3,
      });
  }

  // Extensión. Google no exige un mínimo: lo que cuenta es responder bien.
  const [minimo, corto] = e.tipo === 'articulo' ? [450, 250] : [250, 120];
  if (palabras >= minimo) add({ id: 'longitud', nivel: 'bien', texto: `${palabras} palabras`, peso: 2 });
  else
    add({
      id: 'longitud',
      nivel: palabras >= corto ? 'mejorable' : 'mal',
      texto: palabras >= corto ? `${palabras} palabras: algo corto` : `Solo ${palabras} palabras`,
      consejo: 'No hay un mínimo, pero los textos que resuelven todas las dudas suelen posicionar mejor. Una sección de preguntas es la forma más fácil de ampliarlo.',
      arreglo: { tipo: 'insertar', bloque: 'preguntas', texto: 'Añadir preguntas frecuentes' },
      peso: 2,
    });

  // Estructura
  if (h2.length >= 2) add({ id: 'subtitulos', nivel: 'bien', texto: `${h2.length} subtítulos` });
  else
    add({
      id: 'subtitulos',
      nivel: 'mejorable',
      texto: h2.length ? 'Solo un subtítulo' : 'Sin subtítulos',
      consejo: 'Divide el texto en apartados: se lee mejor y Google entiende de qué trata cada parte.',
      arreglo: { tipo: 'insertar', bloque: 'subtitulo', texto: 'Añadir un subtítulo' },
    });

  // Enlaces internos
  if (internos.length >= 2) add({ id: 'enlaces', nivel: 'bien', texto: `${internos.length} enlaces a otras páginas de la web` });
  else
    add({
      id: 'enlaces',
      nivel: 'mejorable',
      texto: internos.length ? 'Solo un enlace a otra página de la web' : 'Sin enlaces a otras páginas de la web',
      consejo: 'Enlazar al servicio relacionado lleva visitas a donde se piden las citas.',
      arreglo: { tipo: 'insertar', bloque: 'enlace', texto: 'Enlazar el servicio relacionado' },
    });

  // Llamada a la acción
  if (/pedir-cita/.test(e.cuerpo)) add({ id: 'cita', nivel: 'bien', texto: 'Incluye un enlace para pedir cita' });
  else
    add({
      id: 'cita',
      nivel: 'mejorable',
      texto: 'Sin enlace para pedir cita',
      consejo: 'Quien termina de leer es quien más probablemente pedirá cita.',
      arreglo: { tipo: 'insertar', bloque: 'cita', texto: 'Añadirlo al final' },
    });

  // SEO local
  if (contiene(`${e.titulo} ${e.descripcion} ${e.cuerpo}`, 'barajas')) add({ id: 'local', nivel: 'bien', texto: 'Menciona Barajas', peso: 2 });
  else
    add({
      id: 'local',
      nivel: 'mejorable',
      texto: 'No menciona Barajas',
      consejo: 'Nombrar el barrio ayuda a salir en búsquedas cercanas.',
      arreglo: { tipo: 'insertar', bloque: 'barajas', texto: 'Añadir una frase' },
      peso: 2,
    });

  // Imagen
  if (e.imagen) {
    if (e.textoImagen && e.textoImagen.length >= 10) add({ id: 'imagen', nivel: 'bien', texto: 'Imagen con descripción' });
    else
      add({
        id: 'imagen',
        nivel: 'mejorable',
        texto: 'La imagen no tiene descripción',
        consejo: 'Describe la foto en una frase: ayuda a Google Imágenes y a personas ciegas.',
        arreglo: { tipo: 'campo', campo: 'textoImagen', texto: 'Describirla' },
      });
  } else if (e.tipo === 'articulo')
    add({
      id: 'imagen',
      nivel: 'mejorable',
      texto: 'Sin imagen de portada',
      consejo: 'Los artículos con imagen se comparten mucho mejor.',
      arreglo: { tipo: 'imagen', texto: 'Elegir foto' },
    });

  // Legibilidad
  const proporcion = frases.length ? largas.length / frases.length : 0;
  if (proporcion <= 0.2) add({ id: 'lectura', nivel: 'bien', texto: 'Frases fáciles de leer' });
  else
    add({
      id: 'lectura',
      nivel: 'mejorable',
      texto: `${largas.length} frases muy largas`,
      consejo: 'Parte en dos las frases de más de 25 palabras. Estas son:',
      detalles: largas.slice(0, 3).map((f) => `«${recortar(f)}»`),
    });

  if (e.tipo === 'servicio') {
    const faqs = e.extra?.faqs ?? 0;
    if (faqs >= 3) add({ id: 'faqs', nivel: 'bien', texto: `${faqs} preguntas frecuentes` });
    else add({ id: 'faqs', nivel: 'mejorable', texto: `${faqs} preguntas frecuentes`, consejo: 'Con 3 o más, Google y los asistentes de IA entienden mejor el servicio.' });
  }

  const total = c.reduce((s, x) => s + x.peso, 0);
  const puntos = c.reduce((s, x) => s + x.peso * (x.nivel === 'bien' ? 1 : x.nivel === 'mejorable' ? 0.5 : 0), 0);
  return { puntuacion: Math.round((puntos / total) * 100), comprobaciones: c, palabras, lectura: Math.max(1, Math.round(palabras / 200)) };
}

export const colorPuntuacion = (p: number) => (p >= 80 ? 'bien' : p >= 55 ? 'mejorable' : 'mal');

/** Título para Google propuesto a partir del título del artículo (≤ 60 caracteres). */
export function proponerTitulo(titulo: string, sufijo = ' | Siente'): string {
  const t = titulo.trim().replace(/\s+/g, ' ');
  if (`${t}${sufijo}`.length <= 60) return `${t}${sufijo}`;
  if (t.length <= 60) return t;
  // Corta por la última palabra entera y sin dejar conectores colgando.
  let corto = t.slice(0, 60).replace(/\s+\S*$/, '');
  corto = corto.replace(/[\s,;:–—-]+(y|o|de|del|la|el|los|las|en|con|para|que|a|por|un|una)?$/i, '').replace(/[\s,;:–—-]+$/, '');
  return corto;
}

// ── Palabras clave sugeridas ────────────────────────────────────────────────

/** Búsquedas reales de una óptica y centro auditivo de barrio. */
const CLAVES: Record<'vista' | 'oido' | 'general', string[]> = {
  vista: [
    'revisión de la vista',
    'graduarse la vista',
    'óptica en Barajas',
    'gafas graduadas',
    'lentes progresivas',
    'vista cansada',
    'fatiga visual',
    'miopía en niños',
    'control de miopía',
    'lentillas',
    'gafas de sol graduadas',
    'ojo seco',
    'visión infantil',
  ],
  oido: [
    'revisión auditiva',
    'audífonos en Barajas',
    'pérdida auditiva',
    'audiometría',
    'tapones para los oídos',
    'acúfenos',
    'cera en los oídos',
    'audífonos invisibles',
    'centro auditivo',
  ],
  general: ['óptica en Barajas', 'centro auditivo en Barajas', 'revisión de la vista', 'revisión auditiva'],
};

const VACIAS = new Set(
  'a al algo ante como con cual cuando de del desde donde el ella ellos en entre es esta este esto hay la las le les lo los mas más me mi muy no nos o para pero por porque que qué se sea ser si sí sin sobre son su sus te tu tus un una uno unos y ya te tan también solo cómo cuál cuándo dónde por qué'.split(
    ' ',
  ),
);

/**
 * Palabras clave candidatas, de más a menos probable: búsquedas reales de
 * Search Console (si las hay) y luego las de la lista que encajan con el texto.
 */
export function sugerirClaves(e: { titulo: string; cuerpo: string; categoria?: string; consultas?: string[] }): string[] {
  const texto = normalizar(`${e.titulo} ${e.titulo} ${e.cuerpo}`);
  const lista = [...(CLAVES[(e.categoria as 'vista' | 'oido') ?? 'general'] ?? []), ...CLAVES.general];
  const puntuar = (frase: string) => {
    const pal = normalizar(frase)
      .split(/\s+/)
      .filter((p) => !VACIAS.has(p) && p.length > 2);
    if (!pal.length) return 0;
    const raiz = (p: string) => p.slice(0, Math.max(4, p.length - 2));
    const presentes = pal.filter((p) => texto.includes(raiz(p))).length;
    return presentes === pal.length ? 2 + (texto.split(normalizar(frase)).length - 1) : presentes / pal.length;
  };
  const deLista = [...new Set(lista)]
    .map((f) => ({ f, p: puntuar(f) }))
    .filter((x) => x.p >= 1)
    .sort((a, b) => b.p - a.p)
    .map((x) => x.f);
  return [...new Set([...(e.consultas ?? []), ...deLista])].slice(0, 6);
}

/** HTML de vista previa del Markdown, con las rutas internas apuntando a la web. */
export function aHtml(md: string, base: string): string {
  const html = marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
  const b = base.replace(/\/$/, '');
  return html.replace(/\b(src|href)="\/(?!\/)/g, `$1="${b}/`);
}
