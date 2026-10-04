<script lang="ts">
  import { untrack } from 'svelte';
  import Icono from '../componentes/Icono.svelte';
  import ListaOrdenable from '../componentes/ListaOrdenable.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { clonar } from '../lib/texto';
  import type { DatosNegocio, DatosResenas } from '../../lib/esquemas';

  let d = $state(clonar(estado.json<DatosResenas>(RUTAS.resenas)));
  const negocio = estado.json<DatosNegocio>(RUTAS.negocio);

  $effect(() => {
    const nuevo = $state.snapshot(d);
    untrack(() => estado.fijarJson(RUTAS.resenas, nuevo, 'Reseñas'));
  });

  function nueva() {
    d.resenas.unshift({ autor: '', texto: '', estrellas: 5, fecha: '', fuente: 'Google' });
  }
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Reseñas</h1>
      <p>Las opiniones que salen en la portada. Copia reseñas reales de Google, con el nombre tal y como aparece allí.</p>
    </div>
    <div class="p-acciones">
      <a class="p-btn" href={negocio.redes.googleMaps || 'https://www.google.com/maps'} target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Abrir mis reseñas en Google</a>
      <button class="p-btn primario" type="button" onclick={nueva}><Icono nombre="Plus" /> Añadir reseña</button>
    </div>
  </header>

  <section class="p-tarjeta">
    <div class="p-tarjeta-cuerpo nota">
      <label class="p-campo"><span class="p-etiqueta">Nota media en Google</span><input class="p-input" type="number" min="1" max="5" step="0.1" bind:value={d.notaMedia} placeholder="4,9" /></label>
      <label class="p-campo"><span class="p-etiqueta">Número de reseñas</span><input class="p-input" type="number" min="0" step="1" bind:value={d.totalResenas} placeholder="37" /></label>
      <p class="p-ayuda">Si las rellenas, la portada muestra «4,9 ★★★★★ 37 reseñas en Google». Actualízalas de vez en cuando.</p>
    </div>
  </section>

  {#if d.resenas.length}
    <ListaOrdenable bind:items={d.resenas}>
      {#snippet fila(r, i)}
        <div class="resena">
          <div class="cab">
            <div class="estrellas" role="radiogroup" aria-label="Estrellas">
              {#each [1, 2, 3, 4, 5] as n (n)}
                <button type="button" role="radio" aria-checked={r.estrellas === n} aria-label={`${n} estrellas`} class:llena={n <= r.estrellas} onclick={() => (r.estrellas = n)}>★</button>
              {/each}
            </div>
            <button class="p-btn fantasma pequeno peligro" type="button" onclick={() => confirm('¿Quitar esta reseña?') && d.resenas.splice(i, 1)}><Icono nombre="Trash2" /> Quitar</button>
          </div>
          <textarea class="p-textarea" bind:value={r.texto} placeholder="Pega aquí el texto de la reseña"></textarea>
          <div class="p-rejilla tres">
            <label class="p-campo"><span class="p-etiqueta">Nombre</span><input class="p-input" bind:value={r.autor} placeholder="Carmen G." /></label>
            <label class="p-campo"><span class="p-etiqueta">Fecha <small>opcional</small></span><input class="p-input" bind:value={r.fecha} placeholder="hace 2 semanas" /></label>
            <label class="p-campo"><span class="p-etiqueta">Origen</span><input class="p-input" bind:value={r.fuente} /></label>
          </div>
        </div>
      {/snippet}
    </ListaOrdenable>
    <p class="p-ayuda">Se muestran en la portada en este orden. Arrastra para cambiarlo: las tres primeras son las que más se ven.</p>
  {:else}
    <section class="p-tarjeta p-vacio">
      <Icono nombre="Star" />
      <h2>Aún no hay reseñas en la web</h2>
      <p>Mientras tanto, la portada invita a dejar una en Google. Con 3 reseñas reales la web gana muchísima confianza.</p>
      <button class="p-btn primario" type="button" onclick={nueva}><Icono nombre="Plus" /> Añadir la primera</button>
    </section>
  {/if}
</div>

<style>
  .nota { display: grid; gap: 16px; }
  @media (min-width: 760px) { .nota { grid-template-columns: 200px 200px 1fr; align-items: end; } }
  .resena { display: grid; gap: 10px; }
  .cab { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .estrellas { display: flex; }
  .estrellas button { border: 0; background: none; font-size: 1.6rem; line-height: 1; color: var(--p-borde-fuerte); cursor: pointer; padding: 0 2px; }
  .estrellas button.llena { color: #e1a03c; }
</style>
