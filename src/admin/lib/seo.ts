// Análisis SEO de artículos y servicios, pensado para una óptica de barrio:
// además de lo clásico, comprueba que se hable de Barajas y que haya una
// llamada a pedir cita.
import { marked } from 'marked';
import { contarPalabras, normalizar } from './texto';

export type Nivel = 'bien' | 'mejorable' | 'mal';
export type Comprobacion = { id: string; nivel: Nivel; texto: string; consejo?: string; peso: number };
export type Analisis = { puntuacion: number; comprobaciones: Comprobacion[]; palabras: number; lectura: number };

type Entrada = {
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

const contiene = (texto: string, clave: string) => normalizar(texto).includes(normalizar(clave));

export function analizar(e: Entrada): Analisis {
  const c: Comprobacion[] = [];
  const add = (id: string, nivel: Nivel, texto: string, consejo?: string, peso = 1) => c.push({ id, nivel, texto, consejo, peso });

  const plano = e.cuerpo.replace(/[#*_>`[\]()!-]/g, ' ');
  const palabras = contarPalabras(plano);
  const h2 = [...e.cuerpo.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]);
  const enlaces = [...e.cuerpo.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  const internos = enlaces.filter((u) => u.startsWith('/') || /sienteyve\.es|github\.io\/siente/.test(u));
  const primerParrafo = e.cuerpo.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith('#')) ?? '';
  const frases = plano.split(/[.!?¿¡]+\s/).map((f) => contarPalabras(f)).filter((n) => n > 3);
  const largas = frases.length ? frases.filter((n) => n > 25).length / frases.length : 0;
  const clave = (e.palabraClave ?? '').trim();

  // Título
  const lt = e.tituloSeo.length;
  if (lt >= 30 && lt <= 65) add('titulo', 'bien', `Título de ${lt} caracteres`, undefined, 2);
  else if (lt < 30) add('titulo', 'mejorable', `Título corto (${lt} caracteres)`, 'Apunta a 40–60 caracteres y añade el servicio o «Barajas».', 2);
  else add('titulo', 'mejorable', `Título largo (${lt} caracteres)`, 'Google lo cortará: déjalo en menos de 65.', 2);

  // Descripción
  const ld = e.descripcion.length;
  if (ld >= 110 && ld <= 165) add('descripcion', 'bien', `Descripción de ${ld} caracteres`, undefined, 2);
  else if (ld === 0) add('descripcion', 'mal', 'Falta la descripción', 'Es el texto gris que aparece bajo el título en Google.', 2);
  else add('descripcion', 'mejorable', `Descripción de ${ld} caracteres`, 'Lo ideal son 120–160 caracteres.', 2);

  // Palabra clave
  if (!clave) {
    add('clave', 'mejorable', 'Sin palabra clave principal', 'Escribe lo que buscaría alguien en Google, p. ej. «lentes progresivas».', 2);
  } else {
    const donde = [
      ['el título', contiene(e.tituloSeo, clave) || contiene(e.titulo, clave)],
      ['la descripción', contiene(e.descripcion, clave)],
      ['el primer párrafo', contiene(primerParrafo, clave)],
      ['algún subtítulo', h2.some((h) => contiene(h, clave))],
      ['la dirección de la página', normalizar(e.slug).includes(normalizar(clave).replace(/\s+/g, '-'))],
    ] as const;
    const faltan = donde.filter(([, ok]) => !ok).map(([n]) => n);
    if (faltan.length === 0) add('clave', 'bien', `«${clave}» aparece donde debe`, undefined, 3);
    else if (faltan.length <= 2) add('clave', 'mejorable', `«${clave}» no aparece en ${faltan.join(' ni en ')}`, undefined, 3);
    else add('clave', 'mal', `«${clave}» casi no aparece`, `Inclúyela en ${faltan.slice(0, 3).join(', ')}.`, 3);
  }

  // Extensión
  const minimo = e.tipo === 'articulo' ? 600 : 250;
  if (palabras >= minimo) add('longitud', 'bien', `${palabras} palabras`, undefined, 2);
  else if (palabras >= minimo / 2) add('longitud', 'mejorable', `${palabras} palabras`, `Los textos de más de ${minimo} palabras suelen posicionar mejor.`, 2);
  else add('longitud', 'mal', `Solo ${palabras} palabras`, `Desarrolla más: al menos ${minimo}.`, 2);

  // Estructura
  if (h2.length >= 2) add('subtitulos', 'bien', `${h2.length} subtítulos`);
  else add('subtitulos', 'mejorable', 'Pocos subtítulos', 'Divide el texto con 2 o más subtítulos (##).');

  // Enlaces internos
  if (internos.length >= 2) add('enlaces', 'bien', `${internos.length} enlaces a otras páginas de la web`);
  else add('enlaces', 'mejorable', internos.length ? 'Solo un enlace interno' : 'Sin enlaces a otras páginas de la web', 'Enlaza a un servicio o a otro artículo relacionado.');

  // Llamada a la acción
  if (/pedir-cita/.test(e.cuerpo)) add('cita', 'bien', 'Incluye un enlace para pedir cita');
  else add('cita', 'mejorable', 'Sin enlace para pedir cita', 'Termina con «[Pide tu cita](/pedir-cita/)».');

  // SEO local
  if (contiene(`${e.titulo} ${e.descripcion} ${e.cuerpo}`, 'barajas')) add('local', 'bien', 'Menciona Barajas', undefined, 2);
  else add('local', 'mejorable', 'No menciona Barajas', 'Nombrar el barrio ayuda a salir en búsquedas cercanas.', 2);

  // Imagen
  if (e.imagen) {
    if (e.textoImagen && e.textoImagen.length >= 10) add('imagen', 'bien', 'Imagen con descripción');
    else add('imagen', 'mejorable', 'La imagen no tiene descripción', 'Describe la foto en una frase (accesibilidad y Google Imágenes).');
  } else if (e.tipo === 'articulo') add('imagen', 'mejorable', 'Sin imagen de portada', 'Los artículos con imagen se comparten mucho mejor.');

  // Legibilidad
  if (largas <= 0.2) add('lectura', 'bien', 'Frases fáciles de leer');
  else add('lectura', 'mejorable', `${Math.round(largas * 100)} % de frases muy largas`, 'Parte las frases de más de 25 palabras.');

  if (e.tipo === 'servicio') {
    const faqs = e.extra?.faqs ?? 0;
    if (faqs >= 3) add('faqs', 'bien', `${faqs} preguntas frecuentes`);
    else add('faqs', 'mejorable', `${faqs} preguntas frecuentes`, 'Con 3 o más, Google y los asistentes de IA entienden mejor el servicio.');
  }

  const total = c.reduce((s, x) => s + x.peso, 0);
  const puntos = c.reduce((s, x) => s + x.peso * (x.nivel === 'bien' ? 1 : x.nivel === 'mejorable' ? 0.5 : 0), 0);
  return { puntuacion: Math.round((puntos / total) * 100), comprobaciones: c, palabras, lectura: Math.max(1, Math.round(palabras / 200)) };
}

export const colorPuntuacion = (p: number) => (p >= 80 ? 'bien' : p >= 55 ? 'mejorable' : 'mal');

/** HTML de vista previa del Markdown, con las rutas internas apuntando a la web. */
export function aHtml(md: string, base: string): string {
  const html = marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
  const b = base.replace(/\/$/, '');
  return html.replace(/\b(src|href)="\/(?!\/)/g, `$1="${b}/`);
}
