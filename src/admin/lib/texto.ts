// Utilidades de texto, fechas y codificación para el panel.

export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
}

/** Minúsculas sin tildes, para comparar palabras clave. */
export const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const RELATIVO = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function hace(fechaIso: string | Date, ahora = Date.now()): string {
  const t = typeof fechaIso === 'string' ? Date.parse(fechaIso) : fechaIso.getTime();
  const s = Math.round((t - ahora) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return 'ahora mismo';
  if (abs < 3600) return RELATIVO.format(Math.round(s / 60), 'minute');
  if (abs < 86_400) return RELATIVO.format(Math.round(s / 3600), 'hour');
  if (abs < 86_400 * 30) return RELATIVO.format(Math.round(s / 86_400), 'day');
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const fechaCorta = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export const fechaHora = (iso: string | Date) =>
  new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const hoyIso = () => new Date().toISOString().slice(0, 10);

export function tamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function saludo(fecha = new Date()): string {
  const h = fecha.getHours();
  return h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

// ── Base64 con UTF-8 ────────────────────────────────────────────────────────

export function base64ATexto(b64: string): string {
  const binario = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function bytesABase64(bytes: Uint8Array): string {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

export const textoABase64 = (t: string) => bytesABase64(new TextEncoder().encode(t));

export const clonar = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export const contarPalabras = (t: string) => (t.match(/[\p{L}\p{N}]+/gu) ?? []).length;
