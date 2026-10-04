// Contenido real de la web para el modo demostración del panel
// (/admin/?demo): se puede tocar todo sin que nada se publique.
import type { APIRoute } from 'astro';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const raiz = process.cwd();

async function listar(dir: string, filtro: RegExp): Promise<string[]> {
  const salida: string[] = [];
  const recorrer = async (d: string) => {
    for (const e of await readdir(join(raiz, d), { withFileTypes: true })) {
      const ruta = `${d}/${e.name}`;
      if (e.isDirectory()) await recorrer(ruta);
      else if (filtro.test(e.name)) salida.push(ruta);
    }
  };
  await recorrer(dir);
  return salida;
}

export const GET: APIRoute = async () => {
  const textos: Record<string, string> = {};
  const rutas = [
    ...(await listar('src/data', /\.json$/)),
    ...(await listar('src/content/blog', /\.md$/)),
    ...(await listar('src/content/servicios', /\.md$/)),
  ];
  for (const r of rutas) textos[r] = await readFile(join(raiz, r), 'utf8');
  const imagenes = [...(await listar('public/uploads', /\.(jpe?g|png|webp|gif|avif|svg)$/i)), ...(await listar('src/assets/fotos', /\.(jpe?g|png|webp|gif|avif|svg)$/i))];
  const medios = await Promise.all(imagenes.map(async (ruta) => ({ ruta, tamano: (await stat(join(raiz, ruta))).size })));
  return new Response(JSON.stringify({ textos, medios }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
