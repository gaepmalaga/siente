<script lang="ts">
  import Icono from '../componentes/Icono.svelte';
  import Anillo from '../componentes/Anillo.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { revisiones, puntuacionSalud, articulos } from '../lib/salud';
  import { saludo, hace } from '../lib/texto';
  import { porDia, estadoApertura, ahoraEnMadrid, fechaLarga } from '../../lib/horario';
  import type { DatosNegocio, DatosResenas, DatosEnlaces } from '../../lib/esquemas';
  import type { AvisoVigilancia, EntradaHistorial } from '../lib/tipos';
  import { google } from '../lib/google.svelte';
  import { informeAnalytics, variacion, type Cifra } from '../lib/estadisticas';
  import type { NombreIcono } from '../lib/iconos';

  const negocio = $derived(estado.json<DatosNegocio>(RUTAS.negocio));
  const resenas = $derived(estado.json<DatosResenas>(RUTAS.resenas));
  const enlaces = $derived(estado.json<DatosEnlaces>(RUTAS.enlaces));
  const lista = $derived(revisiones());
  const salud = $derived(puntuacionSalud(lista));
  const posts = $derived(articulos());
  const apertura = $derived(estadoApertura(porDia(negocio.horario), negocio.cierres));
  const hoy = ahoraEnMadrid().iso;
  const nombre = $derived(estado.modo === 'demo' ? '' : (estado.usuario?.nombre ?? '').split(' ')[0]);

  // Lo que viene: cierres, Plan VEO, programados.
  const proximos = $derived.by(() => {
    const p: { icono: NombreIcono; texto: string; detalle: string; ir: string }[] = [];
    for (const c of negocio.cierres.filter((c) => c.hasta >= hoy)) {
      p.push({ icono: 'CalendarX', texto: c.motivo || 'Cierre', detalle: c.desde === c.hasta ? fechaLarga(c.desde) : `Del ${fechaLarga(c.desde)} al ${fechaLarga(c.hasta)}`, ir: '/horario#cierres' });
    }
    if (negocio.planVeo.activo && negocio.planVeo.fin >= hoy) {
      const dias = Math.round((Date.parse(negocio.planVeo.fin) - Date.parse(hoy)) / 86_400_000);
      p.push({ icono: 'Gift', texto: 'Fin del Plan VEO', detalle: `${fechaLarga(negocio.planVeo.fin)} · quedan ${dias} días`, ir: '/centro#planveo' });
    }
    for (const a of posts.filter((x) => x.estadoPub === 'programado')) {
      p.push({ icono: 'Newspaper', texto: a.title, detalle: `Se publica el ${fechaLarga(a.date)}${a.hora ? ` a las ${a.hora.replace(/^0/, '')}` : ''}`, ir: `/blog/${a.slug}` });
    }
    if (negocio.aviso.activo && negocio.aviso.desde && negocio.aviso.desde > hoy) {
      p.push({ icono: 'Megaphone', texto: 'Aviso programado', detalle: `Desde el ${fechaLarga(negocio.aviso.desde)}`, ir: '/horario#aviso' });
    }
    return p;
  });

  // Alertas de la vigilancia automática (web caída, publicación fallida).
  let alertas = $state<AvisoVigilancia[]>([]);
  estado.backend?.avisosVigilancia().then((a) => (alertas = a)).catch(() => {});

  // Cifras de las últimas 4 semanas, si las estadísticas están conectadas.
  const conStats = $derived(estado.modo === 'demo' || (google.conectado && !!google.ajustes.propiedad));
  let cifras = $state<{ visitas: Cifra; contactos: Cifra; citas: Cifra } | null>(null);
  $effect(() => {
    if (!conStats) return;
    informeAnalytics(google.ajustes.propiedad, 28)
      .then((r) => {
        const suma = (k: 'actual' | 'anterior') => r.eventos.generate_lead[k] + r.eventos.clic_whatsapp[k] + r.eventos.clic_llamar[k];
        cifras = { visitas: r.visitas, contactos: { actual: suma('actual'), anterior: suma('anterior') }, citas: r.eventos.generate_lead };
      })
      .catch(() => {});
  });
  const cambio = (c: Cifra) => {
    const v = variacion(c);
    return Math.abs(v) < 0.03 ? { t: 'igual', c: 'igual' } : { t: `${v > 0 ? '+' : ''}${Math.round(v * 100)} %`, c: v > 0 ? 'sube' : 'baja' };
  };

  let historial = $state<EntradaHistorial[]>([]);
  $effect(() => {
    estado.backend?.historial(1).then((h) => (historial = h.slice(0, 5))).catch(() => {});
  });

  const acciones: { icono: NombreIcono; texto: string; ir: string }[] = [
    { icono: 'CalendarX', texto: 'Avisar de un cierre', ir: '/horario#cierres' },
    { icono: 'FilePlus', texto: 'Escribir un artículo', ir: '/blog/nuevo' },
    { icono: 'Clock', texto: 'Cambiar el horario', ir: '/horario' },
    { icono: 'Star', texto: 'Añadir una reseña', ir: '/resenas' },
    { icono: 'Upload', texto: 'Subir fotos', ir: '/fotos' },
  ];
