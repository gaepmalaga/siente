<script lang="ts">
  // Cambios pendientes: revisar, descartar y publicar todo de una vez.
  import { fly, fade } from 'svelte/transition';
  import { diffLines } from 'diff';
  import Icono from './Icono.svelte';
  import Modal from './Modal.svelte';
  import { estado } from '../lib/estado.svelte';
  import type { Cambio } from '../lib/tipos';
  import type { NombreIcono } from '../lib/iconos';

  let mensaje = $state('');
  let abiertos = $state<Record<string, boolean>>({});
  const cambios = $derived(Object.values(estado.pendientes));
  const errores = $derived(estado.bandejaAbierta ? estado.validar() : []);
  const erroresDe = (ruta: string) => errores.find((e) => e.ruta === ruta)?.errores ?? [];
  let conflictoAbierto = $state(false);
  $effect(() => {
    conflictoAbierto = !!estado.conflicto;
  });

  function diferencias(c: Cambio) {
    if (c.binario || c.tipo === 'borrar') return [];
    return diffLines(estado.originales[c.ruta] ?? '', c.contenido ?? '');
  }

  const icono = (c: Cambio): NombreIcono => (c.tipo === 'crear' ? 'FilePlus' : c.tipo === 'borrar' ? 'FileMinus' : 'FilePen');
  const verbo = (c: Cambio) => (c.tipo === 'crear' ? 'Nuevo' : c.tipo === 'borrar' ? 'Se borra' : 'Cambiado');

  async function publicar(forzar = false) {
    const ok = await estado.publicar(mensaje, forzar);
    if (ok) mensaje = '';
  }
</script>

