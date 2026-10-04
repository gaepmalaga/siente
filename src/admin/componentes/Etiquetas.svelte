<script lang="ts">
  // Lista de palabras (marcas, barrios…): escribe y pulsa Enter para añadir.
  import Icono from './Icono.svelte';
  let { valores = $bindable([]), placeholder = 'Escribe y pulsa Enter' }: { valores?: string[]; placeholder?: string } = $props();
  let texto = $state('');

  function anadir() {
    const t = texto.trim().replace(/,$/, '');
    if (t && !valores.includes(t)) valores = [...valores, t];
    texto = '';
  }
</script>

<div class="etiquetas">
  {#each valores as v, i (v)}
    <span class="etq">
      {v}
      <button type="button" aria-label={`Quitar ${v}`} onclick={() => (valores = valores.filter((_, j) => j !== i))}><Icono nombre="X" /></button>
    </span>
  {/each}
  <input
    bind:value={texto}
    {placeholder}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        anadir();
      } else if (e.key === 'Backspace' && !texto && valores.length) valores = valores.slice(0, -1);
    }}
    onblur={anadir}
  />
</div>

<style>
  .etiquetas { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px; min-height: 44px; border: 1px solid var(--p-borde-fuerte); border-radius: 10px; background: var(--p-superficie); }
  .etiquetas:focus-within { border-color: var(--p-roble); box-shadow: 0 0 0 4px rgb(185 132 79 / 0.18); }
  .etq { display: inline-flex; align-items: center; gap: 4px; padding: 4px 4px 4px 10px; border-radius: 999px; background: var(--p-fondo); font-weight: 700; font-size: 0.88rem; }
  .etq button { display: grid; place-items: center; width: 22px; height: 22px; border: 0; border-radius: 50%; background: none; cursor: pointer; color: var(--p-apagado); }
  .etq button:hover { background: var(--p-borde); color: var(--p-texto); }
  .etq :global(.p-icono) { width: 14px; height: 14px; }
  input { flex: 1; min-width: 160px; border: 0; outline: none; background: none; padding: 4px 6px; }
</style>
