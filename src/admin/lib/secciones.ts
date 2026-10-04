// Secciones del panel (menú lateral y buscador).
import type { NombreIcono } from './iconos';

export type Seccion = { ruta: string; titulo: string; icono: NombreIcono; grupo: string; descripcion: string };

export const SECCIONES: Seccion[] = [
  { ruta: '/', titulo: 'Resumen', icono: 'LayoutDashboard', grupo: '', descripcion: 'Estado de la web y tareas pendientes' },
  { ruta: '/horario', titulo: 'Horario y avisos', icono: 'Clock', grupo: 'El centro', descripcion: 'Horario, vacaciones, festivos y avisos' },
  { ruta: '/centro', titulo: 'Datos del centro', icono: 'Store', grupo: 'El centro', descripcion: 'Contacto, redes, Plan VEO y analítica' },
  { ruta: '/portada', titulo: 'Portada', icono: 'House', grupo: 'La web', descripcion: 'Titular y destacados de la página de inicio' },
  { ruta: '/servicios', titulo: 'Servicios', icono: 'Stethoscope', grupo: 'La web', descripcion: 'Las páginas de cada servicio' },
  { ruta: '/blog', titulo: 'Blog', icono: 'Newspaper', grupo: 'La web', descripcion: 'Artículos, borradores y programados' },
  { ruta: '/resenas', titulo: 'Reseñas', icono: 'Star', grupo: 'La web', descripcion: 'Opiniones de clientes en la portada' },
  { ruta: '/enlaces', titulo: 'Enlaces de Instagram', icono: 'Link', grupo: 'La web', descripcion: 'La página de la bio de Instagram' },
  { ruta: '/fotos', titulo: 'Fotos', icono: 'Images', grupo: 'Recursos', descripcion: 'Fototeca de la web' },
  { ruta: '/historial', titulo: 'Historial', icono: 'History', grupo: 'Sistema', descripcion: 'Quién cambió qué, y deshacer' },
  { ruta: '/accesos', titulo: 'Accesos', icono: 'Users', grupo: 'Sistema', descripcion: 'Quién puede entrar al panel' },
];
