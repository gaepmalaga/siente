// Configuración del panel /admin (Sveltia CMS), generada al compilar para que
// las rutas y el repositorio sean siempre los correctos. Se sirve como JSON,
// que también es YAML válido.
//
// Los campos de aquí deben coincidir con los esquemas de src/content.config.ts
// y src/lib/negocio.ts.
import type { APIRoute } from 'astro';
import { fotos } from '../../lib/fotos';
import { urlAbsoluta } from '../../lib/url';

const repo = process.env.GITHUB_REPOSITORY || 'gaepmalaga/siente';

const opcional = { required: false };
const texto = (name: string, label: string, extra: Record<string, unknown> = {}) => ({ name, label, widget: 'string', ...extra });
const textoLargo = (name: string, label: string, extra: Record<string, unknown> = {}) => ({ name, label, widget: 'text', ...extra });
const interruptor = (name: string, label: string, def = true, extra: Record<string, unknown> = {}) => ({
  name,
  label,
  widget: 'boolean',
  default: def,
  ...extra,
});
const hora = (name: string, label: string) =>
  texto(name, label, { pattern: ['^\\d{1,2}:\\d{2}$', 'Usa el formato HH:MM, por ejemplo 09:30'] });

const ICONOS = [
  'ScanEye', 'Eye', 'Glasses', 'Layers', 'Sun', 'Baby', 'Ear', 'AudioLines', 'Wrench',
  'Headphones', 'Sparkles', 'ShieldCheck', 'Stethoscope', 'Gift', 'Heart', 'Monitor',
];

const DIAS = [
  { label: 'Lunes', value: 'lunes' },
  { label: 'Martes', value: 'martes' },
  { label: 'Miércoles', value: 'miercoles' },
  { label: 'Jueves', value: 'jueves' },
  { label: 'Viernes', value: 'viernes' },
  { label: 'Sábado', value: 'sabado' },
  { label: 'Domingo', value: 'domingo' },
];

