<script lang="ts">
  // Panel SEO de artículos y servicios: nota, avisos con arreglo en un clic,
  // palabras clave sugeridas y, si hay Search Console, cómo le va de verdad a
  // la página en Google.
  import Icono from './Icono.svelte';
  import Anillo from './Anillo.svelte';
  import VistaGoogle from './VistaGoogle.svelte';
  import { estado } from '../lib/estado.svelte';
  import { google } from '../lib/google.svelte';
  import { rendimientoPagina, type RendimientoPagina } from '../lib/estadisticas';
  import type { Analisis, Arreglo } from '../lib/seo';

  let {
    analisis,
    clave = $bindable(),
    sugerencias = [],
    onarreglo,
    vistaGoogle,
    ruta = '',
    publicada = false,
    onconsultas,
  }: {
    analisis: Analisis;
    clave?: string;
    sugerencias?: string[];
    onarreglo: (a: Arreglo) => void;
    vistaGoogle: { titulo: string; descripcion: string; url: string };
    /** Ruta pública de la página («/blog/x/»), para pedir sus datos a Search Console. */
    ruta?: string;
    publicada?: boolean;
    /** Avisa al editor de las búsquedas reales, para sugerirlas como palabra clave. */
    onconsultas?: (c: string[]) => void;
  } = $props();

  let explicacion = $state(false);
  let verBien = $state(false);
  let rendimiento = $state<RendimientoPagina | null>(null);
  let errorRend = $state('');

  const mejorar = $derived(analisis.comprobaciones.filter((c) => c.nivel !== 'bien').sort((a, b) => (a.nivel === 'mal' ? -1 : 0) - (b.nivel === 'mal' ? -1 : 0) || b.peso - a.peso));
  const bien = $derived(analisis.comprobaciones.filter((c) => c.nivel === 'bien'));
  const sitioSc = $derived(google.ajustes.sitio);
  const puedeRendimiento = $derived(publicada && !!ruta && (estado.modo === 'demo' || (google.conectado && !!sitioSc)));

  $effect(() => {
    if (!puedeRendimiento) return;
    rendimientoPagina(sitioSc, ruta)
      .then((r) => {
        rendimiento = r;
        onconsultas?.(r.consultas.filter((c) => c.impresiones >= 5).map((c) => c.consulta));
      })
      .catch((e) => (errorRend = (e as Error).message));
  });

  const n = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 1 });
</script>

