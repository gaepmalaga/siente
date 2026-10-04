// Estadísticas de la web: Google Analytics 4 (qué pasa dentro de la web) y
// Search Console (cómo aparece en Google). En el modo demostración se generan
// datos de ejemplo verosímiles para enseñar la pantalla.
import { estado } from './estado.svelte';
import { google } from './google.svelte';
import { paginasInternas } from './paginas';
import { ahoraEnMadrid, sumarDias } from '../../lib/horario';

export type Periodo = 7 | 28 | 90;
export type Cifra = { actual: number; anterior: number };

/** Eventos que envía la web (ver README → Activar Google Analytics). */
export const EVENTOS = {
  generate_lead: 'Citas pedidas en la web',
  clic_whatsapp: 'Clics en WhatsApp',
  clic_llamar: 'Llamadas desde la web',
  clic_como_llegar: 'Cómo llegar',
  clic_pedir_cita: 'Clics en «Pedir cita»',
  guardar_contacto: 'Contacto guardado',
  clic_enlace_bio: 'Clics desde la bio de Instagram',
} as const;
export type Evento = keyof typeof EVENTOS;
const CONTACTOS: Evento[] = ['generate_lead', 'clic_whatsapp', 'clic_llamar'];

export type InformeAnalytics = {
  visitas: Cifra;
  personas: Cifra;
  vistas: Cifra;
  eventos: Record<Evento, Cifra>;
  dias: { fecha: string; visitas: number; contactos: number }[];
  canales: { nombre: string; visitas: number }[];
  fuentes: { nombre: string; visitas: number }[];
  paginas: { ruta: string; titulo: string; vistas: number }[];
};

export type Consulta = { consulta: string; clics: number; impresiones: number; ctr: number; posicion: number };

export type InformeSearch = {
  clics: Cifra;
  impresiones: Cifra;
  ctr: Cifra;
  posicion: Cifra;
  dias: { fecha: string; clics: number; impresiones: number }[];
  consultas: Consulta[];
  paginas: { ruta: string; titulo: string; clics: number; impresiones: number; posicion: number }[];
};

export type RendimientoPagina = { clics: number; impresiones: number; posicion: number; consultas: Consulta[] };

const CANALES: Record<string, string> = {
  'Organic Search': 'Google y otros buscadores',
  Direct: 'Directo (enlace guardado o escrito)',
  'Organic Social': 'Redes sociales',
  'Organic Maps': 'Google Maps',
  Referral: 'Otras webs',
  'Paid Search': 'Anuncios en buscadores',
  'Paid Social': 'Anuncios en redes',
  Email: 'Correo',
  'Organic Video': 'Vídeo',
  Unassigned: 'Sin identificar',
};

// ── Utilidades ──────────────────────────────────────────────────────────────

const titulos = () => new Map(paginasInternas().map((p) => [p.ruta, p.titulo]));

/** «https://…/siente/blog/x/» o «/siente/blog/x/» → «/blog/x/» */
export function rutaInterna(url: string): string {
  const base = estado.config.base.replace(/\/$/, '');
  let ruta = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  if (base && ruta.startsWith(base)) ruta = ruta.slice(base.length) || '/';
  return ruta || '/';
}

export const variacion = (c: Cifra) => (c.anterior ? (c.actual - c.anterior) / c.anterior : c.actual ? 1 : 0);

const rangos = (dias: Periodo) => {
  const hoy = ahoraEnMadrid().iso;
  return {
    actual: { desde: sumarDias(hoy, -(dias - 1)), hasta: hoy },
    anterior: { desde: sumarDias(hoy, -(2 * dias - 1)), hasta: sumarDias(hoy, -dias) },
  };
};

// ── Google Analytics 4 ──────────────────────────────────────────────────────

type FilaGa = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type InformeGa = { dimensionHeaders?: { name: string }[]; rows?: FilaGa[] };

