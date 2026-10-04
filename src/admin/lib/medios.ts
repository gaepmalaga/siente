// Fotos: rutas públicas, nombres libres y dónde se usa cada una.
import { estado } from './estado.svelte';
import { RUTAS } from './backend';
import { leerMd } from './frontmatter';

/** «public/uploads/blog/x.webp» → «/uploads/blog/x.webp» */
export const rutaPublica = (ruta: string) => ruta.replace(/^public/, '');
/** «src/assets/fotos/gabinete.jpg» → «gabinete» (lo que guardan los servicios) */
export const claveFoto = (ruta: string) => ruta.split('/').pop()!.replace(/\.[^.]+$/, '');
export const esFotoLocal = (ruta: string) => ruta.startsWith(RUTAS.fotos);

export function nombreLibre(carpeta: string, nombre: string): string {
  const existe = (r: string) => estado.medios.some((m) => m.ruta === r);
  const [base, ext] = [nombre.replace(/\.[^.]+$/, ''), nombre.split('.').pop()];
  let ruta = `${carpeta}${nombre}`;
  for (let i = 2; existe(ruta); i++) ruta = `${carpeta}${base}-${i}.${ext}`;
  return ruta;
}

export type Uso = { ruta: string; titulo: string; enlace: string };

export function usosDe(rutaMedio: string): Uso[] {
  const publica = rutaPublica(rutaMedio);
  const clave = claveFoto(rutaMedio);
  const usos: Uso[] = [];
  for (const ruta of [...estado.rutas(RUTAS.blog), ...estado.rutas(RUTAS.servicios)]) {
    const texto = estado.texto(ruta) ?? '';
    const { datos } = leerMd<Record<string, unknown>>(texto);
    const enUso = esFotoLocal(rutaMedio) ? datos.image === clave : texto.includes(publica);
    if (enUso) {
      const blog = ruta.startsWith(RUTAS.blog);
      const slug = ruta.split('/').pop()!.replace(/\.md$/, '');
      usos.push({ ruta, titulo: String(datos.title ?? slug), enlace: `/${blog ? 'blog' : 'servicios'}/${slug}` });
    }
  }
  for (const r of [RUTAS.portada, RUTAS.negocio, RUTAS.enlaces]) {
    if ((estado.texto(r) ?? '').includes(publica)) usos.push({ ruta: r, titulo: 'Datos de la web', enlace: '/' });
  }
  return usos;
}