{#if estado.bandejaAbierta}
  <div class="velo" transition:fade={{ duration: 150 }} onclick={() => (estado.bandejaAbierta = false)} aria-hidden="true"></div>
  <aside class="bandeja" transition:fly={{ x: 420, duration: 220 }} aria-label="Cambios sin publicar">
    <header>
      <div>
        <h2>Cambios sin publicar</h2>
        <p class="p-apagado">{cambios.length ? 'Se publicarán todos juntos en la web.' : 'No hay nada pendiente.'}</p>
      </div>
      <button class="p-btn fantasma solo-icono" type="button" aria-label="Cerrar" onclick={() => (estado.bandejaAbierta = false)}><Icono nombre="X" /></button>
    </header>

    <div class="lista">
      {#if errores.length}
        <div class="alerta">
          <Icono nombre="CircleAlert" />
          <div>
            <strong>Corrige esto antes de publicar</strong>
            <p>Hay datos incompletos o con un formato que la web no acepta.</p>
          </div>
        </div>
      {/if}
      {#each cambios as c (c.ruta)}
        <article class="cambio" class:con-error={erroresDe(c.ruta).length}>
          <div class="cab">
            <span class="tipo {c.tipo}"><Icono nombre={icono(c)} /></span>
            <div class="info">
              <strong>{c.descripcion}</strong>
              <span class="p-apagado ruta">{verbo(c)} · {c.ruta}</span>
            </div>
            <button class="p-btn fantasma solo-icono pequeno" type="button" title="Descartar este cambio" aria-label="Descartar este cambio" onclick={() => estado.descartar(c.ruta)}>
              <Icono nombre="Undo2" />
            </button>
          </div>
          {#each erroresDe(c.ruta) as e (e)}
            <p class="err">{e}</p>
          {/each}
          {#if c.binario && c.vistaPrevia}
            <img src={c.vistaPrevia} alt="" class="mini" />
          {:else if c.tipo !== 'borrar'}
            <button class="ver" type="button" onclick={() => (abiertos[c.ruta] = !abiertos[c.ruta])}>
              <Icono nombre={abiertos[c.ruta] ? 'ChevronUp' : 'ChevronDown'} /> {abiertos[c.ruta] ? 'Ocultar' : 'Ver'} diferencias
            </button>
            {#if abiertos[c.ruta]}
              <pre class="diff">{#each diferencias(c) as parte, i (i)}{#if parte.added}<ins>{parte.value}</ins>{:else if parte.removed}<del>{parte.value}</del>{:else}<span class="igual">{parte.value.split('\n').length > 6 ? `${parte.value.split('\n').slice(0, 2).join('\n')}\n…\n${parte.value.split('\n').slice(-3).join('\n')}` : parte.value}</span>{/if}{/each}</pre>
            {/if}
          {/if}
        </article>
      {:else}
        <div class="p-vacio"><Icono nombre="CircleCheck" /> Todo está publicado.</div>
      {/each}
    </div>

    {#if cambios.length}
      <footer>
        <label class="p-campo">
          <span class="p-etiqueta">Nota para el historial <small>opcional</small></span>
          <input class="p-input" bind:value={mensaje} placeholder="Por ejemplo: horario de Navidad" maxlength="90" />
        </label>
        <div class="botones">
          <button class="p-btn peligro" type="button" onclick={() => confirm('¿Descartar todos los cambios sin publicar?') && estado.descartarTodo()}>Descartar todo</button>
          <button class="p-btn primario grande" type="button" disabled={estado.publicando || errores.length > 0} onclick={() => publicar()}>
            {#if estado.publicando}<Icono nombre="Loader" clase="p-girar" /> Publicando…{:else}<Icono nombre="CloudUpload" /> Publicar {cambios.length === 1 ? '1 cambio' : `${cambios.length} cambios`}{/if}
          </button>
        </div>
        {#if estado.modo === 'demo'}<p class="p-ayuda">Modo demostración: nada se guarda de verdad.</p>{/if}
      </footer>
    {/if}
  </aside>
{/if}

<Modal bind:abierto={conflictoAbierto} titulo="Alguien ha cambiado lo mismo">
  <p>Mientras editabas, otra persona ha publicado cambios en:</p>
  <ul>
    {#each estado.conflicto ?? [] as r (r)}<li><code>{r}</code></li>{/each}
  </ul>
  <p>Si publicas igualmente, tu versión sustituirá a la suya en esos archivos. El resto de sus cambios se mantiene.</p>
  {#snippet pie()}
    <button class="p-btn" type="button" onclick={() => (estado.conflicto = null)}>Cancelar</button>
    <button class="p-btn peligro lleno" type="button" onclick={() => { estado.conflicto = null; publicar(true); }}>Publicar mi versión</button>
  {/snippet}
</Modal>

<style>
  .velo { position: fixed; inset: 0; z-index: 70; background: rgb(23 20 17 / 0.35); }
  .bandeja {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 71;
    display: flex;
    flex-direction: column;
    width: min(460px, 100%);
    background: var(--p-superficie);
    box-shadow: var(--p-sombra-2);
  }
  header { display: flex; justify-content: space-between; gap: 12px; padding: 20px; border-bottom: 1px solid var(--p-borde); }
  header h2 { font-size: 1.25rem; }
  .lista { flex: 1; overflow: auto; padding: 16px; display: grid; gap: 10px; align-content: start; }
  .alerta { display: flex; gap: 12px; padding: 14px; border-radius: 12px; background: var(--p-error-fondo); color: var(--p-error); }
  .alerta p { color: var(--p-texto-2); font-size: 0.9rem; }
  .cambio { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--p-borde); border-radius: 12px; }
  .cambio.con-error { border-color: #e9b8ae; background: #fffaf9; }
  .cab { display: flex; gap: 10px; align-items: flex-start; }
  .tipo { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border-radius: 10px; background: var(--p-info-fondo); color: var(--p-info); }
  .tipo.crear { background: var(--p-ok-fondo); color: var(--p-ok); }
  .tipo.borrar { background: var(--p-error-fondo); color: var(--p-error); }
  .info { flex: 1; display: grid; min-width: 0; }
  .ruta { font-size: 0.78rem; overflow-wrap: anywhere; }
  .err { font-size: 0.85rem; color: var(--p-error); font-weight: 700; }
  .ver { justify-self: start; display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: none; color: var(--p-texto-2); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
  .diff { margin: 0; max-height: 280px; overflow: auto; padding: 10px; border-radius: 8px; background: #faf8f5; font-size: 0.78rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
  .diff ins { display: block; text-decoration: none; background: #dcf3e4; color: #0f5a2f; }
  .diff del { display: block; background: #fbe3de; color: #8e2615; }
  .igual { color: var(--p-apagado); }
  .mini { width: 120px; border-radius: 8px; }
  footer { display: grid; gap: 12px; padding: 16px 20px 20px; border-top: 1px solid var(--p-borde); background: var(--p-superficie-2); }
  .botones { display: flex; gap: 8px; justify-content: space-between; flex-wrap: wrap; }
  .botones .primario { flex: 1; }
</style>
