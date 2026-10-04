<script lang="ts">
  import { untrack } from 'svelte';
  import Icono from '../componentes/Icono.svelte';
  import Interruptor from '../componentes/Interruptor.svelte';
  import ListaOrdenable from '../componentes/ListaOrdenable.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { clonar } from '../lib/texto';
  import { paginasInternas } from '../lib/paginas';
  import type { DatosPortada } from '../../lib/esquemas';

  let d = $state(clonar(estado.json<DatosPortada>(RUTAS.portada)));
  const paginas = paginasInternas();
  const lineas = $derived(d.titulo.split(/(?<=\.)\s+/));

  $effect(() => {
    const nuevo = $state.snapshot(d);
    untrack(() => estado.fijarJson(RUTAS.portada, nuevo, 'Portada'));
  });
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Portada</h1>
      <p>Lo primero que ve cualquiera que entra en la web. Frases cortas y claras funcionan mejor.</p>
    </div>
    <a class="p-btn" href={estado.config.sitio} target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Ver la portada</a>
  </header>

  <section class="previa" aria-label="Vista previa">
    <p class="ante">{d.antetitulo}</p>
    <h2>{#each lineas as l, i (i)}<span class:dos={i === 1}>{l}</span>{/each}</h2>
    <p class="sub">{d.subtitulo}</p>
    <div class="promos-previa">
      {#each d.promos.filter((p) => p.visible) as p (p)}
        <div class="promo-previa">{#if p.etiqueta}<span class="etq">{p.etiqueta}</span>{/if}<strong>{p.titulo}</strong><span>{p.texto}</span></div>
      {/each}
    </div>
  </section>

  <div class="p-dos-columnas">
    <section class="p-tarjeta">
      <div class="p-tarjeta-cab"><h2><Icono nombre="House" /> Titular</h2></div>
      <div class="p-tarjeta-cuerpo">
        <label class="p-campo"><span class="p-etiqueta">Antetítulo <small>sobre el titular · bueno para Google</small></span><input class="p-input" bind:value={d.antetitulo} /></label>
        <label class="p-campo"><span class="p-etiqueta">Titular <small>cada frase acabada en punto va en una línea</small></span><input class="p-input grande" bind:value={d.titulo} /></label>
        <label class="p-campo">
          <span class="p-etiqueta">Subtítulo <small class="p-contador {d.subtitulo.length > 200 ? 'mejorable' : 'bien'}">{d.subtitulo.length}</small></span>
          <textarea class="p-textarea" bind:value={d.subtitulo}></textarea>
        </label>
      </div>
    </section>

    <section class="p-tarjeta">
      <div class="p-tarjeta-cab">
        <h2><Icono nombre="Sparkles" /> Destacados</h2>
        <button class="p-btn pequeno" type="button" onclick={() => d.promos.push({ etiqueta: '', titulo: 'Nuevo destacado', texto: '', enlace: '/pedir-cita/', visible: true })}><Icono nombre="Plus" /> Añadir</button>
      </div>
      <div class="p-tarjeta-cuerpo">
        <p class="p-ayuda">Las tarjetas bajo el titular. Tres es el número ideal.</p>
        <ListaOrdenable bind:items={d.promos}>
          {#snippet fila(p, i)}
            <div class="promo">
              <div class="p-rejilla dos">
                <label class="p-campo"><span class="p-etiqueta">Etiqueta</span><input class="p-input" bind:value={p.etiqueta} placeholder="Gratis" /></label>
                <label class="p-campo"><span class="p-etiqueta">Título</span><input class="p-input" bind:value={p.titulo} /></label>
              </div>
              <label class="p-campo"><span class="p-etiqueta">Texto</span><input class="p-input" bind:value={p.texto} /></label>
              <div class="pie-promo">
                <select class="p-select" bind:value={p.enlace} aria-label="Enlace">
                  {#each paginas as pg (pg.ruta)}<option value={pg.ruta}>{pg.grupo} · {pg.titulo}</option>{/each}
                </select>
                <Interruptor bind:activo={p.visible} etiqueta="Visible" compacto />
                <button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Quitar" onclick={() => d.promos.splice(i, 1)}><Icono nombre="Trash2" /></button>
              </div>
            </div>
          {/snippet}
        </ListaOrdenable>
      </div>
    </section>
  </div>
</div>

<style>
  .previa {
    display: grid;
    gap: 14px;
    padding: 28px;
    border-radius: 18px;
    background: #f8f4ee;
    border: 1px solid var(--p-borde);
    box-shadow: var(--p-sombra);
  }
  .ante { font-family: var(--p-mono); font-weight: 700; font-size: 0.82rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--p-roble-oscuro); }
  .previa h2 { display: grid; font-size: clamp(2.2rem, 1.6rem + 2.4vw, 3.6rem); font-weight: 800; letter-spacing: -0.045em; line-height: 0.98; }
  .previa h2 .dos { color: var(--p-roble-oscuro); }
  .sub { max-width: 60ch; font-size: 1.1rem; color: var(--p-texto-2); }
  .promos-previa { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
  .promo-previa { display: grid; gap: 4px; padding: 14px; border-radius: 14px; background: #fff; box-shadow: var(--p-sombra); font-size: 0.9rem; }
  .promo-previa .etq { justify-self: start; padding: 2px 8px; border-radius: 999px; background: var(--p-tinta); color: #fff; font-family: var(--p-mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .promo-previa span:last-child { color: var(--p-apagado); }
  .promo { display: grid; gap: 10px; }
  .pie-promo { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; }
</style>
