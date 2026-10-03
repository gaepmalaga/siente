# Siente · Centro Óptico y Auditivo (Barajas, Madrid)

Web nueva de **Siente**, óptica y centro auditivo en la Avenida de Logroño, 112 (Barajas).

- **Demo:** https://gaepmalaga.github.io/siente/
- **Panel de edición:** https://gaepmalaga.github.io/siente/admin/
- **Página de enlaces (para la bio de Instagram):** https://gaepmalaga.github.io/siente/enlaces/

## Cómo está hecha

| Pieza | Qué es | Por qué |
| --- | --- | --- |
| [Astro 7](https://astro.build) | Genera HTML estático | Carga instantánea y SEO perfecto: Google recibe HTML puro |
| CSS propio | Sin frameworks de estilos | Diseño a medida y muy poco peso |
| [Sveltia CMS](https://github.com/sveltia/sveltia-cms) en `/admin` | Panel de edición visual | Guarda los cambios en este repositorio, sin base de datos |
| GitHub Pages + Actions | Hosting gratuito | Cada cambio se publica solo en 1-2 minutos |

No hay servidor, base de datos ni formularios que guarden datos: **las citas se piden por WhatsApp** (la web compone el mensaje) o por teléfono. Google Analytics es opcional y solo se carga si el visitante acepta las cookies.

## Lo que incluye

- **Portada** con rótulo de madera retroiluminado (como el del local), estado «Abierto ahora» calculado con la hora de Madrid y dos **simuladores interactivos** (visión borrosa y pérdida auditiva).
- **9 páginas de servicio** pensadas para posicionar búsquedas locales («revisión de la vista gratis Barajas», «audífonos Barajas», «lentes progresivas Barajas»…).
- **Plan VEO**: página propia y franja con cuenta atrás que **se oculta sola** al pasar la fecha de fin.
- **Pedir cita** guiada: servicio → día (solo los que abre el centro) → nombre, y se abre WhatsApp con el mensaje escrito.
- **Test de audición** de 30 segundos en la página de audífonos.
- **Blog** con 10 artículos (mismas URLs que el blog antiguo).
- **Página de enlaces** que sustituye a Linktree.
- **Accesibilidad**: tipografía Atkinson Hyperlegible (diseñada para baja visión), botón de tamaño de letra, alto contraste, botones grandes y navegación con teclado.
- **SEO técnico**: datos estructurados (Optician, horarios, FAQ, artículos, migas), sitemap, `llms.txt` para buscadores con IA, imágenes para redes generadas por página y redirecciones desde las URLs antiguas `/es/...`.

## Estructura

```
src/
  data/            ← datos editables desde /admin (negocio, portada, enlaces, reseñas)
  content/
    servicios/     ← una página por servicio (Markdown)
    blog/          ← artículos (Markdown)
  assets/fotos/    ← fotos del local (se optimizan solas al compilar)
  components/      ← piezas reutilizables (rótulo, simuladores, mapa…)
  layouts/         ← plantillas (base, servicio, texto)
  pages/           ← rutas de la web; admin/config.yml.ts configura el panel
public/uploads/    ← imágenes subidas desde el panel
```

## Desarrollo local

```bash
npm install
npm run dev
```

La web queda en http://localhost:4321.

Para compilar como en GitHub Pages (con la subcarpeta `/siente`) desde PowerShell:

```powershell
$env:SITE_URL='https://gaepmalaga.github.io'; $env:BASE_PATH='/siente'; $env:PUBLIC_NOINDEX='true'; npm run build
```

> En Git Bash hay que anteponer `MSYS_NO_PATHCONV=1`, o convertirá `/siente` en una ruta de disco.

## Editar la web desde /admin

1. La persona que vaya a editar necesita una **cuenta de GitHub** con permiso de escritura en este repositorio (Settings → Collaborators).
2. Entra en `/admin/` y pulsa **«Sign In with Token»**. El propio panel enlaza a GitHub para crear el token: debe tener permiso **Contents: Read and write** sobre este repositorio.
3. Desde el panel se puede:
   - **Configuración → Datos del centro, horario y avisos**: teléfonos, horario, avisos de vacaciones, marcas, Plan VEO.
   - **Configuración → Portada**: titular y destacados.
   - **Configuración → Página de enlaces**: los botones de la página de Instagram.
   - **Configuración → Reseñas**: pegar reseñas reales de Google y la nota media.
   - **Blog** y **Servicios**: crear y editar artículos y páginas.

Al guardar, el panel hace un commit y la web se republica sola.

## Activar Google Analytics (opcional)

1. Crear una propiedad de **Google Analytics 4** y copiar el **ID de medición** (`G-XXXXXXXXXX`).
2. En `/admin` → Configuración → Datos del centro → **Analítica**, pegar el ID y guardar.

Con eso aparece el aviso de cookies (Aceptar / Rechazar al mismo nivel, como pide la AEPD) y la política de cookies se actualiza sola. Nada de Google se carga hasta que el visitante acepta.

Eventos que se envían, con el parámetro `zona` (cabecera, barra-movil, bio-instagram, portada, ficha-lateral, pie…):

| Evento | Cuándo |
| --- | --- |
| `generate_lead` | Se envía una cita desde /pedir-cita/ (parámetros `canal` y `servicio`) |
| `clic_whatsapp` | Clic en cualquier botón de WhatsApp |
| `clic_llamar` | Clic en un teléfono |
| `clic_pedir_cita` | Clic en un botón «Pedir cita» |
| `clic_como_llegar` | Clic en Google Maps, Apple Maps o Waze |
| `guardar_contacto` | Descarga de la ficha de contacto |
| `clic_enlace_bio` | Otros clics en la página de enlaces |

En GA4 conviene marcar `generate_lead`, `clic_whatsapp` y `clic_llamar` como **eventos clave**.

## Pasar al dominio definitivo (sienteyve.es)

1. **DNS** del dominio:
   - `www` → registro `CNAME` a `gaepmalaga.github.io`
   - Raíz `sienteyve.es` → registros `A` a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`
2. **Settings → Pages → Custom domain**: `www.sienteyve.es` y activar **Enforce HTTPS**.
3. **Settings → Secrets and variables → Actions → Variables**:
   - `SITE_URL` = `https://www.sienteyve.es`
   - `BASE_PATH` = `/`
   - `PUBLIC_NOINDEX` = `false` (hasta entonces la demo pide a Google que no la indexe)
4. Relanzar el workflow (**Actions → Publicar en GitHub Pages → Run workflow**).

Las URLs antiguas (`/es/contacto/`, `/es/blog/...`, etc.) redirigen a las nuevas.

## Después de publicar

- Dar de alta la web en **Google Search Console** y enviar `https://www.sienteyve.es/sitemap.xml`.
- En **Google Business Profile**: enlazar la web y usar `https://www.sienteyve.es/pedir-cita/` como enlace de citas.
- Cambiar el enlace de la bio de Instagram a `https://www.sienteyve.es/enlaces/`.
- Añadir 3-5 **reseñas reales de Google** desde el panel (Configuración → Reseñas) y el enlace directo para dejar reseña.

## Iconos

Los PNG de `public/` (favicon, iconos de móvil) se generan con:

```bash
node scripts/generar-iconos.mjs
```
