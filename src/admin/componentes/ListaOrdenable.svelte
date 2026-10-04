<script lang="ts" generics="T">
  // Lista que se reordena arrastrando (ratón o dedo) o con los botones ↑ ↓
  // (teclado y lectores de pantalla).
  import type { Snippet } from 'svelte';
  import { flip } from 'svelte/animate';
  import Icono from './Icono.svelte';

  let {
    items = $bindable(),
    fila,
    onmover,
  }: { items: T[]; fila: Snippet<[T, number]>; onmover?: () => void } = $props();

  let agarrado = $state<number | null>(null);
  let destino = $state<number | null>(null);

  function mover(de: number, a: number) {
    if (a < 0 || a >= items.length || de === a) return;
    const copia = [...items];
    const [x] = copia.splice(de, 1);
    copia.splice(a, 0, x);
    items = copia;
    onmover?.();
  }

  // Arrastre con puntero (funciona igual con el dedo que con el ratón).
  let lista: HTMLUListElement | undefined = $state();
  function empezar(e: PointerEvent, i: number) {
    agarrado = i;
    destino = i;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function arrastrar(e: PointerEvent) {
    if (agarrado === null || !lista) return;
    const filas = [...lista.children] as HTMLElement[];
    const y = e.clientY;
    let nuevo = filas.length - 1;
    for (let i = 0; i < filas.length; i++) {
      const r = filas[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        nuevo = i;
        break;
      }
    }
    destino = nuevo;
  }
  function soltar() {
    if (agarrado !== null && destino !== null) mover(agarrado, destino);
    agarrado = null;
    destino = null;
  }
</script>

<ul class="ordenable" bind:this={lista}>
  {#each items as item, i (item)}
    <li class:agarrado={agarrado === i} class:destino={destino === i && agarrado !== null && agarrado !== i} animate:flip={{ duration: 180 }}>
      <button
        type="button"
        class="asa"
        aria-label="Arrastrar para reordenar"
        onpointerdown={(e) => empezar(e, i)}
        onpointermove={arrastrar}
        onpointerup={soltar}
        onpointercancel={soltar}
      >
        <Icono nombre="GripVertical" />
      </button>
      <div class="contenido">{@render fila(item, i)}</div>
      <div class="flechas">
        <button type="button" class="p-btn fantasma solo-icono pequeno" aria-label="Subir" disabled={i === 0} onclick={() => mover(i, i - 1)}>
          <Icono nombre="ChevronUp" />
        </button>
        <button type="button" class="p-btn fantasma solo-icono pequeno" aria-label="Bajar" disabled={i === items.length - 1} onclick={() => mover(i, i + 1)}>
          <Icono nombre="ChevronDown" />
        </button>
      </div>
    </li>
  {/each}
</ul>

<style>
  .ordenable { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 10px 8px 10px 4px;
    border: 1px solid var(--p-borde);
    border-radius: 12px;
    background: var(--p-superficie);
    transition: box-shadow 0.15s, border-color 0.15s, opacity 0.15s;
  }
  li.agarrado { opacity: 0.6; box-shadow: var(--p-sombra-2); }
  li.destino { border-color: var(--p-roble); box-shadow: 0 0 0 3px rgb(185 132 79 / 0.25); }
  .asa {
    display: grid;
    place-items: center;
    width: 30px;
    min-height: 40px;
    flex: none;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--p-apagado);
    cursor: grab;
    touch-action: none;
  }
  .asa:active { cursor: grabbing; background: var(--p-superficie-2); }
  .contenido { flex: 1; min-width: 0; }
  .flechas { display: grid; gap: 2px; flex: none; }
</style>