</script>

<div class="p-vista">
  <header class="hola">
    <div>
      <p class="fecha">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1>{saludo()}{nombre ? `, ${nombre}` : ''}</h1>
    </div>
    <div class="estado-centro" class:abierto={apertura.abierto}>
      <span class="p-punto"></span>
      <span>{apertura.texto}</span>
    </div>
  </header>

  {#each alertas as a (a.numero)}
    <a class="alerta" href={a.url} target="_blank" rel="noopener">
      <Icono nombre="TriangleAlert" />
      <span><strong>{a.titulo.replace(/^\[[^\]]+\]\s*/, '')}</strong><small>Aviso de la vigilancia automática · {hace(a.fecha)}. Pulsa para ver los detalles.</small></span>
      <Icono nombre="ExternalLink" />
    </a>
  {/each}

  <section class="rapidas" aria-label="Acciones rápidas">
    {#each acciones as a (a.texto)}
      <a href={`#${a.ir}`} class="rapida"><span class="ic"><Icono nombre={a.icono} /></span>{a.texto}</a>
    {/each}
    <a href={`${estado.config.sitio}imprimir/`} target="_blank" rel="noopener" class="rapida"><span class="ic"><Icono nombre="Printer" /></span>Imprimir carteles</a>
  </section>

  <div class="rejilla">
    <section class="p-tarjeta salud">
      <div class="p-tarjeta-cab">
        <h2><Icono nombre="ShieldCheck" /> Salud de la web</h2>
        <span class="p-apagado">{lista.filter((x) => x.nivel !== 'bien').length || 'Nada'} por revisar</span>
      </div>
      <div class="salud-cuerpo">
        <div class="anillo-grande">
          <Anillo valor={salud} tamano={112} etiqueta="Salud de la web" />
          <p>{salud >= 85 ? '¡Excelente!' : salud >= 65 ? 'Bien, con margen' : 'Hay trabajo pendiente'}</p>
        </div>
        <ul class="revisiones">
          {#each lista as r (r.id)}
            <li class={r.nivel}>
              <Icono nombre={r.nivel === 'bien' ? 'CircleCheck' : r.nivel === 'mal' ? 'CircleAlert' : 'Lightbulb'} />
              <div>
                <strong>{r.titulo}</strong>
                <p>{r.detalle}</p>
              </div>
              {#if r.ir && r.nivel !== 'bien'}<a class="p-btn pequeno" href={`#${r.ir}`}>Arreglar</a>{/if}
            </li>
          {/each}
        </ul>
      </div>
    </section>

    <div class="columna">
      <section class="p-tarjeta stats">
        <div class="p-tarjeta-cab">
          <h2><Icono nombre="ChartLine" /> Últimas 4 semanas</h2>
          <a class="p-btn pequeno fantasma" href="#/estadisticas">{conStats ? 'Ver más' : 'Conectar'}</a>
        </div>
        {#if conStats && cifras}
          <div class="stats-cifras">
            {#each [{ n: 'Contactos', c: cifras.contactos }, { n: 'Citas en la web', c: cifras.citas }, { n: 'Visitas', c: cifras.visitas }] as x (x.n)}
              {@const d = cambio(x.c)}
              <a href="#/estadisticas"><strong>{x.c.actual.toLocaleString('es-ES')}</strong><span>{x.n}</span><small class={d.c}>{d.t === 'igual' ? 'igual que antes' : d.t}</small></a>
            {/each}
          </div>
        {:else if conStats}
          <p class="p-vacio"><Icono nombre="Loader" clase="p-girar" /> Consultando…</p>
        {:else}
          <p class="stats-vacio">Conecta Google Analytics y Search Console para ver aquí cuántas visitas y contactos llegan desde la web.</p>
        {/if}
      </section>

      <section class="p-tarjeta">
        <div class="p-tarjeta-cab"><h2><Icono nombre="CalendarDays" /> Próximamente</h2></div>
        {#if proximos.length}
          <div class="p-lista">
            {#each proximos as p (p.texto + p.detalle)}
              <a class="p-fila" href={`#${p.ir}`}>
                <span class="ic-fila"><Icono nombre={p.icono} /></span>
                <span class="txt"><strong>{p.texto}</strong><small class="p-apagado">{p.detalle}</small></span>
                <Icono nombre="ChevronRight" />
              </a>
            {/each}
          </div>
        {:else}
          <div class="p-vacio"><Icono nombre="CalendarDays" /> Sin cierres ni publicaciones programadas.<a class="p-btn pequeno" href="#/horario#cierres">Programar vacaciones</a></div>
        {/if}
      </section>

      <section class="p-tarjeta cifras">
        <a href="#/blog"><strong>{posts.filter((p) => p.estadoPub === 'publicado').length}</strong><span>artículos</span></a>
        <a href="#/servicios"><strong>{estado.rutas(RUTAS.servicios).length}</strong><span>servicios</span></a>
        <a href="#/resenas"><strong>{resenas.resenas.length}</strong><span>reseñas</span></a>
        <a href="#/enlaces"><strong>{enlaces.enlaces.filter((e) => e.visible).length}</strong><span>enlaces</span></a>
      </section>

      <section class="p-tarjeta">
        <div class="p-tarjeta-cab">
          <h2><Icono nombre="History" /> Últimos cambios</h2>
          <a class="p-btn pequeno fantasma" href="#/historial">Ver todo</a>
        </div>
        <div class="p-lista">
          {#each historial as h (h.sha)}
            <a class="p-fila" href={`#/historial/${h.sha}`}>
              {#if h.avatar}<img class="av" src={h.avatar} alt="" />{:else}<span class="ic-fila"><Icono nombre="FileText" /></span>{/if}
              <span class="txt"><strong>{h.mensaje.split('\n')[0]}</strong><small class="p-apagado">{h.autor} · {hace(h.fecha)}</small></span>
            </a>
          {:else}
            <p class="p-vacio">Cargando…</p>
          {/each}
        </div>
      </section>
    </div>
  </div>
  <p class="p-ayuda pie">Consejo: pulsa <span class="p-kbd">Ctrl</span> + <span class="p-kbd">K</span> para ir a cualquier sitio del panel o lanzar una acción.</p>
</div>

<style>
  .hola { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; }
  .fecha { font-family: var(--p-mono); font-weight: 700; font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--p-roble-oscuro); }
  .hola h1 { font-size: clamp(1.8rem, 1.4rem + 1.4vw, 2.6rem); font-weight: 800; letter-spacing: -0.03em; margin-top: 4px; }
  .estado-centro { display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 999px; background: var(--p-error-fondo); color: var(--p-error); font-weight: 700; }
  .estado-centro.abierto { background: var(--p-ok-fondo); color: var(--p-ok); }
  .rapidas { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(165px, 100%), 1fr)); gap: 10px; }
  .rapida {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 14px;
    border: 1px solid var(--p-borde);
    background: var(--p-superficie);
    text-decoration: none;
    font-weight: 700;
    font-size: 0.92rem;
    line-height: 1.2;
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  }
  .rapida:hover { transform: translateY(-2px); box-shadow: var(--p-sombra); border-color: var(--p-roble-claro); }
  .ic { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border-radius: 10px; background: var(--p-tinta); color: var(--p-luz); }
  .rejilla { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-items: start; }
  @media (min-width: 1100px) { .rejilla { grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); } }
  .columna { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .salud-cuerpo { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; padding: 20px; }
  @media (min-width: 640px) { .salud-cuerpo { grid-template-columns: 150px 1fr; } }
  .anillo-grande { display: grid; justify-items: center; align-content: start; gap: 10px; text-align: center; font-weight: 700; font-size: 1.6rem; }
  .anillo-grande p { font-size: 0.95rem; color: var(--p-texto-2); }
  .revisiones { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .revisiones li { display: flex; align-items: flex-start; gap: 12px; padding: 10px; border-radius: 10px; }
  .revisiones li > div { flex: 1; }
  .revisiones li p { font-size: 0.88rem; color: var(--p-texto-2); }
  .revisiones li.bien :global(.p-icono) { color: var(--p-ok); }
  .revisiones li.mejorable { background: #fdf8ee; }
  .revisiones li.mejorable :global(.p-icono) { color: #c98a14; }
  .revisiones li.mal { background: var(--p-error-fondo); }
  .revisiones li.mal :global(.p-icono) { color: var(--p-error); }
  .revisiones li :global(.p-icono) { margin-top: 2px; }
  .ic-fila { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border-radius: 10px; background: var(--p-fondo); color: var(--p-roble-oscuro); }
  .txt { flex: 1; display: grid; min-width: 0; line-height: 1.3; }
  .txt strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .av { width: 36px; height: 36px; border-radius: 50%; }
  .cifras { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .cifras a { display: grid; justify-items: center; padding: 18px 8px; text-decoration: none; border-right: 1px solid var(--p-borde); }
  .cifras a:last-child { border-right: 0; }
  .cifras a:hover { background: var(--p-superficie-2); }
  .cifras strong { font-size: 1.7rem; font-weight: 800; }
  .cifras span { font-size: 0.82rem; color: var(--p-apagado); }
  .pie { text-align: center; }
  .alerta { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px; background: var(--p-error-fondo); color: var(--p-error); text-decoration: none; border: 1px solid #f0c2b8; }
  .alerta > span { flex: 1; display: grid; }
  .alerta small { color: var(--p-texto-2); }
  .stats-cifras { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .stats-cifras a { display: grid; justify-items: center; gap: 2px; padding: 16px 8px; text-decoration: none; border-right: 1px solid var(--p-borde); text-align: center; }
  .stats-cifras a:last-child { border-right: 0; }
  .stats-cifras a:hover { background: var(--p-superficie-2); }
  .stats-cifras strong { font-size: 1.7rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .stats-cifras span { font-size: 0.82rem; color: var(--p-apagado); }
  .stats-cifras small { font-size: 0.78rem; font-weight: 700; }
  .stats-cifras small.sube { color: var(--p-ok); }
  .stats-cifras small.baja { color: var(--p-error); }
  .stats-cifras small.igual { color: var(--p-apagado); font-weight: 400; }
  .stats-vacio { padding: 16px 20px; color: var(--p-texto-2); font-size: 0.92rem; }
</style>