<section class="p-tarjeta seo">
  <div class="p-tarjeta-cab">
    <h2><Icono nombre="Wand2" /> SEO</h2>
    <div class="nota">
      <button class="p-btn fantasma solo-icono pequeno" type="button" aria-expanded={explicacion} aria-label="¿Quién pone esta nota?" title="¿Quién pone esta nota?" onclick={() => (explicacion = !explicacion)}><Icono nombre="Info" /></button>
      <Anillo valor={analisis.puntuacion} tamano={48} etiqueta="SEO" />
    </div>
  </div>
  <div class="p-tarjeta-cuerpo">
    {#if explicacion}
      <div class="explica">
        <p><strong>Esta nota la calcula el panel, no Google.</strong> Comprueba lo básico que Google recomienda (título, descripción, estructura, enlaces, imágenes) y dos cosas clave para un negocio de barrio: que se nombre Barajas y que se pueda pedir cita.</p>
        <p>Sirve para no olvidarse de nada, pero no garantiza posiciones. Lo que de verdad mide el resultado son los datos de Google de abajo y la sección <a href="#/estadisticas">Estadísticas</a>.</p>
        <p>Los avisos con botón se arreglan con un clic; los demás te dicen exactamente qué tocar.</p>
      </div>
    {/if}

    <label class="p-campo" for="seo-clave">
      <span class="p-etiqueta">Palabra clave principal</span>
      <input id="seo-clave" class="p-input" bind:value={clave} placeholder="Lo que buscaría alguien en Google" />
    </label>
    {#if sugerencias.length && !clave}
      <div class="sugerencias">
        <span class="p-ayuda">Ideas:</span>
        {#each sugerencias as s (s)}<button class="p-chip boton" type="button" onclick={() => (clave = s)}>{s}</button>{/each}
      </div>
    {/if}

    {#if mejorar.length}
      <p class="grupo">Por mejorar ({mejorar.length})</p>
      <ul class="checks">
        {#each mejorar as c (c.id)}
          <li class={c.nivel}>
            <Icono nombre={c.nivel === 'mal' ? 'CircleAlert' : 'TriangleAlert'} />
            <div class="txt">
              <strong>{c.texto}</strong>
              {#if c.consejo}<small>{c.consejo}</small>{/if}
              {#if c.detalles?.length}<ul class="detalles">{#each c.detalles as d (d)}<li>{d}</li>{/each}</ul>{/if}
              {#if c.arreglo}
                <button class="p-btn pequeno arreglar" type="button" onclick={() => onarreglo(c.arreglo!)}>
                  <Icono nombre={c.arreglo.tipo === 'insertar' ? 'Sparkles' : 'ArrowRight'} /> {c.arreglo.texto}
                </button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="todo-bien"><Icono nombre="CircleCheck" /> Todo lo comprobable está en orden.</p>
    {/if}

    {#if bien.length}
      <button class="ver-bien" type="button" aria-expanded={verBien} onclick={() => (verBien = !verBien)}>
        <Icono nombre={verBien ? 'ChevronUp' : 'ChevronDown'} /> Lo que ya está bien ({bien.length})
      </button>
      {#if verBien}
        <ul class="checks">
          {#each bien as c (c.id)}<li class="bien"><Icono nombre="CircleCheck" /><div class="txt"><strong>{c.texto}</strong></div></li>{/each}
        </ul>
      {/if}
    {/if}

    <p class="p-ayuda">{analisis.palabras} palabras · {analisis.lectura} min de lectura</p>
    <VistaGoogle titulo={vistaGoogle.titulo} descripcion={vistaGoogle.descripcion} url={vistaGoogle.url} />

    {#if publicada}
      <div class="google">
        <p class="grupo"><Icono nombre="ScanSearch" /> En Google, últimos 3 meses</p>
        {#if rendimiento}
          <div class="cifras">
            <span><strong>{n(rendimiento.impresiones)}</strong> veces vista</span>
            <span><strong>{n(rendimiento.clics)}</strong> clics</span>
            <span><strong>{rendimiento.posicion ? n(rendimiento.posicion) : '–'}</strong> posición media</span>
          </div>
          {#if rendimiento.consultas.length}
            <p class="p-ayuda">Búsquedas con las que aparece (pulsa una para usarla como palabra clave):</p>
            <ul class="consultas">
              {#each rendimiento.consultas.slice(0, 6) as q (q.consulta)}
                <li><button type="button" onclick={() => (clave = q.consulta)}>{q.consulta}</button><span class="p-apagado">{n(q.impresiones)} · pos. {n(q.posicion)}</span></li>
              {/each}
            </ul>
          {:else}
            <p class="p-ayuda">Todavía no aparece en búsquedas. Es normal en páginas nuevas: Google tarda unas semanas.</p>
          {/if}
          {#if estado.modo === 'demo'}<p class="p-ayuda">Datos de ejemplo.</p>{/if}
        {:else if errorRend}
          <p class="p-error-campo">{errorRend}</p>
        {:else if puedeRendimiento}
          <p class="p-ayuda"><Icono nombre="Loader" clase="p-girar" /> Consultando a Google…</p>
        {:else}
          <p class="p-ayuda">Conecta Search Console en <a href="#/estadisticas">Estadísticas</a> para ver cuántas veces sale esta página en Google y con qué búsquedas.</p>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .nota { display: flex; align-items: center; gap: 6px; }
  .explica { display: grid; gap: 8px; padding: 12px 14px; border-radius: 12px; background: var(--p-info-fondo); color: #233d80; font-size: 0.88rem; }
  .sugerencias { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: -6px; }
  .p-chip.boton { border: 1px solid var(--p-borde-fuerte); background: var(--p-superficie); cursor: pointer; }
  .p-chip.boton:hover { border-color: var(--p-roble); background: #fbf3e7; }
  .grupo { display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--p-apagado); }
  .checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  .checks > li { display: flex; gap: 8px; align-items: flex-start; font-size: 0.88rem; }
  .txt { display: grid; gap: 3px; min-width: 0; }
  .txt small { color: var(--p-texto-2); }
  .detalles { margin: 2px 0 0; padding-left: 1.1em; color: var(--p-texto-2); font-size: 0.82rem; display: grid; gap: 2px; }
  .arreglar { justify-self: start; margin-top: 4px; border-color: var(--p-roble); color: var(--p-roble-oscuro); background: #fffaf3; }
  .arreglar:hover { background: #fbf0e0; border-color: var(--p-roble-oscuro); }
  .checks li.bien :global(.p-icono) { color: var(--p-ok); }
  .checks li.mejorable > :global(.p-icono) { color: #c98a14; }
  .checks li.mal > :global(.p-icono) { color: var(--p-error); }
  .checks :global(.p-icono) { margin-top: 2px; }
  .todo-bien { display: flex; gap: 8px; align-items: center; font-weight: 700; color: var(--p-ok); }
  .ver-bien { justify-self: start; display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: none; color: var(--p-texto-2); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
  .google { display: grid; gap: 8px; padding-top: 12px; border-top: 1px solid var(--p-borde); }
  .cifras { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .cifras span { display: grid; padding: 8px; border-radius: 10px; background: var(--p-superficie-2); font-size: 0.75rem; color: var(--p-apagado); text-align: center; }
  .cifras strong { font-size: 1.1rem; color: var(--p-texto); font-variant-numeric: tabular-nums; }
  .consultas { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .consultas li { display: flex; justify-content: space-between; gap: 8px; font-size: 0.85rem; }
  .consultas button { padding: 0; border: 0; background: none; font-weight: 700; text-align: left; cursor: pointer; text-decoration: underline; text-decoration-color: var(--p-roble-claro); text-underline-offset: 3px; }
  .consultas span { white-space: nowrap; font-variant-numeric: tabular-nums; }
</style>
