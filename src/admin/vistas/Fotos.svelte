<script lang="ts">
  import Icono from '../componentes/Icono.svelte';
  import Modal from '../componentes/Modal.svelte';
  import Recortador from '../componentes/Recortador.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { prepararImagen, formatoDe, type Giro, type Recorte } from '../lib/imagenes';
  import { nombreLibre, usosDe, rutaPublica, claveFoto, type Uso } from '../lib/medios';
  import { tamano } from '../lib/texto';
  import type { Medio } from '../lib/tipos';

  let pestana = $state<'uploads' | 'fotos'>('uploads');
  let arrastrando = $state(false);
  let procesando = $state(0);
  let detalle = $state<Medio | null>(null);
  let detalleAbierto = $state(false);
  const prefijo = $derived(pestana === 'fotos' ? RUTAS.fotos : RUTAS.uploads);
  const lista = $derived(estado.medios.filter((m) => m.ruta.startsWith(prefijo)));
  const usos = $derived(detalle ? usosDe(detalle.ruta) : ([] as Uso[]));
  const pesoTotal = $derived(lista.reduce((s, m) => s + m.tamano, 0));

  // Recorte: al subir una sola foto, o para retocar una ya subida.
  let recortando = $state(false);
  let origenRecorte = $state<Blob | null>(null);
  let alAplicar: (r: { recorte: Recorte | null; giro: Giro }) => void = () => {};
  let alSaltar: (() => void) | undefined = $state();

  function elegidas(archivos: File[]) {
    const imagenes = archivos.filter((a) => a.type.startsWith('image/'));
    if (imagenes.length !== 1) return void subir(imagenes);
    origenRecorte = imagenes[0];
    alAplicar = (r) => subir(imagenes, r);
    alSaltar = () => subir(imagenes);
    recortando = true;
  }

  async function retocar(m: Medio) {
    try {
      origenRecorte = await (await fetch(m.url)).blob();
    } catch {
      return estado.aviso('No se ha podido abrir la foto para retocarla.', 'error');
    }
    alSaltar = undefined;
    alAplicar = async (r) => {
      if (!r.recorte && !r.giro) return;
      const nombre = m.ruta.split('/').pop()!;
      const img = await prepararImagen(origenRecorte!, { ...r, formato: formatoDe(m.ruta), nombre, ladoMaximo: 2000 });
      estado.subirMedio(m.ruta, img.base64, img.vistaPrevia, img.tamano);
      detalle = estado.medios.find((x) => x.ruta === m.ruta) ?? null;
      estado.aviso('Foto retocada. Se cambiará en toda la web al publicar.', 'ok');
    };
    recortando = true;
  }

  async function subir(archivos: File[], retoque: { recorte: Recorte | null; giro: Giro } = { recorte: null, giro: 0 }) {
    const imagenes = archivos.filter((a) => a.type.startsWith('image/'));
    procesando = imagenes.length;
    let ahorro = 0;
    for (const a of imagenes) {
      try {
        const img = await prepararImagen(a, retoque);
        ahorro += Math.max(0, a.size - img.tamano);
        const destino = nombreLibre(pestana === 'fotos' ? RUTAS.fotos : `${RUTAS.uploads}blog/`, img.nombre);
        estado.subirMedio(destino, img.base64, img.vistaPrevia, img.tamano);
      } catch (e) {
        estado.aviso(`${a.name}: ${(e as Error).message}`, 'error');
      }
      procesando--;
    }
    if (imagenes.length) estado.aviso(`${imagenes.length === 1 ? 'Foto lista' : `${imagenes.length} fotos listas`}. Optimizadas: ${tamano(ahorro)} menos.`, 'ok');
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    arrastrando = false;
    elegidas([...(e.dataTransfer?.files ?? [])]);
  }

  function borrar(m: Medio) {
    const u = usosDe(m.ruta);
    const msg = u.length ? `Esta foto se usa en: ${u.map((x) => x.titulo).join(', ')}. Si la borras, ahí dejará de verse. ¿Borrarla igualmente?` : '¿Borrar esta foto?';
    if (!confirm(msg)) return;
    if (m.pendiente) estado.descartar(m.ruta);
    else estado.borrar(m.ruta, `Borrar foto ${m.ruta.split('/').pop()}`);
    detalleAbierto = false;
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto);
    estado.aviso('Copiado.', 'ok');
  }
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Fotos</h1>
      <p>Todas las fotos de la web. Al subirlas se reducen y se convierten a WebP: la web sigue cargando rápido aunque subas fotos del móvil.</p>
    </div>
    <label class="p-btn primario grande">
      <Icono nombre="Upload" /> Subir fotos
      <input type="file" accept="image/*" multiple hidden onchange={(e) => { elegidas([...((e.target as HTMLInputElement).files ?? [])]); (e.target as HTMLInputElement).value = ''; }} />
    </label>
  </header>

  <div class="seg" role="tablist">
    <button type="button" role="tab" aria-selected={pestana === 'uploads'} onclick={() => (pestana = 'uploads')}><Icono nombre="Newspaper" /> Blog y web</button>
    <button type="button" role="tab" aria-selected={pestana === 'fotos'} onclick={() => (pestana = 'fotos')}><Icono nombre="Store" /> Fotos del local <small>servicios y portada</small></button>
  </div>

  <div
    class="zona"
    class:arrastrando
    role="region"
    aria-label="Zona para soltar fotos"
    ondragover={(e) => { e.preventDefault(); arrastrando = true; }}
    ondragleave={() => (arrastrando = false)}
    ondrop={soltar}
  >
    {#if procesando}
      <p><Icono nombre="Loader" clase="p-girar" /> Optimizando {procesando} {procesando === 1 ? 'foto' : 'fotos'}…</p>
    {:else}
      <p><Icono nombre="CloudUpload" /> Arrastra fotos aquí · {lista.length} fotos · {tamano(pesoTotal)} en total</p>
    {/if}
  </div>

  {#if lista.length}
    <ul class="rejilla">
      {#each lista as m (m.ruta)}
        <li class:pendiente={m.pendiente} class:borrando={estado.pendientes[m.ruta]?.tipo === 'borrar'}>
          <button type="button" class="foto" onclick={() => { detalle = m; detalleAbierto = true; }}>
            <img src={m.url} alt="" loading="lazy" />
          </button>
          <div class="info">
            <span class="nombre" title={m.ruta}>{m.ruta.split('/').pop()}</span>
            <span class="meta">
              {#if estado.pendientes[m.ruta]?.tipo === 'borrar'}<span class="p-chip error">Se borrará</span>
              {:else if m.pendiente}<span class="p-chip tinta">Sin publicar</span>
              {:else}<span class="p-apagado">{tamano(m.tamano)}</span>{/if}
              {#if usosDe(m.ruta).length}<span class="p-chip ok">En uso</span>{/if}
            </span>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="p-tarjeta p-vacio"><Icono nombre="Images" /> Aún no hay fotos aquí.</div>
  {/if}
</div>

<Modal bind:abierto={detalleAbierto} titulo={detalle?.ruta.split('/').pop() ?? 'Foto'} ancho="720px">
  {#if detalle}
    <img class="foto-grande" src={detalle.url} alt="" />
    <dl class="datos">
      <div><dt>Tamaño</dt><dd>{tamano(detalle.tamano)}</dd></div>
      <div>
        <dt>{detalle.ruta.startsWith(RUTAS.fotos) ? 'Nombre para servicios' : 'Dirección'}</dt>
        <dd><code>{detalle.ruta.startsWith(RUTAS.fotos) ? claveFoto(detalle.ruta) : rutaPublica(detalle.ruta)}</code>
          <button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Copiar" onclick={() => copiar(detalle!.ruta.startsWith(RUTAS.fotos) ? claveFoto(detalle!.ruta) : rutaPublica(detalle!.ruta))}><Icono nombre="Copy" /></button></dd>
      </div>
      <div>
        <dt>Dónde se usa</dt>
        <dd>
          {#if usos.length}
            <ul>{#each usos as u (u.ruta)}<li><a href={`#${u.enlace}`} onclick={() => (detalleAbierto = false)}>{u.titulo}</a></li>{/each}</ul>
          {:else}<span class="p-apagado">En ningún sitio todavía</span>{/if}
        </dd>
      </div>
    </dl>
  {/if}
  {#snippet pie()}
    <button class="p-btn peligro" type="button" onclick={() => detalle && borrar(detalle)}><Icono nombre="Trash2" /> Borrar</button>
    <button class="p-btn" type="button" onclick={() => detalle && retocar(detalle)} disabled={detalle?.ruta.endsWith('.svg')}><Icono nombre="Crop" /> Recortar o girar</button>
    <button class="p-btn" type="button" onclick={() => (detalleAbierto = false)}>Cerrar</button>
  {/snippet}
</Modal>

<Recortador bind:abierto={recortando} origen={origenRecorte} titulo="Recortar y girar" textoAplicar={alSaltar ? 'Recortar y subir' : 'Guardar retoque'} sinRecortar={alSaltar} onaplicar={(r) => alAplicar(r)} />

<style>
  label.p-btn { cursor: pointer; }
  .seg { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; border-radius: 12px; background: #ebe5dc; justify-self: start; }
  .seg button { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border: 0; border-radius: 9px; background: none; font-weight: 700; cursor: pointer; }
  .seg small { color: var(--p-apagado); font-weight: 400; }
  .seg button[aria-selected='true'] { background: var(--p-superficie); box-shadow: var(--p-sombra); }
  .zona { display: grid; place-items: center; padding: 22px; border: 2px dashed var(--p-borde-fuerte); border-radius: 14px; color: var(--p-texto-2); font-weight: 700; transition: background 0.15s, border-color 0.15s; }
  .zona p { display: flex; align-items: center; gap: 8px; }
  .zona.arrastrando { background: #fbf3e7; border-color: var(--p-roble); }
  .rejilla { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; }
  .rejilla li { display: grid; border-radius: 14px; background: var(--p-superficie); border: 1px solid var(--p-borde); overflow: hidden; box-shadow: var(--p-sombra); }
  .rejilla li.pendiente { border-color: var(--p-roble); }
  .rejilla li.borrando { opacity: 0.5; }
  .foto { padding: 0; border: 0; background: var(--p-fondo); cursor: zoom-in; }
  .foto img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
  .info { display: grid; gap: 4px; padding: 10px; font-size: 0.82rem; }
  .nombre { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .foto-grande { width: 100%; max-height: 50dvh; object-fit: contain; border-radius: 12px; background: var(--p-fondo); }
  .datos { display: grid; gap: 10px; margin: 0; }
  .datos div { display: grid; grid-template-columns: 170px 1fr; gap: 10px; }
  .datos dt { font-weight: 700; }
  .datos dd { margin: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .datos ul { margin: 0; padding-left: 1.1em; }
</style>
