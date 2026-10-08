<script lang="ts">
  // Estadísticas: lo que pasa dentro de la web (Google Analytics) y cómo
  // aparece en Google (Search Console), explicado para quien no es técnico.
  import Icono from '../componentes/Icono.svelte';
  import Grafica from '../componentes/Grafica.svelte';
  import { estado } from '../lib/estado.svelte';
  import { google } from '../lib/google.svelte';
  import { RUTAS } from '../lib/backend';
  import { clonar } from '../lib/texto';
  import { describirCambios } from '../lib/describir';
  import { enWeb } from '../lib/paginas';
  import {
    informeAnalytics,
    informeSearch,
    propiedadesAnalytics,
    sitiosSearchConsole,
    variacion,
    type Cifra,
    type InformeAnalytics,
    type InformeSearch,
    type Periodo,
  } from '../lib/estadisticas';
  import type { DatosNegocio } from '../../lib/esquemas';
  import type { NombreIcono } from '../lib/iconos';

  const demo = estado.modo === 'demo';
  const publicado = JSON.parse(estado.originales[RUTAS.negocio] ?? 'null');
  let periodo = $state<Periodo>(28);
  let ga = $state<InformeAnalytics | null>(null);
  let sc = $state<InformeSearch | null>(null);
  let errorGa = $state('');
  let errorSc = $state('');
  let cargando = $state(false);
  let propiedades = $state<{ id: string; nombre: string; cuenta: string }[]>([]);
  let sitios = $state<{ sitio: string; permiso: string }[]>([]);
  let guiaAbierta = $state(false);
  let clienteEscrito = $state(google.ajustes.cliente);

  const aj = $derived(google.ajustes);
  const listo = $derived(demo || google.conectado);
  const conGa = $derived(demo || !!aj.propiedad);
  const conSc = $derived(demo || !!aj.sitio);
  const origen = typeof location !== 'undefined' ? location.origin : '';

  $effect(() => {
    const p = periodo;
    if (!listo) return;
    void cargar(p);
  });

  $effect(() => {
    if (!google.conectado || demo) return;
    if (!aj.propiedad) propiedadesAnalytics().then((p) => (propiedades = p)).catch((e) => (errorGa = (e as Error).message));
    if (!aj.sitio) sitiosSearchConsole().then((s) => (sitios = s)).catch((e) => (errorSc = (e as Error).message));
  });

  async function cargar(p: Periodo) {
    cargando = true;
    errorGa = errorSc = '';
    await Promise.all([
      conGa ? informeAnalytics(aj.propiedad, p).then((r) => (ga = r)).catch((e) => (errorGa = (e as Error).message)) : null,
      conSc ? informeSearch(aj.sitio, p).then((r) => (sc = r)).catch((e) => (errorSc = (e as Error).message)) : null,
    ]);
    cargando = false;
  }

  function guardar(campo: 'clienteGoogle' | 'ga4Propiedad' | 'searchConsole', valor: string) {
    const n = clonar(estado.json<DatosNegocio>(RUTAS.negocio));
    n.analitica = { ...n.analitica, [campo]: valor.trim() };
    estado.fijarJson(RUTAS.negocio, n, describirCambios(publicado, n, 'Datos del centro'));
  }

  // ── Formato ───────────────────────────────────────────────────────────────
  const num = (x: number, dec = 0) => x.toLocaleString('es-ES', { maximumFractionDigits: dec, minimumFractionDigits: dec });
  const pct = (x: number) => `${num(x * 100, 1)} %`;
  function delta(c: Cifra) {
    if (!c.anterior && !c.actual) return { texto: '', clase: '' };
    const v = variacion(c);
    return { texto: `${v > 0 ? '+' : ''}${Math.round(v * 100)} %`, clase: Math.abs(v) < 0.03 ? 'igual' : v > 0 ? 'sube' : 'baja' };
  }
  /** En la posición, bajar es mejorar: se explica con palabras. */
  function deltaPosicion(c: Cifra) {
    if (!c.anterior || !c.actual) return { texto: '', clase: '' };
    const d = c.anterior - c.actual;
    if (Math.abs(d) < 0.3) return { texto: 'igual que antes', clase: 'igual' };
    return { texto: `${d > 0 ? 'sube' : 'baja'} ${num(Math.abs(d), 1)} puestos`, clase: d > 0 ? 'sube' : 'baja' };
  }
  const nombrePeriodo = $derived(periodo === 7 ? 'los 7 días anteriores' : periodo === 28 ? 'las 4 semanas anteriores' : 'los 3 meses anteriores');
  const contactos = $derived<Cifra | null>(
    ga ? { actual: ga.eventos.generate_lead.actual + ga.eventos.clic_whatsapp.actual + ga.eventos.clic_llamar.actual, anterior: ga.eventos.generate_lead.anterior + ga.eventos.clic_whatsapp.anterior + ga.eventos.clic_llamar.anterior } : null,
  );
  const kpisGa = $derived<{ icono: NombreIcono; titulo: string; c: Cifra; ayuda: string; fuerte?: boolean }[]>(
    ga && contactos
      ? [
          { icono: 'MessageCircle', titulo: 'Contactos', c: contactos, ayuda: 'Citas pedidas en la web + clics en WhatsApp + llamadas', fuerte: true },
          { icono: 'CalendarDays', titulo: 'Citas pedidas en la web', c: ga.eventos.generate_lead, ayuda: 'Formularios de «Pedir cita» enviados' },
          { icono: 'MessageCircle', titulo: 'Clics en WhatsApp', c: ga.eventos.clic_whatsapp, ayuda: 'En cualquier botón de WhatsApp' },
          { icono: 'Phone', titulo: 'Llamadas', c: ga.eventos.clic_llamar, ayuda: 'Toques en el teléfono desde la web' },
          { icono: 'MapPin', titulo: 'Cómo llegar', c: ga.eventos.clic_como_llegar, ayuda: 'Abren Google Maps, Apple Maps o Waze' },
          { icono: 'Users', titulo: 'Visitas', c: ga.visitas, ayuda: 'Sesiones de quien aceptó las cookies' },
        ]
      : [],
  );
  const maxCanal = $derived(Math.max(1, ...(ga?.canales.map((c) => c.visitas) ?? [1])));
  const oportunidades = $derived(sc?.consultas.filter((q) => q.posicion >= 6 && q.posicion <= 20 && q.impresiones >= 15).slice(0, 5) ?? []);
  const enlaceEditar = (ruta: string) => (ruta.startsWith('/blog/') && ruta !== '/blog/' ? `#/blog/${ruta.split('/')[2]}` : '');
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Estadísticas</h1>
      <p>Cuánta gente entra en la web, cuántos acaban pidiendo cita y cómo os encuentran en Google.</p>
    </div>
    {#if listo && (conGa || conSc)}
      <div class="p-acciones">
        <div class="seg" role="tablist" aria-label="Periodo">
          {#each [7, 28, 90] as p (p)}
            <button type="button" role="tab" aria-selected={periodo === p} onclick={() => (periodo = p as Periodo)}>{p === 7 ? '7 días' : p === 28 ? '4 semanas' : '3 meses'}</button>
          {/each}
        </div>
        <button class="p-btn solo-icono" type="button" title="Actualizar" aria-label="Actualizar" onclick={() => cargar(periodo)} disabled={cargando}><Icono nombre="RefreshCw" clase={cargando ? 'p-girar' : ''} /></button>
      </div>
    {/if}
  </header>

  {#if demo}
    <p class="aviso-demo"><Icono nombre="Sparkles" /> Datos de ejemplo: en el panel real salen los de la web.</p>
  {/if}

  {#if !listo || (!conGa && !conSc)}
    <!-- ── Puesta en marcha ─────────────────────────────────────────────── -->
    <section class="p-tarjeta">
      <div class="p-tarjeta-cab"><h2><Icono nombre="ChartLine" /> Conectar las estadísticas de Google</h2></div>
      <div class="p-tarjeta-cuerpo">
        <p>Se hace una sola vez. El panel solo <strong>lee</strong> los datos: no puede cambiar nada en Google, y el acceso caduca a la hora.</p>
        <ol class="pasos">
          <li class:hecho={!!aj.cliente}>
            <div>
              <strong>Crear el acceso en Google Cloud</strong> <span class="p-apagado">· lo hace quien mantiene la web, 10 minutos</span>
              <button class="enlace" type="button" onclick={() => (guiaAbierta = !guiaAbierta)}>{guiaAbierta ? 'Ocultar los pasos' : 'Ver los pasos'}</button>
              {#if guiaAbierta}
                <ol class="guia">
                  <li>Entra en <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud</a> con la cuenta de Google del centro y crea un proyecto, por ejemplo «Panel Siente».</li>
                  <li>En <em>APIs y servicios → Biblioteca</em>, activa <strong>Google Analytics Data API</strong>, <strong>Google Analytics Admin API</strong> y <strong>Google Search Console API</strong>.</li>
                  <li>En <em>Google Auth Platform</em>, configura la pantalla de consentimiento como «Externa» y añade como usuarios de prueba los correos de quien vaya a ver las estadísticas.</li>
                  <li>En <em>Clientes → Crear cliente</em>, elige «Aplicación web» y en <strong>Orígenes de JavaScript autorizados</strong> añade <code>{origen}</code> {#if !demo}<button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Copiar" onclick={() => navigator.clipboard.writeText(origen).then(() => estado.aviso('Copiado.', 'ok'))}><Icono nombre="Copy" /></button>{/if} (y más adelante el dominio definitivo).</li>
                  <li>Copia el <strong>ID de cliente</strong> (termina en <code>.apps.googleusercontent.com</code>) y pégalo aquí abajo.</li>
                </ol>
              {/if}
            </div>
          </li>
          <li class:hecho={!!aj.cliente}>
            <label class="p-campo">
              <span class="p-etiqueta">ID de cliente de Google</span>
              <span class="fila">
                <input class="p-input" bind:value={clienteEscrito} placeholder="1234-abc.apps.googleusercontent.com" spellcheck="false" />
                <button class="p-btn" type="button" disabled={!clienteEscrito.trim() || clienteEscrito.trim() === aj.cliente} onclick={() => guardar('clienteGoogle', clienteEscrito)}>Guardar</button>
              </span>
              <span class="p-ayuda">No es secreto: identifica al panel ante Google. Publica el cambio para que sirva a todo el equipo.</span>
            </label>
          </li>
          <li class:hecho={google.conectado}>
            <div class="fila">
              <button class="p-btn primario" type="button" disabled={!aj.cliente || google.conectando || demo} onclick={() => google.conectar()}>
                {#if google.conectando}<Icono nombre="Loader" clase="p-girar" /> Conectando…{:else}<Icono nombre="LogIn" /> Conectar con Google{/if}
              </button>
              {#if google.conectado}<span class="p-chip ok"><Icono nombre="Check" /> Conectado</span>{/if}
            </div>
            {#if google.error}<p class="p-error-campo">{google.error}</p>{/if}
            <p class="p-ayuda">Si Google avisa de que la aplicación no está verificada, pulsa «Continuar»: es vuestra propia aplicación.</p>
          </li>
          <li class:hecho={!!aj.propiedad || !!aj.sitio}>
            <div class="elegir">
              <label class="p-campo">
                <span class="p-etiqueta">Propiedad de Google Analytics</span>
                <select class="p-select" disabled={!propiedades.length} value={aj.propiedad} onchange={(e) => guardar('ga4Propiedad', (e.target as HTMLSelectElement).value)}>
                  <option value="">{google.conectado ? (propiedades.length ? 'Elige…' : 'No hay propiedades en esta cuenta') : 'Conecta primero'}</option>
                  {#each propiedades as p (p.id)}<option value={p.id}>{p.nombre} · {p.cuenta}</option>{/each}
                </select>
                {#if errorGa}<span class="p-error-campo">{errorGa}</span>{/if}
              </label>
              <label class="p-campo">
                <span class="p-etiqueta">Propiedad de Search Console</span>
                <select class="p-select" disabled={!sitios.length} value={aj.sitio} onchange={(e) => guardar('searchConsole', (e.target as HTMLSelectElement).value)}>
                  <option value="">{google.conectado ? (sitios.length ? 'Elige…' : 'No hay propiedades verificadas') : 'Conecta primero'}</option>
                  {#each sitios as s (s.sitio)}<option value={s.sitio}>{s.sitio.replace('sc-domain:', 'Dominio: ')}</option>{/each}
                </select>
                {#if errorSc}<span class="p-error-campo">{errorSc}</span>{/if}
              </label>
            </div>
            <p class="p-ayuda">¿No sale la web en Search Console? Añádela como propiedad en <a href="https://search.google.com/search-console" target="_blank" rel="noopener">Search Console</a> y verifícala con la etiqueta HTML: pega su código en <a href="#/centro#analitica">Datos del centro → Analítica</a>.</p>
          </li>
        </ol>
      </div>
    </section>
  {:else}
    {#if !demo}
      <p class="conexion p-apagado">
        <Icono nombre="ShieldCheck" /> Conectado con Google (solo lectura).
        <button class="enlace" type="button" onclick={() => google.desconectar()}>Desconectar</button>
      </p>
    {/if}

    <!-- ── Dentro de la web ─────────────────────────────────────────────── -->
    {#if conGa}
      <section class="bloque">
        <h2 class="titulo-bloque"><Icono nombre="Users" /> Dentro de la web <small>· los porcentajes comparan con {nombrePeriodo}</small></h2>
        {#if errorGa}
          <p class="error"><Icono nombre="CircleAlert" /> {errorGa}</p>
        {:else if ga}
          <div class="kpis">
            {#each kpisGa as k (k.titulo)}
              {@const dl = delta(k.c)}
              <div class="kpi p-tarjeta" class:fuerte={k.fuerte} title={k.ayuda}>
                <span class="kpi-tit"><Icono nombre={k.icono} /> {k.titulo}</span>
                <strong>{num(k.c.actual)}</strong>
                {#if dl.texto}<span class="delta {dl.clase}"><Icono nombre={dl.clase === 'baja' ? 'TrendingDown' : 'TrendingUp'} /> {dl.texto}</span>{/if}
              </div>
            {/each}
          </div>

          <section class="p-tarjeta">
            <div class="p-tarjeta-cab"><h2><Icono nombre="ChartColumn" /> Día a día</h2></div>
            <div class="p-tarjeta-cuerpo">
              <Grafica
                etiquetas={ga.dias.map((d) => d.fecha)}
                series={[
                  { nombre: 'Visitas', valores: ga.dias.map((d) => d.visitas), tipo: 'barras', color: '#d9b78c' },
                  { nombre: 'Contactos', valores: ga.dias.map((d) => d.contactos), tipo: 'linea', color: '#157f3b' },
                ]}
              />
            </div>
          </section>

          <div class="dos">
            <section class="p-tarjeta">
              <div class="p-tarjeta-cab"><h2><Icono nombre="ArrowUpRight" /> De dónde llegan</h2></div>
              <div class="p-tarjeta-cuerpo">
                <ul class="barras">
                  {#each ga.canales as c (c.nombre)}
                    <li><span>{c.nombre}</span><span class="barra"><i style={`width:${(c.visitas / maxCanal) * 100}%`}></i></span><strong>{num(c.visitas)}</strong></li>
                  {/each}
                </ul>
                <p class="p-ayuda">Desde la bio de Instagram: <strong>{num(ga.eventos.clic_enlace_bio.actual)}</strong> clics en los botones de la página de enlaces.</p>
              </div>
            </section>
            <section class="p-tarjeta">
              <div class="p-tarjeta-cab"><h2><Icono nombre="FileText" /> Páginas más vistas</h2></div>
              <ol class="p-lista paginas">
                {#each ga.paginas as p (p.ruta)}
                  <li class="p-fila">
                    <span class="txt">
                      {#if enlaceEditar(p.ruta)}<a href={enlaceEditar(p.ruta)}>{p.titulo}</a>{:else}<span>{p.titulo}</span>{/if}
                      <small class="p-apagado">{p.ruta}</small>
                    </span>
                    <strong>{num(p.vistas)}</strong>
                  </li>
                {/each}
              </ol>
            </section>
          </div>
          <p class="p-ayuda nota"><Icono nombre="Info" /> Analytics solo cuenta a quien acepta las cookies (suele ser entre la mitad y dos tercios de las visitas). Las cifras reales son algo mayores; lo útil es comparar periodos.</p>
        {:else}
          <p class="p-ayuda"><Icono nombre="Loader" clase="p-girar" /> Consultando Google Analytics…</p>
        {/if}
      </section>
    {/if}

    <!-- ── En Google ───────────────────────────────────────────────────── -->
    {#if conSc}
      <section class="bloque">
        <h2 class="titulo-bloque"><Icono nombre="ScanSearch" /> En el buscador de Google</h2>
        {#if errorSc}
          <p class="error"><Icono nombre="CircleAlert" /> {errorSc}</p>
        {:else if sc}
          {@const kpisSc = [
            { titulo: 'Veces que salís en Google', valor: num(sc.impresiones.actual), d: delta(sc.impresiones), ayuda: 'Impresiones: cuántas veces apareció la web en una búsqueda' },
            { titulo: 'Clics desde Google', valor: num(sc.clics.actual), d: delta(sc.clics), ayuda: 'Personas que pulsaron para entrar' },
            { titulo: 'Posición media', valor: sc.posicion.actual ? num(sc.posicion.actual, 1) : '–', d: deltaPosicion(sc.posicion), ayuda: 'Cuanto más baja, mejor (1 = el primero)' },
            { titulo: 'Porcentaje de clic', valor: pct(sc.ctr.actual), d: delta(sc.ctr), ayuda: 'De cada 100 que os ven, cuántos entran' },
          ]}
          <div class="kpis">
            {#each kpisSc as k (k.titulo)}
              <div class="kpi p-tarjeta" title={k.ayuda}>
                <span class="kpi-tit">{k.titulo}</span>
                <strong>{k.valor}</strong>
                {#if k.d.texto}<span class="delta {k.d.clase}"><Icono nombre={k.d.clase === 'baja' ? 'TrendingDown' : 'TrendingUp'} /> {k.d.texto}</span>{/if}
              </div>
            {/each}
          </div>

          <section class="p-tarjeta">
            <div class="p-tarjeta-cab"><h2><Icono nombre="ChartLine" /> Día a día en Google</h2></div>
            <div class="p-tarjeta-cuerpo">
              <Grafica
                etiquetas={sc.dias.map((d) => d.fecha)}
                series={[
                  { nombre: 'Clics', valores: sc.dias.map((d) => d.clics), tipo: 'barras', color: '#b9844f' },
                  { nombre: 'Veces vista', valores: sc.dias.map((d) => d.impresiones), tipo: 'linea', color: '#2b55c7' },
                ]}
              />
              <p class="p-ayuda">Google da estos datos con 2 o 3 días de retraso.</p>
            </div>
          </section>

          {#if oportunidades.length}
            <section class="p-tarjeta oportunidades">
              <div class="p-tarjeta-cab"><h2><Icono nombre="Lightbulb" /> Casi en la primera página</h2></div>
              <div class="p-tarjeta-cuerpo">
                <p>Búsquedas en las que ya salís, pero en la segunda página o al final de la primera. Un artículo o una mejora sobre esto es lo que más rápido se nota:</p>
                <ul>
                  {#each oportunidades as q (q.consulta)}
                    <li><strong>«{q.consulta}»</strong> <span class="p-apagado">· posición {num(q.posicion, 1)} · {num(q.impresiones)} veces vista</span></li>
                  {/each}
                </ul>
                <a class="p-btn pequeno" href="#/blog/nuevo"><Icono nombre="FilePlus" /> Escribir un artículo</a>
              </div>
            </section>
          {/if}

          <div class="dos">
            <section class="p-tarjeta">
              <div class="p-tarjeta-cab"><h2><Icono nombre="Search" /> Qué busca la gente</h2></div>
              <table class="tabla">
                <thead><tr><th>Búsqueda</th><th>Clics</th><th>Vista</th><th>Pos.</th></tr></thead>
                <tbody>
                  {#each sc.consultas.slice(0, 15) as q (q.consulta)}
                    <tr><td>{q.consulta}</td><td>{num(q.clics)}</td><td>{num(q.impresiones)}</td><td>{num(q.posicion, 1)}</td></tr>
                  {:else}
                    <tr><td colspan="4" class="p-apagado">Aún no hay búsquedas. En una web nueva tarda unas semanas.</td></tr>
                  {/each}
                </tbody>
              </table>
            </section>
            <section class="p-tarjeta">
              <div class="p-tarjeta-cab"><h2><Icono nombre="FileText" /> Páginas que más traen desde Google</h2></div>
              <table class="tabla">
                <thead><tr><th>Página</th><th>Clics</th><th>Pos.</th></tr></thead>
                <tbody>
                  {#each sc.paginas.slice(0, 12) as p (p.ruta)}
                    <tr>
                      <td>{#if enlaceEditar(p.ruta)}<a href={enlaceEditar(p.ruta)}>{p.titulo}</a>{:else}<a href={enWeb(p.ruta)} target="_blank" rel="noopener">{p.titulo}</a>{/if}</td>
                      <td>{num(p.clics)}</td>
                      <td>{num(p.posicion, 1)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </section>
          </div>
        {:else}
          <p class="p-ayuda"><Icono nombre="Loader" clase="p-girar" /> Consultando Search Console…</p>
        {/if}
      </section>
    {/if}
  {/if}
</div>

<style>
  .seg { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: #ebe5dc; }
  .seg button { padding: 7px 12px; border: 0; border-radius: 9px; background: none; font-weight: 700; cursor: pointer; font-size: 0.9rem; }
  .seg button[aria-selected='true'] { background: var(--p-superficie); box-shadow: var(--p-sombra); }
  .aviso-demo { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; background: #fff4dc; color: var(--p-aviso); font-weight: 700; }
  .pasos { margin: 0; padding-left: 1.4em; display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .pasos > li::marker { font-weight: 800; color: var(--p-roble-oscuro); }
  .pasos > li.hecho::marker { color: var(--p-ok); }
  .guia { margin: 10px 0 0; padding-left: 1.2em; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; font-size: 0.92rem; color: var(--p-texto-2); }
  .guia code, .pasos code { font-family: var(--p-mono); font-size: 0.85rem; background: var(--p-superficie-2); padding: 1px 5px; border-radius: 5px; }
  .enlace { padding: 0; border: 0; background: none; color: var(--p-roble-oscuro); font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
  .fila { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .fila .p-input { flex: 1; min-width: 220px; }
  .elegir { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); }
  .conexion { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
  .bloque { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .titulo-bloque { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 1.2rem; margin-top: 8px; }
  .titulo-bloque small { font-size: 0.85rem; font-weight: 400; color: var(--p-apagado); }
  .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(170px, 100%), 1fr)); }
  .kpi { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; padding: 14px 16px; }
  .kpi.fuerte { background: var(--p-tinta); color: #fff; border-color: var(--p-tinta); }
  .kpi.fuerte .kpi-tit { color: var(--p-luz); }
  .kpi-tit { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 700; color: var(--p-texto-2); }
  .kpi-tit :global(.p-icono) { width: 15px; height: 15px; }
  .kpi strong { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .delta { display: inline-flex; align-items: center; gap: 4px; font-size: 0.82rem; font-weight: 700; }
  .delta :global(.p-icono) { width: 14px; height: 14px; }
  .delta.sube { color: var(--p-ok); }
  .delta.baja { color: var(--p-error); }
  .delta.igual { color: var(--p-apagado); }
  .kpi.fuerte .delta.sube { color: #8fe0ad; }
  .kpi.fuerte .delta.baja { color: #ffb4a6; }
  .dos { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); align-items: start; }
  .barras { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .barras li { display: grid; grid-template-columns: minmax(min(120px, 100%), 1.2fr) 2fr auto; gap: 10px; align-items: center; font-size: 0.9rem; }
  .barra { height: 10px; border-radius: 999px; background: var(--p-superficie-2); overflow: hidden; }
  .barra i { display: block; height: 100%; border-radius: inherit; background: var(--p-roble); }
  .paginas { margin: 0; padding: 0; list-style: none; }
  .paginas .txt { flex: 1; display: grid; min-width: 0; }
  .paginas .txt > :first-child { font-weight: 700; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .paginas small { font-size: 0.78rem; }
  .tabla { width: 100%; border-collapse: collapse; font-size: 0.9rem; table-layout: fixed; }
  .tabla th, .tabla td { overflow-wrap: anywhere; }
  @media (max-width: 520px) { .tabla th, .tabla td { padding-inline: 8px; } }
  .tabla th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--p-apagado); padding: 10px 16px; border-bottom: 1px solid var(--p-borde); }
  .tabla td { padding: 9px 16px; border-bottom: 1px solid var(--p-borde); font-variant-numeric: tabular-nums; }
  .tabla td:first-child { overflow-wrap: anywhere; }
  .tabla tr:last-child td { border-bottom: 0; }
  .tabla a { font-weight: 700; text-decoration: none; }
  .oportunidades { background: #fffaf0; border-color: #f1dcb5; }
  .oportunidades ul { margin: 0; padding-left: 1.1em; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .oportunidades .p-btn { justify-self: start; }
  .error { display: flex; gap: 8px; align-items: center; padding: 12px 14px; border-radius: 12px; background: var(--p-error-fondo); color: var(--p-error); font-weight: 700; }
  .nota { display: flex; gap: 8px; align-items: flex-start; }
</style>
