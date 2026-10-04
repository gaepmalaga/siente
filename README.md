# Siente · Centro Óptico y Auditivo (Barajas, Madrid)

Web nueva de **Siente**, óptica y centro auditivo en la Avenida de Logroño, 112 (Barajas).

- **Demo:** https://gaepmalaga.github.io/siente/
- **Panel de edición:** https://gaepmalaga.github.io/siente/admin/ (demostración sin clave: [`/admin/?demo`](https://gaepmalaga.github.io/siente/admin/?demo))
- **Página de enlaces (para la bio de Instagram):** https://gaepmalaga.github.io/siente/enlaces/

## Cómo está hecha

| Pieza | Qué es | Por qué |
| --- | --- | --- |
| [Astro 7](https://astro.build) | Genera HTML estático | Carga instantánea y SEO perfecto: Google recibe HTML puro |
| CSS propio | Sin frameworks de estilos | Diseño a medida y muy poco peso |
| Panel propio en `/admin` ([Svelte](https://svelte.dev)) | Panel de edición hecho a medida | Usa este repositorio como base de datos: cada publicación es un commit |
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
  pages/           ← rutas de la web (admin/ monta el panel y demo.json su modo demostración)
  lib/esquemas.ts  ← reglas de los datos, compartidas por la web y el panel
  lib/horario.ts   ← cálculo de apertura, cierres y avisos (web y panel)
  admin/           ← el panel: vistas/, componentes/ y lib/ (conexión con GitHub, estado, SEO…)
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

El panel es una aplicación propia que trabaja directamente contra la API de GitHub. No hay servidor intermedio: el navegador guarda los cambios en este repositorio y GitHub Actions republica la web.

**Entrar:** en `/admin/` se pega una clave de acceso de GitHub (*fine-grained token*). El enlace «¿No tienes clave?» abre GitHub con todo rellenado: solo este repositorio, permisos **Contents: Read and write** y **Actions: Read**, caducidad de un año. La clave solo se guarda en ese navegador.

**Cómo funciona:**

- Los cambios se acumulan como **pendientes** (sobreviven a recargar la página) y se publican **todos juntos en un único commit** atómico, con un mensaje que resume qué se tocó.
- Antes de publicar se ven las **diferencias** archivo a archivo y se **validan** con las mismas reglas (`src/lib/esquemas.ts`) que usa la web al compilar: no se puede publicar algo que rompa la web.
- Si otra persona ha publicado entretanto los mismos archivos, el panel avisa del **conflicto** en vez de pisarlo.
- La barra superior enseña el **progreso de la publicación** paso a paso (lee GitHub Actions) y avisa cuando ya está en la web.
- **Historial**: cada publicación con autor, fecha y cambios; cualquiera se puede **deshacer**.

**Secciones:**

| Sección | Qué se hace |
| --- | --- |
| Resumen | Estado de apertura, acciones rápidas, salud SEO de la web, lo que está programado y últimos cambios |
| Horario y avisos | Horario semanal, **cierres y vacaciones** (la web avisa sola 14 días antes y los datos para Google se actualizan), **aviso programado** con fechas |
| Datos del centro | Teléfonos, WhatsApp, dirección, redes, marcas, barrios, Plan VEO, Google Analytics, datos legales |
| Portada, Reseñas, Enlaces de Instagram | Edición con vista previa (la de enlaces, en un móvil) y orden arrastrando |
| Blog | Editor con barra de formato y vista previa, **programar artículos** (se publican solos: la web se recompila cada día), borradores, análisis SEO con palabra clave y vista de Google |
| Servicios | Todos los campos de cada página de servicio, pasos, preguntas frecuentes, icono, foto y SEO |
| Fotos | Subida arrastrando con **conversión automática a WebP**, dónde se usa cada foto y borrado seguro |
| Accesos | Quién tiene acceso y cómo darlo a otra persona |

`Ctrl + K` abre el buscador de acciones desde cualquier sitio.

### Dar acceso a otra persona

Las claves *fine-grained* de GitHub solo sirven para repositorios de la propia cuenta o de una organización, así que hay tres caminos (el panel los explica en **Accesos**):

1. **Organización (recomendado).** Crear una organización gratuita, transferirle este repositorio e invitar a la persona como miembro. Cada una crea su clave eligiendo la organización como propietaria. La demo pasa a `https://<organización>.github.io/siente/` (no afecta al dominio definitivo).
2. **Botón «Entrar con GitHub».** Desplegar [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) en Cloudflare Workers (gratis), crear una *OAuth App* en GitHub con su URL de retorno e invitar a la persona como colaboradora del repositorio. Después, añadir la variable de Actions `PUBLIC_PANEL_AUTH_URL` con la dirección del Worker: aparece el botón y ya no hacen falta claves.
3. **Colaboradora con clave clásica.** Invitarla en *Settings → Collaborators* y que cree una clave clásica con el permiso `repo` (da acceso a todos sus repositorios, por eso es la menos recomendable).

## Activar Google Analytics (opcional)

1. Crear una propiedad de **Google Analytics 4** y copiar el **ID de medición** (`G-XXXXXXXXXX`).
2. En `/admin` → **Datos del centro → Analítica**, pegar el ID y publicar.

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
- Añadir 3-5 **reseñas reales de Google** desde el panel (**Reseñas**) y el enlace directo para dejar reseña (**Datos del centro → Redes**).

## Iconos

Los PNG de `public/` (favicon, iconos de móvil) se generan con:

```bash
node scripts/generar-iconos.mjs
```