function filas(r: InformeGa) {
  const dims = (r.dimensionHeaders ?? []).map((h) => h.name);
  return (r.rows ?? []).map((f) => {
    const d: Record<string, string> = {};
    dims.forEach((n, i) => (d[n] = f.dimensionValues?.[i]?.value ?? ''));
    return { d, m: (f.metricValues ?? []).map((v) => Number(v.value) || 0) };
  });
}

export async function informeAnalytics(propiedad: string, dias: Periodo): Promise<InformeAnalytics> {
  if (estado.modo === 'demo') return ejemploAnalytics(dias);
  const r = rangos(dias);
  const dos = [
    { startDate: r.actual.desde, endDate: r.actual.hasta, name: 'actual' },
    { startDate: r.anterior.desde, endDate: r.anterior.hasta, name: 'anterior' },
  ];
  const uno = [dos[0]];
  const filtro = (nombres: string[]) => ({ filter: { fieldName: 'eventName', inListFilter: { values: nombres } } });
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propiedad}:batchRunReports`;
  const [a, b] = await Promise.all([
    google.pedir<{ reports: InformeGa[] }>(url, {
      requests: [
        { dateRanges: dos, metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }] },
        { dateRanges: dos, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: filtro(Object.keys(EVENTOS)) },
        { dateRanges: uno, dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
        { dateRanges: uno, dimensions: [{ name: 'date' }, { name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: filtro(CONTACTOS), limit: 2000 },
        { dateRanges: uno, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], limit: 8 },
      ],
    }),
    google.pedir<{ reports: InformeGa[] }>(url, {
      requests: [
        { dateRanges: uno, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 },
        { dateRanges: uno, dimensions: [{ name: 'sessionSource' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 },
      ],
    }),
  ]);
  const [tot, ev, diario, contactos, canales] = a.reports;
  const [paginas, fuentes] = b.reports;

  const cifra = (rows: ReturnType<typeof filas>, i: number, filtroFila: (d: Record<string, string>) => boolean = () => true): Cifra => ({
    actual: rows.filter((x) => filtroFila(x.d) && (x.d.dateRange ?? 'actual') === 'actual').reduce((s, x) => s + x.m[i], 0),
    anterior: rows.filter((x) => filtroFila(x.d) && x.d.dateRange === 'anterior').reduce((s, x) => s + x.m[i], 0),
  });
  const t = filas(tot);
  const e = filas(ev);
  const eventos = Object.fromEntries(Object.keys(EVENTOS).map((n) => [n, cifra(e, 0, (d) => d.eventName === n)])) as Record<Evento, Cifra>;

  const porDia = new Map<string, { visitas: number; contactos: number }>();
  for (let i = 0; i < dias; i++) porDia.set(sumarDias(r.actual.desde, i), { visitas: 0, contactos: 0 });
  const iso = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  for (const x of filas(diario)) porDia.get(iso(x.d.date)) && (porDia.get(iso(x.d.date))!.visitas = x.m[0]);
  for (const x of filas(contactos)) porDia.get(iso(x.d.date)) && (porDia.get(iso(x.d.date))!.contactos += x.m[0]);

  const mapa = titulos();
  return {
    visitas: cifra(t, 0),
    personas: cifra(t, 1),
    vistas: cifra(t, 2),
    eventos,
    dias: [...porDia].map(([fecha, v]) => ({ fecha, ...v })),
    canales: filas(canales).map((x) => ({ nombre: CANALES[x.d.sessionDefaultChannelGroup] ?? x.d.sessionDefaultChannelGroup, visitas: x.m[0] })),
    fuentes: filas(fuentes).map((x) => ({ nombre: x.d.sessionSource === '(direct)' ? 'Directo' : x.d.sessionSource, visitas: x.m[0] })),
    paginas: filas(paginas).map((x) => {
      const ruta = rutaInterna(x.d.pagePath);
      return { ruta, titulo: mapa.get(ruta) ?? ruta, vistas: x.m[0] };
    }),
  };
}

// ── Search Console ──────────────────────────────────────────────────────────

type FilaSc = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

const urlSc = (sitio: string) => `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(sitio)}/searchAnalytics/query`;

export async function informeSearch(sitio: string, dias: Periodo): Promise<InformeSearch> {
  if (estado.modo === 'demo') return ejemploSearch(dias);
  const r = rangos(dias);
  const q = (rango: { desde: string; hasta: string }, extra: Record<string, unknown> = {}) =>
    google.pedir<{ rows?: FilaSc[] }>(urlSc(sitio), { startDate: rango.desde, endDate: rango.hasta, dataState: 'all', ...extra }).then((x) => x.rows ?? []);
  const [tot, totAnt, diario, consultas, paginas] = await Promise.all([
    q(r.actual),
    q(r.anterior),
    q(r.actual, { dimensions: ['date'], rowLimit: 400 }),
    q(r.actual, { dimensions: ['query'], rowLimit: 25 }),
    q(r.actual, { dimensions: ['page'], rowLimit: 50 }),
  ]);
  const c = (a?: FilaSc, b?: FilaSc, k: keyof FilaSc = 'clicks'): Cifra => ({ actual: Number(a?.[k] ?? 0), anterior: Number(b?.[k] ?? 0) });
  const porDia = new Map<string, { clics: number; impresiones: number }>();
  for (let i = 0; i < dias; i++) porDia.set(sumarDias(r.actual.desde, i), { clics: 0, impresiones: 0 });
  for (const x of diario) if (porDia.has(x.keys![0])) porDia.set(x.keys![0], { clics: x.clicks, impresiones: x.impressions });
  const mapa = titulos();
  return {
    clics: c(tot[0], totAnt[0], 'clicks'),
    impresiones: c(tot[0], totAnt[0], 'impressions'),
    ctr: c(tot[0], totAnt[0], 'ctr'),
    posicion: c(tot[0], totAnt[0], 'position'),
    dias: [...porDia].map(([fecha, v]) => ({ fecha, ...v })),
    consultas: consultas.map(aConsulta),
    paginas: paginas.map((x) => {
      const ruta = rutaInterna(x.keys![0]);
      return { ruta, titulo: mapa.get(ruta) ?? ruta, clics: x.clicks, impresiones: x.impressions, posicion: x.position };
    }),
  };
}

const aConsulta = (x: FilaSc): Consulta => ({ consulta: x.keys![0], clics: x.clicks, impresiones: x.impressions, ctr: x.ctr, posicion: x.position });

/** Cómo le va en Google a una página concreta (últimos 90 días). */
export async function rendimientoPagina(sitio: string, ruta: string): Promise<RendimientoPagina> {
  if (estado.modo === 'demo') return ejemploPagina(ruta);
  const r = rangos(90);
  const url = `${estado.config.sitio.replace(/\/$/, '')}${ruta}`;
  const filtro = { dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'equals', expression: url }] }] };
  const base = { startDate: r.actual.desde, endDate: r.actual.hasta, dataState: 'all', ...filtro };
  const [tot, consultas] = await Promise.all([
    google.pedir<{ rows?: FilaSc[] }>(urlSc(sitio), base),
    google.pedir<{ rows?: FilaSc[] }>(urlSc(sitio), { ...base, dimensions: ['query'], rowLimit: 10 }),
  ]);
  const t = tot.rows?.[0];
  return { clics: t?.clicks ?? 0, impresiones: t?.impressions ?? 0, posicion: t?.position ?? 0, consultas: (consultas.rows ?? []).map(aConsulta) };
}

// ── Propiedades disponibles (para elegirlas sin copiar números) ─────────────

export async function propiedadesAnalytics(): Promise<{ id: string; nombre: string; cuenta: string }[]> {
  const r = await google.pedir<{ accountSummaries?: { displayName: string; propertySummaries?: { property: string; displayName: string }[] }[] }>(
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200',
  );
  return (r.accountSummaries ?? []).flatMap((c) =>
    (c.propertySummaries ?? []).map((p) => ({ id: p.property.replace('properties/', ''), nombre: p.displayName, cuenta: c.displayName })),
  );
}

export async function sitiosSearchConsole(): Promise<{ sitio: string; permiso: string }[]> {
  const r = await google.pedir<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>('https://searchconsole.googleapis.com/webmasters/v3/sites');
  return (r.siteEntry ?? []).filter((s) => s.permissionLevel !== 'siteUnverifiedUser').map((s) => ({ sitio: s.siteUrl, permiso: s.permissionLevel }));
}

// ── Datos de ejemplo (modo demostración) ────────────────────────────────────

function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) % 10_000) / 10_000;
}
const hash = (t: string) => [...t].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

function serie(dias: number, desde: string, base: number, semilla: number) {
  const r = azar(semilla);
  return Array.from({ length: dias }, (_, i) => {
    const fecha = sumarDias(desde, i);
    const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
    const factor = dia === 0 ? 0.45 : dia === 6 ? 0.8 : dia === 1 ? 1.15 : 1;
    return { fecha, v: Math.max(0, Math.round(base * factor * (0.7 + r() * 0.6))) };
  });
}

function ejemploAnalytics(dias: Periodo): InformeAnalytics {
  const r = rangos(dias);
  const act = serie(dias, r.actual.desde, 34, 7);
  const ant = serie(dias, r.anterior.desde, 29, 11);
  const contactos = serie(dias, r.actual.desde, 2.2, 3);
  const suma = (x: { v: number }[]) => x.reduce((s, y) => s + y.v, 0);
  const visitas = { actual: suma(act), anterior: suma(ant) };
  const e = (f: number, g: number): Cifra => ({ actual: Math.round(visitas.actual * f), anterior: Math.round(visitas.anterior * g) });
  const paginas = paginasInternas();
  const elegir = (rutas: string[]) => rutas.map((ruta) => paginas.find((p) => p.ruta === ruta) ?? { ruta, titulo: ruta });
  const top = elegir(['/', '/enlaces/', '/pedir-cita/', '/optica-barajas/revision-de-la-vista/', '/audifonos-barajas/', '/plan-veo/', '/contacto/']);
  const blog = paginas.filter((p) => p.grupo === 'Blog').slice(0, 3);
  return {
    visitas,
    personas: { actual: Math.round(visitas.actual * 0.78), anterior: Math.round(visitas.anterior * 0.8) },
    vistas: { actual: Math.round(visitas.actual * 2.3), anterior: Math.round(visitas.anterior * 2.2) },
    eventos: {
      generate_lead: e(0.021, 0.016),
      clic_whatsapp: e(0.048, 0.04),
      clic_llamar: e(0.026, 0.027),
      clic_como_llegar: e(0.031, 0.025),
      clic_pedir_cita: e(0.057, 0.044),
      guardar_contacto: e(0.006, 0.004),
      clic_enlace_bio: e(0.09, 0.07),
    },
    dias: act.map((x, i) => ({ fecha: x.fecha, visitas: x.v, contactos: contactos[i].v })),
    canales: [
      { nombre: CANALES['Organic Search'], visitas: Math.round(visitas.actual * 0.41) },
      { nombre: CANALES['Organic Social'], visitas: Math.round(visitas.actual * 0.27) },
      { nombre: CANALES.Direct, visitas: Math.round(visitas.actual * 0.19) },
      { nombre: CANALES['Organic Maps'], visitas: Math.round(visitas.actual * 0.09) },
      { nombre: CANALES.Referral, visitas: Math.round(visitas.actual * 0.04) },
    ],
    fuentes: [
      { nombre: 'google', visitas: Math.round(visitas.actual * 0.43) },
      { nombre: 'instagram.com', visitas: Math.round(visitas.actual * 0.25) },
      { nombre: 'Directo', visitas: Math.round(visitas.actual * 0.19) },
      { nombre: 'l.instagram.com', visitas: Math.round(visitas.actual * 0.05) },
      { nombre: 'facebook.com', visitas: Math.round(visitas.actual * 0.03) },
    ],
    paginas: [...top.slice(0, 4), ...blog, ...top.slice(4)].slice(0, 10).map((p, i) => ({ ruta: p.ruta, titulo: p.titulo, vistas: Math.round((visitas.actual * 0.9) / (i + 1.3)) })),
  };
}

const CONSULTAS_EJEMPLO = [
  'optica barajas',
  'siente optica',
  'audifonos barajas',
  'revision vista gratis barajas',
  'optica avenida de logroño',
  'tipos de tapones para los oidos',
  'centro auditivo barajas',
  'lentes progresivas barajas',
  'datos curiosos del oido',
  'plan veo gafas madrid',
  'diferencia oftalmologo optometrista',
  'fatiga visual sintomas',
];

function ejemploSearch(dias: Periodo): InformeSearch {
  const r = rangos(dias);
  const imp = serie(dias, r.actual.desde, 95, 21);
  const cli = serie(dias, r.actual.desde, 6, 5);
  const suma = (x: { v: number }[]) => x.reduce((s, y) => s + y.v, 0);
  const impresiones = { actual: suma(imp), anterior: Math.round(suma(imp) * 0.82) };
  const clics = { actual: suma(cli), anterior: Math.round(suma(cli) * 0.77) };
  const azarC = azar(99);
  const paginas = paginasInternas();
  return {
    clics,
    impresiones,
    ctr: { actual: clics.actual / impresiones.actual, anterior: clics.anterior / impresiones.anterior },
    posicion: { actual: 13.4, anterior: 16.1 },
    dias: imp.map((x, i) => ({ fecha: x.fecha, impresiones: x.v, clics: cli[i].v })),
    consultas: CONSULTAS_EJEMPLO.map((consulta, i) => {
      const impresiones = Math.round((impresiones_base(i) * dias) / 28);
      const posicion = Math.round((1.5 + i * 1.6 + azarC() * 3) * 10) / 10;
      const clicsC = Math.round(impresiones * Math.max(0.01, 0.32 - posicion * 0.02));
      return { consulta, impresiones, clics: clicsC, ctr: clicsC / Math.max(1, impresiones), posicion };
    }),
    paginas: paginas
      .filter((p) => p.grupo !== 'Páginas' || p.ruta === '/')
      .slice(0, 8)
      .map((p, i) => ({ ruta: p.ruta, titulo: p.titulo, clics: Math.round((clics.actual * 0.6) / (i + 1)), impresiones: Math.round((impresiones.actual * 0.5) / (i + 1)), posicion: 4 + i * 2.3 })),
  };
}
const impresiones_base = (i: number) => Math.round(420 / (i + 1.4));

function ejemploPagina(ruta: string): RendimientoPagina {
  const r = azar(hash(ruta));
  const impresiones = Math.round(120 + r() * 900);
  const posicion = Math.round((4 + r() * 14) * 10) / 10;
  const palabras = ruta.split('/').filter(Boolean).pop()?.split('-').filter((p) => p.length > 3) ?? [];
  const consultas = [palabras.slice(0, 3).join(' '), `${palabras.slice(0, 2).join(' ')} barajas`, palabras.slice(1, 4).join(' ')]
    .filter((c, i, a) => c.trim() && a.indexOf(c) === i)
    .map((consulta, i) => {
      const imp = Math.round(impresiones / (i + 1.6));
      const pos = Math.round((posicion + i * 2.5) * 10) / 10;
      const cl = Math.round(imp * Math.max(0.01, 0.25 - pos * 0.012));
      return { consulta, impresiones: imp, clics: cl, ctr: cl / Math.max(1, imp), posicion: pos };
    });
  return { impresiones, posicion, clics: consultas.reduce((s, c) => s + c.clics, 0), consultas };
}
