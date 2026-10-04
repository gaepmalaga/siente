// Vigilancia de la web. Lo lanza GitHub Actions:
//  · al terminar cada publicación: si ha fallado, abre un aviso (un «issue» del
//    repositorio, que GitHub envía por correo); si ha ido bien, comprueba la web
//    en vivo y cierra los avisos anteriores;
//  · cada 6 horas: comprueba que todas las páginas del mapa del sitio responden.
//
//   node --experimental-strip-types scripts/vigilar.ts
//
// Variables: GH_TOKEN, GITHUB_REPOSITORY, SITIO (URL pública con barra final) y,
// tras una publicación, CONCLUSION, RUN_URL y RUN_TITULO.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ETIQUETA = 'aviso-web';
const sitio = (process.env.SITIO ?? '').replace(/\/?$/, '/');
const gh = (...args: string[]) => execFileSync('gh', args, { encoding: 'utf8' });

type Fallo = { url: string; problema: string };

async function pedir(url: string, intentos = 3): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'vigilancia-siente' } });
      if (r.ok || i >= intentos) return r;
    } catch (e) {
      if (i >= intentos) throw e;
    }
    await new Promise((r) => setTimeout(r, 5000 * i));
  }
}

/** Comprueba la web en vivo y devuelve lo que falla. */
export async function comprobarWeb(): Promise<{ fallos: Fallo[]; revisadas: number }> {
  const fallos: Fallo[] = [];
  const negocio = JSON.parse(readFileSync('src/data/negocio.json', 'utf8'));
  const telefono = String(negocio.telefono).replace(/\D/g, '');

  // Portada: responde, tiene el teléfono y datos estructurados válidos.
  const portada = await pedir(sitio);
  if (!portada.ok) fallos.push({ url: sitio, problema: `responde ${portada.status}` });
  else {
    const html = await portada.text();
    if (!html.replace(/\D/g, '').includes(telefono)) fallos.push({ url: sitio, problema: 'no aparece el teléfono del centro' });
    for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        JSON.parse(json);
      } catch {
        fallos.push({ url: sitio, problema: 'datos para Google (JSON-LD) mal formados' });
      }
    }
  }

  // Todas las páginas del mapa del sitio, más el panel y la página de enlaces.
  const mapa = await pedir(`${sitio}sitemap.xml`);
  const urls = mapa.ok ? [...(await mapa.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]) : [];
  if (!mapa.ok) fallos.push({ url: `${sitio}sitemap.xml`, problema: `responde ${mapa.status}` });
  const todas = [...new Set([...urls, `${sitio}admin/`, `${sitio}enlaces/`, `${sitio}pedir-cita/`])];
  for (let i = 0; i < todas.length; i += 6) {
    await Promise.all(
      todas.slice(i, i + 6).map(async (url) => {
        try {
          const r = await pedir(url);
          if (!r.ok) fallos.push({ url, problema: `responde ${r.status}` });
        } catch (e) {
          fallos.push({ url, problema: `no responde (${(e as Error).message})` });
        }
      }),
    );
  }
  return { fallos, revisadas: todas.length };
}

// ── Avisos (issues de GitHub) ───────────────────────────────────────────────

function avisosAbiertos(tipo: string): { number: number; title: string }[] {
  const lista = JSON.parse(gh('issue', 'list', '--label', ETIQUETA, '--state', 'open', '--json', 'number,title', '--limit', '50')) as { number: number; title: string }[];
  return lista.filter((a) => a.title.startsWith(tipo));
}

function abrirAviso(tipo: string, titulo: string, cuerpo: string) {
  gh('label', 'create', ETIQUETA, '--color', 'B93A25', '--description', 'Avisos automáticos de la web', '--force');
  const [abierto] = avisosAbiertos(tipo);
  if (abierto) gh('issue', 'comment', String(abierto.number), '--body', cuerpo);
  else gh('issue', 'create', '--label', ETIQUETA, '--title', `${tipo} ${titulo}`, '--body', cuerpo);
}

function cerrarAvisos(tipo: string, motivo: string) {
  for (const a of avisosAbiertos(tipo)) gh('issue', 'close', String(a.number), '--comment', motivo);
}

/** GitHub desactiva las tareas programadas de un repositorio sin actividad en 60 días. */
function mantenerVivas() {
  for (const w of ['deploy.yml', 'programados.yml', 'vigilancia.yml']) {
    try {
      gh('api', '-X', 'PUT', `repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/${w}/enable`);
    } catch {
      /* si no se puede, no es grave */
    }
  }
}

const PUBLICACION = '[Publicación]';
const WEB = '[Web]';

async function principal() {
  const conclusion = process.env.CONCLUSION;
  if (conclusion === 'failure') {
    abrirAviso(
      PUBLICACION,
      'La web no se ha podido publicar',
      [
        `La última publicación (**${process.env.RUN_TITULO ?? 'sin título'}**) ha fallado.`,
        '',
        '**La web sigue mostrando la versión anterior**: nadie ve nada roto.',
        '',
        'Qué hacer: en el panel, pulsa el indicador de publicación de la barra superior → «Deshacer este cambio», revisa y vuelve a publicar. Si vuelve a fallar, avisa a quien mantiene la web con este enlace:',
        '',
        process.env.RUN_URL ?? '',
      ].join('\n'),
    );
    return;
  }
  if (conclusion === 'success') cerrarAvisos(PUBLICACION, `Resuelto: «${process.env.RUN_TITULO ?? 'la última publicación'}» se ha publicado bien.`);
  if (conclusion && conclusion !== 'success') return; // cancelada: la relevó otra

  if (conclusion === 'success') await new Promise((r) => setTimeout(r, 45_000)); // margen para la caché de GitHub Pages
  const { fallos, revisadas } = await comprobarWeb();
  if (fallos.length) {
    abrirAviso(
      WEB,
      `${fallos.length === 1 ? 'Una página falla' : `${fallos.length} páginas fallan`}`,
      ['La comprobación automática ha encontrado problemas en la web pública:', '', ...fallos.map((f) => `- ${f.url}: ${f.problema}`)].join('\n'),
    );
    console.log(fallos);
  } else {
    cerrarAvisos(WEB, `Resuelto: las ${revisadas} páginas revisadas responden bien.`);
    console.log(`Todo bien: ${revisadas} páginas revisadas.`);
  }
  if (!conclusion) mantenerVivas();
}

if (process.argv[1]?.endsWith('vigilar.ts')) principal();
