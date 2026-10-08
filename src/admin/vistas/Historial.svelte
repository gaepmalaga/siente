<script lang="ts">
  import Icono from '../componentes/Icono.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { hace, fechaHora } from '../lib/texto';
  import type { ArchivoCambiado, EntradaHistorial, EstadoDespliegue } from '../lib/tipos';

  let { sha = '' }: { sha?: string } = $props();

  let lista = $state<EntradaHistorial[]>([]);
  let pagina = $state(1);
  let cargando = $state(true);
  let hayMas = $state(true);
  let despliegues = $state<EstadoDespliegue[]>([]);
  let detalle = $state<{ archivos: ArchivoCambiado[]; padre: string | null } | null>(null);
  let deshaciendo = $state(false);
  const elegido = $derived(lista.find((e) => e.sha === sha));

  async function cargar() {
    cargando = true;
    try {
      const nuevos = await estado.backend!.historial(pagina);
      lista = [...lista, ...nuevos];
      hayMas = nuevos.length >= 25;
    } catch (e) {
      estado.aviso((e as Error).message, 'error');
    }
    cargando = false;
  }
  cargar();
  estado.backend?.despliegues().then((d) => (despliegues = d)).catch(() => {});

  $effect(() => {
    detalle = null;
    if (sha) estado.backend?.detalle(sha).then((d) => (detalle = d)).catch((e) => estado.aviso((e as Error).message, 'error'));
  });

  const gestionable = (r: string) => r.startsWith('src/data/') || r.startsWith(RUTAS.blog) || r.startsWith(RUTAS.servicios) || r.startsWith(RUTAS.uploads) || r.startsWith(RUTAS.fotos);
  const despliegueDe = (s: string) => despliegues.find((d) => d.sha === s && !d.esPrevia);

  // Deshacer = dejar como cambios pendientes la versión anterior de cada archivo.
  async function deshacer() {
    if (!elegido) return;
    deshaciendo = true;
    await estado.prepararDeshacer(elegido.sha, elegido.mensaje);
    deshaciendo = false;
  }

  function lineas(parche?: string) {
    return (parche ?? '').split('\n').map((l) => ({ l, tipo: l.startsWith('+') ? 'mas' : l.startsWith('-') ? 'menos' : l.startsWith('@@') ? 'zona' : '' }));
  }
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Historial</h1>
      <p>Cada publicación queda registrada: quién la hizo, cuándo y qué cambió. Cualquier cambio se puede deshacer.</p>
    </div>
  </header>

  <div class="p-dos-columnas">
    <section class="p-tarjeta">
      <div class="p-lista">
        {#each lista as e (e.sha)}
          {@const d = despliegueDe(e.sha)}
          <a class="p-fila" class:elegido={e.sha === sha} href={`#/historial/${e.sha}`}>
            {#if e.avatar}<img class="av" src={e.avatar} alt="" />{:else}<span class="av ic"><Icono nombre="History" /></span>{/if}
            <span class="txt">
              <strong>{e.mensaje.split('\n')[0]}</strong>
              <small class="p-apagado">{e.autor} · {hace(e.fecha)}</small>
            </span>
            {#if d}
              <span class="p-chip {d.estado === 'ok' ? 'ok' : d.estado === 'error' ? 'error' : 'aviso'}" title="Estado de la publicación">
                {d.estado === 'ok' ? 'En la web' : d.estado === 'error' ? 'Falló' : d.estado === 'cancelado' ? 'Sustituido' : 'Publicando'}
              </span>
            {/if}
          </a>
        {/each}
      </div>
      {#if hayMas}
        <div class="p-tarjeta-pie">
          <button class="p-btn pequeno" type="button" disabled={cargando} onclick={() => { pagina++; cargar(); }}>{cargando ? 'Cargando…' : 'Cargar más'}</button>
        </div>
      {/if}
    </section>

    <aside class="p-lateral-fijo">
      {#if sha && elegido}
        <section class="p-tarjeta">
          <div class="p-tarjeta-cab"><h2><Icono nombre="FileText" /> Detalle</h2></div>
          <div class="p-tarjeta-cuerpo">
            <div>
              <strong>{elegido.mensaje.split('\n')[0]}</strong>
              <p class="p-apagado">{elegido.autor} · {fechaHora(elegido.fecha)}</p>
            </div>
            {#if elegido.mensaje.split('\n').length > 2}<pre class="msg">{elegido.mensaje.split('\n').slice(2).join('\n').trim()}</pre>{/if}
            {#if !detalle}
              <p class="p-apagado"><Icono nombre="Loader" clase="p-girar" /> Cargando cambios…</p>
            {:else}
              <ul class="archivos">
                {#each detalle.archivos as f (f.ruta)}
                  <li>
                    <details>
                      <summary>
                        <span class="p-chip {f.estado === 'added' ? 'ok' : f.estado === 'removed' ? 'error' : 'info'}">{f.estado === 'added' ? 'Nuevo' : f.estado === 'removed' ? 'Borrado' : 'Cambiado'}</span>
                        <span class="ruta">{f.ruta}</span>
                      </summary>
                      {#if f.parche}<pre class="diff">{#each lineas(f.parche) as x, i (i)}<span class={x.tipo}>{x.l}
</span>{/each}</pre>{/if}
                    </details>
                  </li>
                {/each}
              </ul>
              {#if detalle.archivos.some((f) => !gestionable(f.ruta))}
                <p class="p-ayuda">Este cambio incluye archivos técnicos de la web; esos solo se pueden deshacer desde GitHub.</p>
              {/if}
              {#if detalle.archivos.some((f) => gestionable(f.ruta))}
                <button class="p-btn primario" type="button" disabled={deshaciendo} onclick={deshacer}>
                  <Icono nombre={deshaciendo ? 'Loader' : 'Undo2'} clase={deshaciendo ? 'p-girar' : ''} /> Deshacer este cambio
                </button>
              {/if}
            {/if}
            {#if elegido.url !== '#'}<a class="p-btn pequeno fantasma" href={elegido.url} target="_blank" rel="noopener">Ver en GitHub <Icono nombre="ExternalLink" /></a>{/if}
          </div>
        </section>
      {:else}
        <section class="p-tarjeta p-vacio"><Icono nombre="History" /> Elige un cambio para ver qué se modificó y, si quieres, deshacerlo.</section>
      {/if}
    </aside>
  </div>
</div>

<style>
  .av { width: 36px; height: 36px; border-radius: 50%; flex: none; }
  .av.ic { display: grid; place-items: center; background: var(--p-fondo); color: var(--p-roble-oscuro); }
  .txt { flex: 1; display: grid; min-width: 0; line-height: 1.3; }
  .txt strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .elegido { background: #fbf3e7; box-shadow: inset 3px 0 0 var(--p-roble); }
  .msg { margin: 0; padding: 10px; border-radius: 8px; background: var(--p-superficie-2); white-space: pre-wrap; font-family: var(--p-sans); font-size: 0.85rem; color: var(--p-texto-2); }
  .archivos { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; }
  summary { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; }
  .ruta { overflow-wrap: anywhere; }
  .diff { margin: 6px 0 0; max-height: 300px; overflow: auto; padding: 8px; border-radius: 8px; background: #faf8f5; font-size: 0.74rem; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
  .diff .mas { background: #dcf3e4; color: #0f5a2f; display: block; }
  .diff .menos { background: #fbe3de; color: #8e2615; display: block; }
  .diff .zona { color: var(--p-info); display: block; }
</style>
