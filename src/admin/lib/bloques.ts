// Textos que el análisis SEO puede añadir con un clic. Los que necesitan que
// alguien los complete llevan la marca MARCA_COMPLETAR: el panel no deja
// publicar mientras quede alguna.
import { estado } from './estado.svelte';
import { RUTAS } from './backend';
import { leerMd } from './frontmatter';
import { rutaWebServicio } from './paginas';
import { MARCA_COMPLETAR, type BloqueTexto } from './seo';
import { normalizar } from './texto';
import type { DatosNegocio } from '../../lib/esquemas';

/** Servicio más relacionado con un texto: el de su área cuyo nombre más aparece. */
export function servicioRelacionado(cuerpo: string, area: 'vista' | 'oido' | 'general'): { titulo: string; ruta: string } | null {
  const texto = normalizar(cuerpo);
  const candidatos = estado.rutas(RUTAS.servicios).map((r) => {
    const { datos } = leerMd<{ title?: string; area?: string; keyword?: string; order?: number }>(estado.texto(r) ?? '');
    const nombre = String(datos.title ?? '');
    const palabras = normalizar(`${nombre} ${datos.keyword ?? ''}`)
      .split(/\s+/)
      .filter((p) => p.length > 4);
    const coincidencias = palabras.filter((p) => texto.includes(p.slice(0, -1))).length;
    const mismaArea = area === 'general' || datos.area === area;
    return { titulo: nombre, ruta: rutaWebServicio(r), puntos: coincidencias + (mismaArea ? 1 : 0) - (datos.order ?? 50) / 1000, yaEnlazado: cuerpo.includes(rutaWebServicio(r)) };
  });
  const mejor = candidatos.filter((c) => !c.yaEnlazado && c.titulo).sort((a, b) => b.puntos - a.puntos)[0];
  return mejor ? { titulo: mejor.titulo, ruta: mejor.ruta } : null;
}

export function textoBloque(bloque: BloqueTexto, cuerpo: string, area: 'vista' | 'oido' | 'general'): string {
  const m = MARCA_COMPLETAR;
  switch (bloque) {
    case 'cita':
      return '[Pide tu cita en un minuto](/pedir-cita/).';
    case 'barajas': {
      const n = estado.json<DatosNegocio>(RUTAS.negocio);
      return `En ${n?.nombreCorto ?? 'Siente'} te atendemos en ${n?.direccion.calle ?? 'la Avenida de Logroño, 112'}, en ${n?.direccion.barrio ?? 'Barajas'} (Madrid), sin prisas y con cita.`;
    }
    case 'enlace': {
      const s = servicioRelacionado(cuerpo, area);
      return s ? `**Te puede interesar:** [${s.titulo}](${s.ruta}).` : `**Te puede interesar:** [${m} nombre de la página](/pedir-cita/).`;
    }
    case 'subtitulo':
      return `## ${m} Título del apartado\n\n${m} Explica aquí esta parte con un ejemplo del día a día.`;
    case 'preguntas':
      return [
        '## Preguntas frecuentes',
        `### ${m} ¿Una pregunta que os hacen en el centro?`,
        `${m} Respuesta breve y clara, de dos o tres frases.`,
        `### ${m} ¿Otra pregunta habitual?`,
        `${m} Respuesta breve y clara.`,
      ].join('\n\n');
  }
}

/**
 * Inserta un bloque en el texto. La llamada a pedir cita va al final; el resto,
 * justo antes de ella para que el texto siga terminando con la cita.
 */
export function insertarBloque(cuerpo: string, bloque: BloqueTexto, area: 'vista' | 'oido' | 'general'): string {
  const nuevo = textoBloque(bloque, cuerpo, area);
  const base = cuerpo.trimEnd();
  if (bloque === 'cita') return `${base}\n\n${nuevo}\n`;
  const parrafos = base.split(/\n\s*\n/);
  const ultimo = parrafos.length - 1;
  if (ultimo > 0 && /pedir-cita/.test(parrafos[ultimo])) {
    return `${[...parrafos.slice(0, ultimo), nuevo, parrafos[ultimo]].join('\n\n')}\n`;
  }
  return `${base}\n\n${nuevo}\n`;
}
