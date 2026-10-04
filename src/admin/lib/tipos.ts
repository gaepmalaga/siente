// Tipos compartidos del panel.

export type ConfigPanel = {
  /** Repositorio «propietario/nombre». */
  repo: string;
  rama: string;
  /** URL pública de la web, con barra final. */
  sitio: string;
  /** Subcarpeta de la web («/siente/» o «/»). */
  base: string;
  /** JSON con el contenido para el modo demostración. */
  demoUrl: string;
  /** Servidor OAuth opcional (Sveltia CMS Authenticator o compatible). */
  authUrl: string;
};

export type Usuario = { login: string; nombre: string; avatar: string; caducidad?: string | null };

/** Un archivo del repositorio tal y como lo cargamos. */
export type Archivo = { ruta: string; sha: string; texto?: string; tamano?: number };

export type Medio = {
  ruta: string;
  sha: string;
  tamano: number;
  /** URL para la miniatura. */
  url: string;
  /** Subida en esta sesión y aún sin publicar. */
  pendiente?: boolean;
};

export type TipoCambio = 'crear' | 'modificar' | 'borrar';

export type Cambio = {
  ruta: string;
  tipo: TipoCambio;
  /** Texto UTF-8 o, si `binario`, base64. */
  contenido?: string;
  binario?: boolean;
  /** Qué ha cambiado, en palabras del panel. */
  descripcion: string;
  /** Vista previa local de una imagen subida. */
  vistaPrevia?: string;
};

export type EstadoDespliegue = {
  id: number;
  estado: 'en_cola' | 'en_curso' | 'ok' | 'error' | 'cancelado';
  sha: string;
  mensaje: string;
  inicio: string;
  fin?: string;
  url: string;
  pasos?: { nombre: string; estado: 'pendiente' | 'en_curso' | 'ok' | 'error' | 'saltado' }[];
};

export type EntradaHistorial = {
  sha: string;
  mensaje: string;
  autor: string;
  avatar?: string;
  fecha: string;
  url: string;
};

export type ArchivoCambiado = {
  ruta: string;
  estado: 'added' | 'modified' | 'removed' | 'renamed';
  parche?: string;
  adiciones: number;
  borrados: number;
};

export type Colaborador = { login: string; avatar: string; rol: string };
