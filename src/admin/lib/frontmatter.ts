// Leer y escribir archivos Markdown con cabecera YAML (artículos y servicios).
import YAML from 'yaml';

export type Documento<T = Record<string, unknown>> = { datos: T; cuerpo: string };

export function leerMd<T = Record<string, unknown>>(texto: string): Documento<T> {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { datos: {} as T, cuerpo: texto };
  const datos = (YAML.parse(m[1]) ?? {}) as Record<string, unknown>;
  // Las fechas se manejan como texto AAAA-MM-DD en el panel.
  for (const [k, v] of Object.entries(datos)) if (v instanceof Date) datos[k] = v.toISOString().slice(0, 10);
  return { datos: datos as T, cuerpo: m[2].replace(/^\r?\n/, '') };
}

export function escribirMd(datos: Record<string, unknown>, cuerpo: string): string {
  // Quita los campos vacíos para no ensuciar el archivo.
  const limpio = Object.fromEntries(
    Object.entries(datos).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)),
  );
  const yaml = YAML.stringify(limpio, { lineWidth: 0, defaultStringType: 'PLAIN', defaultKeyType: 'PLAIN' }).trimEnd();
  return `---\n${yaml}\n---\n\n${cuerpo.trim()}\n`;
}
