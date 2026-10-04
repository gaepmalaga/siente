// Publicaciones programadas. Lo lanza GitHub Actions cada 15 minutos: si desde
// la última compilación ha llegado el momento de algo (un artículo con fecha y
// hora, el inicio o fin de un aviso, el aviso previo de unas vacaciones, el fin
// del Plan VEO…), pide recompilar la web. Si no, no hace nada.
//
//   node --experimental-strip-types scripts/programados.ts
//
// Necesita GH_TOKEN y GITHUB_REPOSITORY (los pone GitHub Actions).
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { instanteMadrid, sumarDias, momentoPublicacion, DIAS_PREAVISO } from '../src/lib/horario.ts';

type Momento = { cuando: number; que: string };

const DOS_DIAS = 2 * 86_400_000;
const ahora = Date.now();
const medianoche = (iso: string) => Date.parse(instanteMadrid(iso, '00:00'));

export function momentos(): Momento[] {
  const lista: Momento[] = [];

  for (const archivo of readdirSync('src/content/blog').filter((a) => a.endsWith('.md'))) {
    const texto = readFileSync(`src/content/blog/${archivo}`, 'utf8');
    const cabecera = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    if (/^draft:\s*true\s*$/m.test(cabecera)) continue;
    const fecha = cabecera.match(/^date:\s*['"]?([^'"\n]+?)['"]?\s*$/m)?.[1];
    if (fecha) lista.push({ cuando: momentoPublicacion(fecha), que: `artículo ${archivo}` });
  }

  const negocio = JSON.parse(readFileSync('src/data/negocio.json', 'utf8'));
  const { aviso, cierres = [], planVeo } = negocio;
  if (aviso?.activo) {
    if (aviso.desde) lista.push({ cuando: medianoche(aviso.desde), que: 'empieza el aviso' });
    if (aviso.hasta) lista.push({ cuando: medianoche(sumarDias(aviso.hasta, 1)), que: 'termina el aviso' });
  }
  for (const c of cierres as { desde: string; hasta: string; motivo?: string }[]) {
    const nombre = c.motivo || 'cierre';
    lista.push({ cuando: medianoche(sumarDias(c.desde, -DIAS_PREAVISO)), que: `aviso previo de ${nombre}` });
    lista.push({ cuando: medianoche(c.desde), que: `empieza ${nombre}` });
    lista.push({ cuando: medianoche(sumarDias(c.hasta, 1)), que: `termina ${nombre}` });
  }
  if (planVeo?.activo && planVeo.fin) lista.push({ cuando: medianoche(sumarDias(planVeo.fin, 1)), que: 'termina el Plan VEO' });

  return lista.filter((m) => Number.isFinite(m.cuando));
}

const gh = (...args: string[]) => execFileSync('gh', args, { encoding: 'utf8' });

function ultimaCompilacion(): number {
  const runs = JSON.parse(
    gh('run', 'list', '--workflow', 'deploy.yml', '--branch', 'main', '--limit', '20', '--json', 'status,conclusion,createdAt'),
  ) as { status: string; conclusion: string | null; createdAt: string }[];
  // Cuenta lo que ya se compiló bien y lo que está en marcha (incluirá lo nuevo).
  const validas = runs.filter((r) => r.status !== 'completed' || r.conclusion === 'success');
  return Math.max(0, ...validas.map((r) => Date.parse(r.createdAt)));
}

function principal() {
  const ultima = ultimaCompilacion();
  const pendientes = momentos().filter((m) => m.cuando > ultima && m.cuando <= ahora && ahora - m.cuando < DOS_DIAS);
  console.log(`Última compilación: ${new Date(ultima).toISOString()}`);
  if (!pendientes.length) {
    console.log('Nada programado para ahora.');
    return;
  }
  console.log(`Toca publicar: ${pendientes.map((m) => m.que).join(', ')}`);
  gh('workflow', 'run', 'deploy.yml', '--ref', 'main', '-f', 'motivo=programado');
}

if (process.argv[1]?.endsWith('programados.ts')) principal();
