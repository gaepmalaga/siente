<script lang="ts">
  // Indicador de publicación en la barra superior, con los pasos en directo.
  import { fade } from 'svelte/transition';
  import Icono from './Icono.svelte';
  import { estado } from '../lib/estado.svelte';
  import { hace } from '../lib/texto';

  let abierto = $state(false);
  let ahora = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (ahora = Date.now()), 20_000);
    return () => clearInterval(t);
  });
  const d = $derived(estado.despliegue);
  const enCurso = $derived(d && (d.estado === 'en_curso' || d.estado === 'en_cola'));
  const hechos = $derived(d?.pasos?.filter((p) => p.estado === 'ok' || p.estado === 'saltado').length ?? 0);
  const total = $derived(d?.pasos?.length ?? 5);
</script>

{#if d}
  <div class="contenedor">
    <button class="chip {d.estado}" type="button" onclick={() => (abierto = !abierto)} aria-expanded={abierto}>
      {#if enCurso}
        <Icono nombre="Loader" clase="p-girar" /> <span class="txt">Publicando…</span> <span class="p-apagado">{hechos}/{total}</span>
      {:else if d.estado === 'ok'}
        <span class="p-punto"></span> <span class="txt">Publicado {hace(d.fin ?? d.inicio, ahora)}</span>
      {:else if d.estado === 'error'}
        <Icono nombre="CircleAlert" /> <span class="txt">Error al publicar</span>
      {:else}
        <span class="p-punto"></span> <span class="txt">Publicación cancelada</span>
      {/if}
    </button>
    {#if abierto}
      <div class="pop" transition:fade={{ duration: 120 }}>
        <p class="tit">Última publicación</p>
        <p class="msg">{d.mensaje || 'Cambios del panel'}</p>
        {#if d.pasos}
          <ol>
            {#each d.pasos as p (p.nombre)}
              <li class={p.estado}>
                {#if p.estado === 'ok'}<Icono nombre="CircleCheck" />{:else if p.estado === 'en_curso'}<Icono nombre="Loader" clase="p-girar" />{:else if p.estado === 'error'}<Icono nombre="CircleX" />{:else}<span class="vacio"></span>{/if}
                {p.nombre}
              </li>
            {/each}
          </ol>
        {/if}
        {#if enCurso}<p class="p-ayuda">Suele tardar alrededor de un minuto.</p>{/if}
        {#if d.estado === 'error'}
          <p class="fallo">La web sigue mostrando la versión anterior, así que nadie ve nada roto. Lo más rápido es deshacer este cambio y volver a intentarlo.</p>
          <button class="p-btn pequeno primario" type="button" onclick={() => { abierto = false; estado.prepararDeshacer(d.sha, d.mensaje); }}><Icono nombre="Undo2" /> Deshacer este cambio</button>
        {/if}
        <div class="acciones">
          <a class="p-btn pequeno" href={estado.config.sitio} target="_blank" rel="noopener"><Icono nombre="Globe" /> Ver la web</a>
          {#if d.url && d.url !== '#'}<a class="p-btn pequeno fantasma" href={d.url} target="_blank" rel="noopener">Detalles técnicos <Icono nombre="ExternalLink" /></a>{/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .contenedor { position: relative; }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--p-borde);
    border-radius: 999px;
    background: var(--p-superficie);
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .chip.ok { color: var(--p-ok); }
  .chip.error { color: var(--p-error); background: var(--p-error-fondo); border-color: #f0c2b8; }
  .chip.en_curso, .chip.en_cola { color: var(--p-aviso); background: var(--p-aviso-fondo); border-color: #f2d9a7; }
  .chip .p-apagado { font-variant-numeric: tabular-nums; }
  .pop {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 60;
    width: 300px;
    display: grid;
    gap: 10px;
    padding: 16px;
    border-radius: 14px;
    background: var(--p-superficie);
    border: 1px solid var(--p-borde);
    box-shadow: var(--p-sombra-2);
  }
  @media (max-width: 640px) {
    .chip .txt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .pop { position: fixed; top: 64px; left: 12px; right: 12px; width: auto; }
  }
  .fallo { font-size: 0.88rem; color: var(--p-texto-2); }
  .tit { font-family: var(--p-mono); font-weight: 700; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--p-roble-oscuro); }
  .msg { font-weight: 700; }
  ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
  li { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: var(--p-apagado); }
  li.ok { color: var(--p-texto); }
  li.ok :global(.p-icono) { color: var(--p-ok); }
  li.en_curso { color: var(--p-aviso); font-weight: 700; }
  li.error { color: var(--p-error); font-weight: 700; }
  .vacio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--p-borde-fuerte); }
  .acciones { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
