// Plantillas de WhatsApp para el día a día del centro. Pensadas para guardarse
// como «respuestas rápidas» de WhatsApp Business. [nombre], [día]… se rellenan
// a mano antes de enviar.
import { horarioAgrupado, negocio } from './negocio';
import { urlAbsoluta } from './url';

const horario = horarioAgrupado()
  .filter((g) => g.tramos.length)
  .map((g) => `${g.dias.toLowerCase()} de ${g.tramos.join(' y de ').replace(/ – /g, ' a ')}`)
  .join(', y ');

export const mensajes = [
  {
    atajo: '/resena',
    cuando: 'Después de entregar unas gafas, lentillas o audífonos',
    texto: `¡Hola, [nombre]! Gracias por confiar en Siente. Si estás contento con tu compra, ¿nos dejarías una reseña en Google? Te lleva un minuto y ayuda mucho a que otros vecinos de Barajas nos encuentren: ${urlAbsoluta('/resena/')}`,
  },
  {
    atajo: '/listas',
    cuando: 'El encargo está listo para recoger',
    texto: `¡Hola, [nombre]! Tus gafas ya están listas en Siente. Puedes pasar a recogerlas ${horario}. ¡Te esperamos en la ${negocio.direccion.calle}!`,
  },
  {
    atajo: '/cita',
    cuando: 'Recordatorio el día antes de una cita',
    texto: `Hola, [nombre]. Te recordamos tu cita en Siente mañana, [día], a las [hora]. Si no puedes venir, avísanos por aquí y te buscamos otro hueco.`,
  },
  {
    atajo: '/revision',
    cuando: 'Ha pasado un año desde la última revisión de la vista',
    texto: `¡Hola, [nombre]! Ya hace un año de tu última revisión de la vista en Siente. ¿Te apetece que la repasemos? Es gratis y sin compromiso. Puedes pedir cita aquí: ${urlAbsoluta('/pedir-cita/?servicio=revision-vista')}`,
  },
  {
    atajo: '/lentillas',
    cuando: 'Las lentillas del cliente están a punto de acabarse',
    texto: `Hola, [nombre]. Por nuestras cuentas, tus lentillas estarán a punto de acabarse. ¿Te las preparamos para que las recojas cuando te venga bien?`,
  },
  {
    atajo: '/audifonos',
    cuando: 'Toca la revisión periódica de los audífonos',
    texto: `Hola, [nombre]. Ya toca la revisión de tus audífonos: limpieza, filtros y ajuste para que sigan sonando como el primer día. ¿Qué día te viene bien pasarte?`,
  },
  {
    atajo: '/planveo',
    cuando: 'Familias con hijos de 16 años o menos (hasta fin de año)',
    texto: `Hola, [nombre]. Te recordamos que el Plan VEO (hasta 100 € para gafas o lentillas de menores de 16 años) se puede pedir hasta el 31 de diciembre. Lo tramitamos nosotros en el momento: ${urlAbsoluta('/plan-veo/')}`,
  },
  {
    atajo: 'Mensaje de ausencia',
    cuando: 'Respuesta automática fuera de horario (WhatsApp Business → Herramientas para la empresa)',
    texto: `¡Hola! Ahora mismo estamos cerrados, pero te contestamos en cuanto abramos. Si quieres, puedes pedir cita en un minuto aquí: ${urlAbsoluta('/pedir-cita/')}`,
  },
];
