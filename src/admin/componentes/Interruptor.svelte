<script lang="ts">
  let {
    activo = $bindable(false),
    etiqueta,
    ayuda = '',
    compacto = false,
    onchange,
  }: { activo?: boolean; etiqueta: string; ayuda?: string; compacto?: boolean; onchange?: (v: boolean) => void } = $props();
</script>

<label class="interruptor" class:compacto>
  <span class="texto">
    <span class="etq">{etiqueta}</span>
    {#if ayuda}<span class="p-ayuda">{ayuda}</span>{/if}
  </span>
  <input type="checkbox" role="switch" bind:checked={activo} onchange={() => onchange?.(activo)} />
  <span class="pista" aria-hidden="true"><span class="bola"></span></span>
</label>

<style>
  .interruptor { display: flex; align-items: center; justify-content: space-between; gap: 16px; cursor: pointer; }
  .interruptor.compacto { flex-direction: row-reverse; justify-content: flex-end; gap: 10px; padding: 8px 12px 8px 8px; border: 1px solid var(--p-borde); border-radius: 12px; background: var(--p-superficie); }
  .interruptor.compacto:has(input:checked) { border-color: #b9dcc6; background: #f5fbf7; }
  .texto { display: grid; gap: 2px; }
  .etq { font-weight: 700; font-size: 0.95rem; }
  input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .pista {
    position: relative;
    width: 46px;
    height: 28px;
    flex: none;
    border-radius: 999px;
    background: #d9d2c6;
    transition: background 0.2s;
  }
  .bola {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
    transition: transform 0.2s cubic-bezier(0.3, 0.7, 0.3, 1);
  }
  input:checked + .pista { background: var(--p-ok); }
  input:checked + .pista .bola { transform: translateX(18px); }
  input:focus-visible + .pista { outline: 3px solid var(--p-roble); outline-offset: 2px; }
</style>
