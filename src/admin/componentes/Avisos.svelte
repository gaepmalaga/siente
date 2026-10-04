<script lang="ts">
  import { fly } from 'svelte/transition';
  import { estado } from '../lib/estado.svelte';
  import Icono from './Icono.svelte';
</script>

<div class="avisos" aria-live="polite">
  {#each estado.avisos as a (a.id)}
    <div class="aviso {a.tipo}" in:fly={{ y: 16, duration: 200 }} out:fly={{ x: 40, duration: 180 }}>
      <Icono nombre={a.tipo === 'ok' ? 'CircleCheck' : a.tipo === 'error' ? 'CircleAlert' : 'Info'} />
      <span>{a.texto}</span>
      {#if a.accion}
        <button class="p-btn pequeno" type="button" onclick={a.accion.fn}>{a.accion.texto}</button>
      {/if}
      <button class="cerrar" type="button" aria-label="Cerrar aviso" onclick={() => (estado.avisos = estado.avisos.filter((x) => x.id !== a.id))}>
        <Icono nombre="X" />
      </button>
    </div>
  {/each}
</div>

<style>
  .avisos {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 90;
    display: grid;
    gap: 8px;
    width: min(420px, calc(100% - 32px));
  }
  .aviso {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 12px 12px 14px;
    border-radius: 14px;
    background: var(--p-tinta);
    color: #fff;
    box-shadow: var(--p-sombra-2);
    font-weight: 700;
    font-size: 0.95rem;
  }
  .aviso span { flex: 1; }
  .aviso.ok :global(.p-icono) { color: #7ee2a4; }
  .aviso.error { background: #5c1c12; }
  .aviso.error :global(.p-icono) { color: #ffb4a6; }
  .aviso.info :global(.p-icono) { color: var(--p-luz); }
  .aviso .p-btn { background: rgb(255 255 255 / 0.12); border-color: transparent; color: #fff; }
  .cerrar { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; background: none; color: rgb(255 255 255 / 0.7); cursor: pointer; }
  .cerrar:hover { background: rgb(255 255 255 / 0.12); }
  @media (max-width: 899px) { .avisos { bottom: 84px; } }
</style>