const config = {
  backend: { name: 'github', repo, branch: 'main', commit_messages: { create: 'Panel: crea {{collection}} «{{slug}}»', update: 'Panel: actualiza {{collection}} «{{slug}}»', delete: 'Panel: borra {{collection}} «{{slug}}»', uploadMedia: 'Panel: sube «{{path}}»', deleteMedia: 'Panel: borra «{{path}}»' } },
  site_url: urlAbsoluta('/'),
  display_url: urlAbsoluta('/'),
  logo_url: urlAbsoluta('/apple-touch-icon.png'),
  media_folder: 'public/uploads',
  public_folder: '/uploads',
  media_libraries: {
    default: {
      config: {
        transformations: { raster_image: { format: 'webp', quality: 82, width: 1600, height: 1600 } },
      },
    },
  },
  slug: { encoding: 'ascii', clean_accents: true, sanitize_replacement: '-' },
  collections: [
    {
      name: 'blog',
      label: 'Blog',
      label_singular: 'Artículo',
      icon: 'article',
      folder: 'src/content/blog',
      create: true,
      extension: 'md',
      format: 'frontmatter',
      slug: '{{slug}}',
      identifier_field: 'title',
      summary: '{{title}} · {{date | date("DD/MM/YYYY")}}',
      sortable_fields: ['date', 'title'],
      preview_path: 'blog/{{slug}}/',
      fields: [
        texto('title', 'Título', { hint: 'El titular del artículo. Intenta incluir lo que la gente buscaría en Google.' }),
        textoLargo('description', 'Resumen (para Google y redes)', { hint: 'Unas 150-160 letras. Es el texto que aparece bajo el título en Google.' }),
        { name: 'date', label: 'Fecha de publicación', widget: 'datetime', time_format: false, date_format: 'DD/MM/YYYY', format: 'YYYY-MM-DD' },
        { name: 'cover', label: 'Imagen de portada', widget: 'image', ...opcional, hint: 'Vertical o cuadrada queda mejor. Se optimiza sola al subirla.' },
        texto('coverAlt', 'Descripción de la imagen', { ...opcional, hint: 'Describe la foto en una frase (para personas ciegas y para Google).' }),
        {
          name: 'category',
          label: 'Categoría',
          widget: 'select',
          default: 'vista',
          options: [
            { label: 'Vista', value: 'vista' },
            { label: 'Oído', value: 'oido' },
            { label: 'Consejos generales', value: 'general' },
          ],
        },
        interruptor('draft', 'Borrador (no se publica)', false),
        { name: 'body', label: 'Texto', widget: 'markdown' },
      ],
    },
    {
      name: 'servicios',
      label: 'Servicios',
      label_singular: 'Servicio',
      icon: 'medical_services',
      folder: 'src/content/servicios',
      create: true,
      extension: 'md',
      format: 'frontmatter',
      slug: '{{slug}}',
      identifier_field: 'title',
      summary: '{{title}} ({{area}})',
      sortable_fields: ['order', 'title'],
      fields: [
        texto('title', 'Nombre corto', { hint: 'Por ejemplo: «Lentes progresivas». Aparece en menús y tarjetas.' }),
        texto('h1', 'Titular de la página', { hint: 'Por ejemplo: «Lentes progresivas en Barajas».' }),
        texto('seoTitle', 'Título para Google'),
        textoLargo('description', 'Descripción para Google'),
        {
          name: 'area',
          label: 'Sección',
          widget: 'select',
          options: [
            { label: 'Óptica (vista)', value: 'vista' },
            { label: 'Audición (oído)', value: 'oido' },
          ],
        },
        { name: 'order', label: 'Orden', widget: 'number', value_type: 'int', default: 10 },
        { name: 'icon', label: 'Icono', widget: 'select', options: ICONOS, default: 'Eye' },
        textoLargo('summary', 'Resumen para la tarjeta'),
        texto('badge', 'Etiqueta destacada', { ...opcional, hint: 'Por ejemplo: «Gratis» o «Plan VEO».' }),
        { name: 'image', label: 'Foto', widget: 'select', options: Object.keys(fotos).sort(), ...opcional },
        texto('imageAlt', 'Descripción de la foto', opcional),
        { name: 'highlights', label: 'Puntos clave', widget: 'list', field: { name: 'punto', label: 'Punto', widget: 'string' }, ...opcional },
        {
          name: 'steps',
          label: 'Pasos',
          widget: 'list',
          ...opcional,
          fields: [texto('title', 'Título'), textoLargo('text', 'Texto')],
        },
        {
          name: 'faqs',
          label: 'Preguntas frecuentes',
          widget: 'list',
          ...opcional,
          summary: '{{fields.q}}',
          fields: [texto('q', 'Pregunta'), textoLargo('a', 'Respuesta')],
        },
        texto('cita', 'Servicio en el formulario de cita', { ...opcional, hint: 'Clave del servicio en /pedir-cita/ (revision-vista, gafas, progresivas, lentillas, infantil, plan-veo, revision-oido, audifonos, mantenimiento).' }),
        { name: 'body', label: 'Texto de la página', widget: 'markdown' },
      ],
    },
    { divider: true },
    {
      name: 'ajustes',
      label: 'Configuración',
      icon: 'settings',
      files: [
        {
          name: 'negocio',
          label: 'Datos del centro, horario y avisos',
          file: 'src/data/negocio.json',
          fields: [
            {
              name: 'aviso',
              label: 'Aviso en la parte superior',
              widget: 'object',
              hint: 'Para vacaciones, festivos o promociones. Se muestra en todas las páginas mientras esté activado.',
              fields: [
                interruptor('activo', 'Mostrar aviso', false),
                texto('texto', 'Texto del aviso', { ...opcional, hint: 'Por ejemplo: «Cerrado del 10 al 25 de agosto por vacaciones».' }),
                texto('enlace', 'Enlace (opcional)', { ...opcional, hint: 'Una página de la web, por ejemplo /plan-veo/' }),
              ],
            },
            {
              name: 'horario',
              label: 'Horario',
              widget: 'list',
              hint: 'Un tramo por línea. Si un día abre mañana y tarde, añade dos tramos ese día. Los días sin tramos se muestran como cerrados.',
              summary: '{{fields.dia}}: {{fields.abre}} – {{fields.cierra}}',
              fields: [{ name: 'dia', label: 'Día', widget: 'select', options: DIAS }, hora('abre', 'Abre'), hora('cierra', 'Cierra')],
            },
            texto('telefono', 'Teléfono fijo'),
            texto('movil', 'Móvil'),
            texto('whatsapp', 'WhatsApp (con prefijo 34, sin espacios)', { pattern: ['^\\d{11,13}$', 'Solo números, con el 34 delante. Ej: 34641446882'] }),
            texto('email', 'Correo electrónico'),
            texto('nombre', 'Nombre del centro'),
            texto('nombreCorto', 'Nombre corto'),
            texto('eslogan', 'Eslogan'),
            texto('razonSocial', 'Razón social'),
            texto('nif', 'NIF'),
            {
              name: 'direccion',
              label: 'Dirección',
              widget: 'object',
              fields: [texto('calle', 'Calle y número'), texto('codigoPostal', 'Código postal'), texto('ciudad', 'Ciudad'), texto('barrio', 'Barrio'), texto('region', 'Comunidad')],
            },
            {
              name: 'geo',
              label: 'Coordenadas (para el mapa)',
              widget: 'object',
              collapsed: true,
              fields: [
                { name: 'lat', label: 'Latitud', widget: 'number', value_type: 'float' },
                { name: 'lng', label: 'Longitud', widget: 'number', value_type: 'float' },
              ],
            },
            {
              name: 'comoLlegar',
              label: 'Cómo llegar',
              widget: 'list',
              summary: '{{fields.texto}}',
              fields: [
                {
                  name: 'medio',
                  label: 'Medio',
                  widget: 'select',
                  options: [
                    { label: 'Metro', value: 'metro' },
                    { label: 'Autobús', value: 'bus' },
                    { label: 'Coche', value: 'coche' },
                  ],
                },
                texto('texto', 'Texto'),
              ],
            },
            {
              name: 'redes',
              label: 'Redes y enlaces',
              widget: 'object',
              fields: [
                texto('instagram', 'Instagram', opcional),
                texto('facebook', 'Facebook', opcional),
                texto('googleMaps', 'Google Maps', opcional),
                texto('resenasGoogle', 'Enlace para dejar reseña en Google', { ...opcional, hint: 'En Google Business Profile: «Pedir reseñas» → copia el enlace.' }),
              ],
            },
            { name: 'zonas', label: 'Barrios cercanos', widget: 'list', field: { name: 'zona', label: 'Barrio', widget: 'string' } },
            { name: 'marcas', label: 'Marcas que trabajamos', widget: 'list', field: { name: 'marca', label: 'Marca', widget: 'string' } },
            {
              name: 'analitica',
              label: 'Analítica',
              widget: 'object',
              collapsed: true,
              hint: 'Si pones un ID de Google Analytics 4, la web mostrará el aviso de cookies y medirá visitas y clics (solo de quien acepte).',
              fields: [
                texto('ga4', 'ID de Google Analytics 4 (G-XXXXXXXXXX)', { ...opcional, pattern: ['^(G-[A-Z0-9]+)?$', 'Debe empezar por G-, por ejemplo G-AB12CD34EF'] }),
              ],
            },
            {
              name: 'planVeo',
              label: 'Plan VEO',
              widget: 'object',
              fields: [
                interruptor('activo', 'Mostrar el Plan VEO en la web', true),
                texto('fin', 'Fecha de fin (AAAA-MM-DD)', { pattern: ['^\\d{4}-\\d{2}-\\d{2}$', 'Formato AAAA-MM-DD, por ejemplo 2026-12-31'] }),
              ],
            },
          ],
        },
        {
          name: 'portada',
          label: 'Portada: titular y destacados',
          file: 'src/data/portada.json',
          fields: [
            texto('antetitulo', 'Antetítulo (encima del titular)'),
            texto('titulo', 'Titular', { hint: 'Separa las líneas con punto. Ej: «Ver bien. Oír mejor.»' }),
            textoLargo('subtitulo', 'Subtítulo'),
            {
              name: 'promos',
              label: 'Destacados bajo el titular',
              widget: 'list',
              summary: '{{fields.titulo}}',
              fields: [
                texto('etiqueta', 'Etiqueta', opcional),
                texto('titulo', 'Título'),
                texto('texto', 'Texto', opcional),
                texto('enlace', 'Enlace', { ...opcional, hint: 'Una página de la web, por ejemplo /plan-veo/' }),
                interruptor('visible', 'Visible'),
              ],
            },
          ],
        },
        {
          name: 'enlaces',
          label: 'Página de enlaces (Instagram)',
          file: 'src/data/enlaces.json',
          fields: [
            texto('titulo', 'Título'),
            texto('subtitulo', 'Subtítulo', opcional),
            {
              name: 'enlaces',
              label: 'Botones',
              widget: 'list',
              summary: '{{fields.texto}}',
              fields: [
                texto('texto', 'Texto del botón'),
                texto('detalle', 'Texto pequeño', opcional),
                {
                  name: 'tipo',
                  label: 'Qué hace',
                  widget: 'select',
                  default: 'web',
                  options: [
                    { label: 'Abrir WhatsApp', value: 'whatsapp' },
                    { label: 'Ir a «Pedir cita»', value: 'cita' },
                    { label: 'Llamar', value: 'llamar' },
                    { label: 'Cómo llegar (mapa)', value: 'mapa' },
                    { label: 'Reseñas de Google', value: 'resenas' },
                    { label: 'Instagram', value: 'instagram' },
                    { label: 'Facebook', value: 'facebook' },
                    { label: 'Guardar en contactos (ficha del centro)', value: 'contacto' },
                    { label: 'Enlace (escríbelo abajo)', value: 'web' },
                  ],
                },
                texto('url', 'Enlace', { ...opcional, hint: 'Solo si «Qué hace» es «Enlace». Una página de la web (/plan-veo/) o una dirección completa (https://…).' }),
                interruptor('destacado', 'Destacado (botón oscuro o verde)', false),
                interruptor('secundario', 'Enlace pequeño (en la fila de abajo)', false, { hint: 'Deja los botones grandes para lo importante: 4 o 5 como mucho.' }),
                interruptor('visible', 'Visible'),
              ],
            },
          ],
        },
        {
          name: 'resenas',
          label: 'Reseñas',
          file: 'src/data/resenas.json',
          fields: [
            { name: 'notaMedia', label: 'Nota media en Google (ej. 4,9)', widget: 'number', value_type: 'float', min: 1, max: 5, step: 0.1, ...opcional },
            { name: 'totalResenas', label: 'Número de reseñas en Google', widget: 'number', value_type: 'int', ...opcional },
            {
              name: 'resenas',
              label: 'Reseñas destacadas',
              widget: 'list',
              hint: 'Copia reseñas reales de Google (con el nombre tal y como aparece). Se muestran en la portada.',
              summary: '{{fields.autor}}',
              fields: [
                texto('autor', 'Nombre'),
                textoLargo('texto', 'Reseña'),
                { name: 'estrellas', label: 'Estrellas', widget: 'number', value_type: 'int', min: 1, max: 5, default: 5 },
                texto('fecha', 'Fecha (opcional)', { ...opcional, hint: 'Por ejemplo: «hace 2 semanas» o «septiembre 2026».' }),
                texto('fuente', 'Origen', { default: 'Google' }),
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const GET: APIRoute = () =>
  new Response(JSON.stringify(config, null, 2), { headers: { 'Content-Type': 'application/yaml; charset=utf-8' } });
