<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icono from './Icono.svelte';

  let {
    abierto = $bindable(false),
    titulo,
    ancho = '560px',
    children,
    pie,
  }: { abierto?: boolean; titulo: string; ancho?: string; children: Snippet; pie?: Snippet } = $props();

  let dialogo: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  });
</script>

<dialog
  bind:this={dialogo}
  class="modal"
  style={`--ancho: ${ancho}`}
  onclose={() => (abierto = false)}
  onclick={(e) => {
    if (e.target === dialogo) abierto = false;
  }}
  aria-label={titulo}
>
  {#if abierto}
    <div class="caja">
      <header>
        <h2>{titulo}</h2>
        <button class="p-btn fantasma solo-icono pequeno" type="button" onclick={() => (abierto = false)} aria-label="Cerrar"><Icono nombre="X" /></button>
      </header>
      <div class="cuerpo">{@render children()}</div>
      {#if pie}<footer>{@render pie()}</footer>{/if}
    </div>
  {/if}
</dialog>

<style>
  .modal {
    width: min(100% - 24px, var(--ancho));
    max-height: min(88dvh, 900px);
    padding: 0;
    border: 0;
    border-radius: 18px;
    background: var(--p-superficie);
    box-shadow: var(--p-sombra-2);
    color: inherit;
  }
  .modal::backdrop { background: rgb(23 20 17 / 0.45); backdrop-filter: blur(3px); }
  .modal[open] { animation: entrar 0.18s ease-out; }
  @keyframes entrar { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
  .caja { display: flex; flex-direction: column; max-height: inherit; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--p-borde); }
  header h2 { font-size: 1.1rem; }
  .cuerpo { padding: 20px; overflow: auto; display: grid; gap: 16px; }
  footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--p-borde); background: var(--p-superficie-2); }
</style>
