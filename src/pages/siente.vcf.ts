// Ficha de contacto (vCard) para «Guardar en contactos»: nombre, teléfonos,
// dirección, horario y el logo como foto del contacto.
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { negocio, telHref, horarioAgrupado } from '../lib/negocio';
import { urlAbsoluta } from '../lib/url';

// RFC 2426: escapar , ; \ y plegar líneas largas a 75 caracteres.
const escapar = (s: string) => s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');
const plegar = (linea: string) => {
  const trozos = [];
  for (let i = 0; i < linea.length; i += i === 0 ? 75 : 74) trozos.push(linea.slice(i, i + (i === 0 ? 75 : 74)));
  return trozos.join('\r\n ');
};

export const GET: APIRoute = async () => {
  const foto = (await readFile(join(process.cwd(), 'public', 'apple-touch-icon.png'))).toString('base64');
  const horario = horarioAgrupado()
    .map((g) => `${g.dias}: ${g.tramos.length ? g.tramos.join(' y ') : 'cerrado'}`)
    .join('. ');
  const { calle, ciudad, region, codigoPostal } = negocio.direccion;

  const lineas = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:;${escapar(negocio.nombre)};;;`,
    `FN:${escapar(negocio.nombre)}`,
    `ORG:${escapar(negocio.nombre)}`,
    `TEL;TYPE=WORK,VOICE:${telHref(negocio.telefono).replace('tel:', '')}`,
    `TEL;TYPE=CELL:${telHref(negocio.movil).replace('tel:', '')}`,
    `EMAIL;TYPE=INTERNET,WORK:${negocio.email}`,
    `ADR;TYPE=WORK:;;${escapar(calle)};${escapar(ciudad)};${escapar(region)};${codigoPostal};España`,
    `GEO:${negocio.geo.lat};${negocio.geo.lng}`,
    `URL:${urlAbsoluta('/')}`,
    `NOTE:${escapar(`Óptica y centro auditivo en ${negocio.direccion.barrio}. ${horario}. WhatsApp: ${negocio.movil}.`)}`,
    `PHOTO;ENCODING=b;TYPE=PNG:${foto}`,
    'END:VCARD',
  ];

  return new Response(lineas.map(plegar).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/vcard; charset=utf-8' },
  });
};
