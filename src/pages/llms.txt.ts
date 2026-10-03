// llms.txt: resumen en texto plano para asistentes de IA (ChatGPT, Perplexity,
// Gemini…), que cada vez más gente usa para buscar «óptica cerca de mí».
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { negocio, horarioAgrupado, direccionCompleta, planVeoVigente } from '../lib/negocio';
import { urlAbsoluta } from '../lib/url';
import { rutasPublicas } from '../lib/rutas';

export const GET: APIRoute = async () => {
  const servicios = (await getCollection('servicios')).sort((a, b) => a.data.order - b.data.order);
  const horario = horarioAgrupado()
    .map((g) => `- ${g.dias}: ${g.tramos.length ? g.tramos.join(' y ') : 'cerrado'}`)
    .join('\n');
  const paginas = (await rutasPublicas())
    .filter((r) => r.prioridad >= 0.6)
    .map((r) => `- [${r.titulo}](${urlAbsoluta(r.ruta)})`)
    .join('\n');

  const texto = `# ${negocio.nombre}

> Óptica y centro auditivo en el barrio de ${negocio.direccion.barrio} (Madrid). Revisión de la vista gratuita, gafas graduadas y de sol, lentes progresivas, lentillas y control de miopía infantil, revisión auditiva en cabina insonorizada, adaptación y mantenimiento de audífonos.${planVeoVigente() ? ' Óptica adherida al Plan VEO (ayuda de hasta 100 € para gafas o lentillas de menores de 16 años).' : ''}

## Datos de contacto

- Dirección: ${direccionCompleta} (muy cerca del Metro Barajas, Línea 8)
- Teléfono: ${negocio.telefono}
- Móvil y WhatsApp: ${negocio.movil}
- Correo: ${negocio.email}
- Pedir cita: ${urlAbsoluta('/pedir-cita/')}
- Zonas cercanas: ${negocio.zonas.join(', ')}

## Horario

${horario}

## Servicios

${servicios.map((s) => `- ${s.data.title}: ${s.data.summary}`).join('\n')}

## Páginas principales

${paginas}
`;
  return new Response(texto, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
