// «Salud de la web»: lo que conviene arreglar o mejorar, con enlace directo.
import { estado } from './estado.svelte';
import { RUTAS } from './backend';
import { leerMd } from './frontmatter';
import { analizar } from './seo';
import { slugDe } from './paginas';
import { ahoraEnMadrid } from '../../lib/horario';
import type { DatosNegocio, DatosResenas } from '../../lib/esquemas';

export type Revision = { id: string; nivel: 'bien' | 'mejorable' | 'mal'; titulo: string; detalle: string; ir?: string };

export type DatosArticulo = {
  ruta: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  draft?: boolean;
  category?: string;
  cover?: string;
  coverAlt?: string;
  keyword?: string;
  cuerpo: string;
  puntuacion: number;
  estadoPub: 'publicado' | 'programado' | 'borrador';
};

export function articulos(): DatosArticulo[] {
  const hoy = ahoraEnMadrid().iso;
  return estado
    .rutas(RUTAS.blog)
    .map((ruta) => {
      const { datos, cuerpo } = leerMd<Omit<DatosArticulo, 'ruta' | 'slug' | 'cuerpo' | 'puntuacion' | 'estadoPub'>>(estado.texto(ruta) ?? '');
      const slug = slugDe(ruta);
      const fecha = String(datos.date ?? '').slice(0, 10);
      const { puntuacion } = analizar({
        tipo: 'articulo',
        titulo: datos.title ?? '',
        tituloSeo: datos.title ?? '',
        descripcion: datos.description ?? '',
        cuerpo,
        slug,
        palabraClave: datos.keyword,
        imagen: datos.cover,
        textoImagen: datos.coverAlt,
      });
      const estadoPub: DatosArticulo['estadoPub'] = datos.draft ? 'borrador' : fecha > hoy ? 'programado' : 'publicado';
      return { ...datos, date: fecha, ruta, slug, cuerpo, puntuacion, estadoPub } as DatosArticulo;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function revisiones(): Revision[] {
  const r: Revision[] = [];
  const negocio = estado.json<DatosNegocio>(RUTAS.negocio);
  const resenas = estado.json<DatosResenas>(RUTAS.resenas);
  const hoy = ahoraEnMadrid().iso;
  const posts = articulos();

  if (!resenas?.resenas?.length)
    r.push({ id: 'resenas', nivel: 'mal', titulo: 'Sin reseñas en la portada', detalle: 'Añade 3–5 reseñas reales de Google: es lo que más confianza da.', ir: '/resenas' });
  else r.push({ id: 'resenas', nivel: 'bien', titulo: `${resenas.resenas.length} reseñas en la portada`, detalle: 'La prueba social está a la vista.' });

  const enlaceResenas = negocio?.redes?.resenasGoogle ?? '';
  if (!/g\.page\/r\/|writereview|search\.google\.com\/local/.test(enlaceResenas))
    r.push({ id: 'enlace-resenas', nivel: 'mejorable', titulo: 'Falta el enlace directo de reseñas', detalle: 'Con el enlace de «Pedir reseñas» de Google, el cliente opina en un toque.', ir: '/centro#redes' });

  if (!negocio?.analitica?.ga4)
    r.push({ id: 'analitica', nivel: 'mejorable', titulo: 'Analítica sin activar', detalle: 'Pon el ID de Google Analytics para saber cuántas citas llegan desde la web.', ir: '/centro#analitica' });

  if (negocio?.aviso?.activo && negocio.aviso.hasta && negocio.aviso.hasta < hoy)
    r.push({ id: 'aviso', nivel: 'mejorable', titulo: 'Hay un aviso caducado', detalle: 'Ya no se muestra; puedes desactivarlo o cambiar las fechas.', ir: '/horario#aviso' });

  if (negocio?.planVeo?.activo && negocio.planVeo.fin < hoy)
    r.push({ id: 'planveo', nivel: 'mejorable', titulo: 'El Plan VEO ha terminado', detalle: 'La web ya no lo anuncia. Desactívalo o actualiza la fecha si se prorroga.', ir: '/centro#planveo' });

  const flojos = posts.filter((p) => p.puntuacion < 60 && p.estadoPub !== 'borrador');
  if (flojos.length)
    r.push({ id: 'seo', nivel: 'mejorable', titulo: `${flojos.length === 1 ? '1 artículo' : `${flojos.length} artículos`} con SEO mejorable`, detalle: `Empieza por «${flojos[0].title}».`, ir: `/blog/${flojos[0].slug}` });
  else if (posts.length) r.push({ id: 'seo', nivel: 'bien', titulo: 'Los artículos están bien optimizados', detalle: 'Ninguno baja de 60 puntos de SEO.' });

  const sinAlt = posts.filter((p) => p.cover && !p.coverAlt);
  if (sinAlt.length)
    r.push({ id: 'alt', nivel: 'mejorable', titulo: `${sinAlt.length} portadas sin descripción`, detalle: 'Describe cada foto en una frase: ayuda a Google y a personas ciegas.', ir: `/blog/${sinAlt[0].slug}` });

  const ultimo = posts.find((p) => p.estadoPub === 'publicado');
  const dias = ultimo ? Math.round((Date.parse(hoy) - Date.parse(ultimo.date)) / 86_400_000) : 999;
  if (dias > 30)
    r.push({ id: 'frecuencia', nivel: 'mejorable', titulo: `${ultimo ? `${dias} días` : 'Mucho tiempo'} sin artículos nuevos`, detalle: 'Publicar uno al mes mantiene la web viva para Google.', ir: '/blog/nuevo' });
  else r.push({ id: 'frecuencia', nivel: 'bien', titulo: 'El blog está al día', detalle: `Último artículo hace ${dias} ${dias === 1 ? 'día' : 'días'}.` });

  if (estado.despliegue?.estado === 'error')
    r.push({ id: 'despliegue', nivel: 'mal', titulo: 'La última publicación falló', detalle: 'La web sigue con la versión anterior. Revisa el historial.', ir: '/historial' });

  return r;
}

export const puntuacionSalud = (lista: Revision[]) =>
  Math.round((lista.reduce((s, x) => s + (x.nivel === 'bien' ? 1 : x.nivel === 'mejorable' ? 0.5 : 0), 0) / Math.max(1, lista.length)) * 100);
