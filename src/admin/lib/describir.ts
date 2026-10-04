// Describe en palabras qué ha cambiado en los datos del centro, para la
// bandeja de cambios y el historial.
const NOMBRES: Record<string, string> = {
  horario: 'horario',
  cierres: 'cierres y vacaciones',
  aviso: 'aviso de la web',
  telefono: 'teléfono',
  movil: 'móvil',
  whatsapp: 'WhatsApp',
  email: 'correo',
  direccion: 'dirección',
  geo: 'ubicación en el mapa',
  redes: 'redes sociales',
  marcas: 'marcas',
  zonas: 'barrios',
  planVeo: 'Plan VEO',
  analitica: 'analítica',
  comoLlegar: 'cómo llegar',
};

export function describirCambios(original: Record<string, unknown> | null, nuevo: Record<string, unknown>, porDefecto: string): string {
  if (!original) return porDefecto;
  const claves = Object.keys(nuevo).filter((k) => JSON.stringify(original[k]) !== JSON.stringify(nuevo[k]));
  if (!claves.length) return porDefecto;
  const nombres = claves.map((k) => NOMBRES[k] ?? 'datos del centro');
  const unicos = [...new Set(nombres)];
  const texto = unicos.length > 3 ? `${unicos.slice(0, 3).join(', ')} y más` : unicos.join(', ').replace(/, ([^,]*)$/, ' y $1');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
