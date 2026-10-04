<script lang="ts">
  // Elegir una foto ya subida o subir una nueva (se optimiza en el navegador).
  import Modal from './Modal.svelte';
  import Icono from './Icono.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { prepararImagen } from '../lib/imagenes';
  import { nombreLibre } from '../lib/medios';
  import { tamano } from '../lib/texto';

  let {
    abierto = $bindable(false),
    carpeta = 'uploads',
    titulo = 'Elegir foto',
    onelegir,
  }: { abierto?: boolean; carpeta?: 'uploads' | 'fotos'; titulo?: string; onelegir: (ruta: string) => void } = $props();

  let busqueda = $state('');
  let subiendo = $state(false);
  const prefijo = $derived(carpeta === 'fotos' ? RUTAS.fotos : RUTAS.uploads);
  const lista = $derived(
    estado.medios.filter((m) => m.ruta.startsWith(prefijo) && m.ruta.toLowerCase().includes(busqueda.toLowerCase())),
  );

  async function subir(e: Event) {
    const archivos = [...((e.target as HTMLInputElement).files ?? [])];
    if (!archivos.length) return;
    subiendo = true;
    try {
      let ultima = '';
      for (const a of archivos) {
        const img = await prepararImagen(a);
        const destino = nombreLibre(carpeta === 'fotos' ? RUTAS.fotos : `${RUTAS.uploads}blog/`, img.nombre);
        estado.subirMedio(destino, img.base64, img.vistaPrevia, img.tamano);
        ultima = destino;
      }
      if (archivos.length === 1 && ultima) {
        onelegir(ultima);
        abierto = false;
      }
    } catch (err) {
      estado.aviso((err as Error).message, 'error');
    } finally {
      subiendo = false;
      (e.target as HTMLInputElement).value = '';
    }
  }
</script>

<Modal bind:abierto {titulo} ancho="860px">
  <div class="barra">
    <label class="buscar">
      <Icono nombre="Search" />
      <input class="p-input" placeholder="Buscar por nombre" bind:value={busqueda} />
    </label>
    <label class="p-btn primario">
      {#if subiendo}<Icono nombre="Loader" clase="p-girar" /> Optimizando…{:else}<Icono nombre="Upload" /> Subir fotos{/if}
      <input type="file" accept="image/*" multiple hidden onchange={subir} />
    </label>
  </div>
  <p class="p-ayuda">Las fotos se reducen y se convierten a WebP automáticamente: pesan hasta 10 veces menos y la web carga más rápido.</p>
  {#if lista.length}
    <ul class="rejilla">
      {#each lista as m (m.ruta)}
        <li>
          <button
            type="button"
            onclick={() => {
              onelegir(m.ruta);
              abierto = false;
            }}
          >
            <img src={m.url} alt="" loading="lazy" />
            <span class="nombre">{m.ruta.split('/').pop()}</span>
            <span class="p-apagado">{m.pendiente ? 'Sin publicar' : tamano(m.tamano)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="p-vacio"><Icono nombre="Images" /> No hay fotos {busqueda ? 'con ese nombre' : 'todavía'}.</div>
  {/if}
</Modal>

<style>
  .barra { display: flex; gap: 10px; flex-wrap: wrap; }
  .buscar { position: relative; flex: 1; min-width: 200px; }
  .buscar :global(.p-icono) { position: absolute; left: 12px; top: 12px; color: var(--p-apagado); }
  .buscar input { padding-left: 38px; }
  label.p-btn { cursor: pointer; }
  .rejilla { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .rejilla button {
    display: grid;
    gap: 4px;
    width: 100%;
    padding: 6px;
    border: 1px solid var(--p-borde);
    border-radius: 12px;
    background: var(--p-superficie);
    text-align: left;
    cursor: pointer;
    font-size: 0.82rem;
  }
  .rejilla button:hover { border-color: var(--p-roble); box-shadow: 0 0 0 3px rgb(185 132 79 / 0.2); }
  img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: var(--p-fondo); }
  .nombre { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
