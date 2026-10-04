// Datos estructurados (schema.org) para que Google entienda qué es Siente,
// dónde está, cuándo abre y qué ofrece.
import { negocio, horarioPorDia, DIAS, telHref, direccionCompleta, cierresPendientes } from './negocio';
import { urlAbsoluta } from './url';

const DIA_SCHEMA = {
  lunes: 'Monday',
  martes: 'Tuesday',
  miercoles: 'Wednesday',
  jueves: 'Thursday',
  viernes: 'Friday',
  sabado: 'Saturday',
  domingo: 'Sunday',
} as const;

export const ID_NEGOCIO = urlAbsoluta('/#negocio');
export const ID_WEB = urlAbsoluta('/#web');

const tel = (n: string) => telHref(n).replace('tel:', '');

export function esquemaNegocio() {
  const porDia = horarioPorDia();
  // Agrupa los tramos idénticos en una sola especificación.
  const especificaciones = new Map<string, string[]>();
  for (const d of DIAS) {
    for (const t of porDia[d]) {
      const clave = `${t.abre}-${t.cierra}`;
      especificaciones.set(clave, [...(especificaciones.get(clave) ?? []), DIA_SCHEMA[d]]);
    }
  }
  const sameAs = [negocio.redes.instagram, negocio.redes.facebook].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': ['Optician', 'MedicalBusiness'],
    '@id': ID_NEGOCIO,
    name: negocio.nombre,
    alternateName: [`${negocio.nombreCorto} Óptica`, `Óptica ${negocio.nombreCorto} Barajas`],
    slogan: negocio.eslogan,
    description:
      'Óptica y centro auditivo en Barajas (Madrid): revisión de la vista gratuita, gafas graduadas y progresivas, lentillas, control de miopía, revisión auditiva en cabina y adaptación de audífonos. Óptica adherida al Plan VEO.',
    url: urlAbsoluta('/'),
    logo: urlAbsoluta('/brand/logo-siente.png'),
    image: [urlAbsoluta('/og/inicio.png')],
    telephone: tel(negocio.telefono),
    email: negocio.email,
    priceRange: '€€',
    currenciesAccepted: 'EUR',
    address: {
      '@type': 'PostalAddress',
      streetAddress: negocio.direccion.calle,
      postalCode: negocio.direccion.codigoPostal,
      addressLocality: negocio.direccion.ciudad,
      addressRegion: negocio.direccion.region,
      addressCountry: 'ES',
    },
    geo: { '@type': 'GeoCoordinates', latitude: negocio.geo.lat, longitude: negocio.geo.lng },
    hasMap: negocio.redes.googleMaps,
    openingHoursSpecification: [...especificaciones].map(([clave, dias]) => {
      const [opens, closes] = clave.split('-');
      return { '@type': 'OpeningHoursSpecification', dayOfWeek: dias, opens, closes };
    }),
    // Vacaciones y festivos: Google los muestra como «Cerrado» esos días.
    specialOpeningHoursSpecification: cierresPendientes().map((c) => ({
      '@type': 'OpeningHoursSpecification',
      opens: '00:00',
      closes: '00:00',
      validFrom: c.desde,
      validThrough: c.hasta,
    })),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: tel(negocio.telefono),
        contactType: 'customer service',
        areaServed: 'ES',
        availableLanguage: 'es',
      },
      {
        '@type': 'ContactPoint',
        telephone: tel(negocio.movil),
        contactType: 'reservations',
        description: 'Citas también por WhatsApp',
        availableLanguage: 'es',
      },
    ],
    areaServed: negocio.zonas.map((z) => ({ '@type': 'Place', name: `${z}, Madrid` })),
    knowsAbout: [
      'Optometría',
      'Revisión de la vista',
      'Lentes progresivas',
      'Lentes de contacto',
      'Control de miopía',
      'Audiometría',
      'Audífonos',
      'Plan VEO',
    ],
    sameAs,
    parentOrganization: { '@type': 'Organization', name: negocio.razonSocial, taxID: negocio.nif },
  };
}

export function esquemaWeb() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': ID_WEB,
    url: urlAbsoluta('/'),
    name: negocio.nombre,
    inLanguage: 'es-ES',
    publisher: { '@id': ID_NEGOCIO },
  };
}

export function esquemaMigas(migas: { nombre: string; ruta: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: migas.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.nombre,
      item: urlAbsoluta(m.ruta),
    })),
  };
}

export function esquemaFaq(preguntas: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: preguntas.map((p) => ({
      '@type': 'Question',
      name: p.q,
      acceptedAnswer: { '@type': 'Answer', text: p.a },
    })),
  };
}

export function esquemaServicio(s: { nombre: string; descripcion: string; ruta: string; tipo: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.nombre,
    serviceType: s.tipo,
    description: s.descripcion,
    url: urlAbsoluta(s.ruta),
    provider: { '@id': ID_NEGOCIO },
    areaServed: { '@type': 'Place', name: `${negocio.direccion.barrio}, ${negocio.direccion.ciudad}` },
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceLocation: { '@type': 'Place', name: negocio.nombre, address: direccionCompleta },
    },
  };
}

export function esquemaArticulo(a: {
  titulo: string;
  descripcion: string;
  ruta: string;
  fecha: Date;
  actualizado?: Date;
  imagen?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.titulo,
    description: a.descripcion,
    mainEntityOfPage: urlAbsoluta(a.ruta),
    datePublished: a.fecha.toISOString(),
    dateModified: (a.actualizado ?? a.fecha).toISOString(),
    image: a.imagen ? [urlAbsoluta(a.imagen)] : undefined,
    inLanguage: 'es-ES',
    author: { '@type': 'Organization', name: `Equipo ${negocio.nombreCorto}`, url: urlAbsoluta('/sobre-nosotros/') },
    publisher: { '@id': ID_NEGOCIO },
  };
}
