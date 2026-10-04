<script lang="ts">
  // Recortar y girar una foto antes de subirla (o retocar una ya subida).
  // Se arrastra el recuadro o sus esquinas; con el teclado, flechas para
  // moverlo y Mayúsculas + flechas para cambiar su tamaño.
  import { untrack } from 'svelte';
  import Modal from './Modal.svelte';
  import Icono from './Icono.svelte';
  import { lienzoGirado, type Giro, type Recorte } from '../lib/imagenes';

  let {
    abierto = $bindable(false),
    origen,
    titulo = 'Recortar foto',
    proporcionInicial = null,
    textoAplicar = 'Aplicar',
    sinRecortar,
    onaplicar,
  }: {
    abierto?: boolean;
    origen: Blob | null;
    titulo?: string;
    proporcionInicial?: number | null;
    textoAplicar?: string;
    /** Si se pasa, aparece «Subir sin recortar». */
    sinRecortar?: () => void;
    onaplicar: (r: { recorte: Recorte | null; giro: Giro }) => void;
  } = $props();

  type Caja = { x: number; y: number; w: number; h: number };
  const PROPORCIONES: { nombre: string; valor: number | null }[] = [
    { nombre: 'Libre', valor: null },
    { nombre: '4:3', valor: 4 / 3 },
    { nombre: '3:2', valor: 3 / 2 },
    { nombre: '16:9', valor: 16 / 9 },
    { nombre: '1:1', valor: 1 },
    { nombre: '4:5', valor: 4 / 5 },
  ];
  const MIN = 0.05;

  let bitmap = $state<ImageBitmap | null>(null);
  let giro = $state<Giro>(0);
  let proporcion = $state<number | null>(null);
  let caja = $state<Caja>({ x: 0, y: 0, w: 1, h: 1 });
  let vista = $state('');
  let error = $state('');
  let contenedor: HTMLDivElement | undefined = $state();

  const W = $derived(bitmap ? (giro % 180 === 0 ? bitmap.width : bitmap.height) : 1);
  const H = $derived(bitmap ? (giro % 180 === 0 ? bitmap.height : bitmap.width) : 1);
  const salida = $derived({ ancho: Math.round(caja.w * W), alto: Math.round(caja.h * H) });

  // Cargar la imagen al abrir.
  $effect(() => {
    if (!abierto || !origen) return;
    error = '';
    giro = 0;
    proporcion = proporcionInicial;
    createImageBitmap(origen)
      .then((b) => (bitmap = b))
      .catch(() => (error = 'No se ha podido abrir esta imagen.'));
    return () => {
      bitmap?.close();
      bitmap = null;
    };
  });

  // Vista reducida de la imagen girada.
  $effect(() => {
    if (!bitmap) return;
    const escala = Math.min(1, 1100 / Math.max(bitmap.width, bitmap.height));
    vista = lienzoGirado(bitmap, giro, escala).toDataURL('image/jpeg', 0.85);
    untrack(() => ajustarCaja(proporcion));
  });

  function ajustarCaja(p: number | null) {
    if (!p) return void (caja = { x: 0, y: 0, w: 1, h: 1 });
    // El recuadro más grande con esa proporción, centrado.
    let w = 1;
    let h = (w * W) / (H * p);
    if (h > 1) {
      h = 1;
      w = (h * H * p) / W;
    }
    caja = { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
  }

  const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  function redimensionar(inicio: Caja, modo: string, dx: number, dy: number): Caja {
    const izq = modo.includes('w');
    const arr = modo.includes('n');
    let x1 = inicio.x;
    let y1 = inicio.y;
    let x2 = inicio.x + inicio.w;
    let y2 = inicio.y + inicio.h;
    if (izq) x1 = limitar(x1 + dx, 0, x2 - MIN);
    else x2 = limitar(x2 + dx, x1 + MIN, 1);
    if (arr) y1 = limitar(y1 + dy, 0, y2 - MIN);
    else y2 = limitar(y2 + dy, y1 + MIN, 1);
    if (proporcion) {
      let w = x2 - x1;
      let h = (w * W) / (H * proporcion);
      const disponible = arr ? y2 : 1 - y1;
      if (h > disponible) {
        h = disponible;
        w = (h * H * proporcion) / W;
      }
      if (izq) x1 = x2 - w;
      else x2 = x1 + w;
      if (arr) y1 = y2 - h;
      else y2 = y1 + h;
    }
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  function arrastrar(e: PointerEvent, modo: 'mover' | 'nw' | 'ne' | 'sw' | 'se') {
    if (!contenedor) return;
    e.preventDefault();
    e.stopPropagation();
    const r = contenedor.getBoundingClientRect();
    const inicio = { ...caja };
    const [px, py] = [e.clientX, e.clientY];
    const mover = (ev: PointerEvent) => {
      const dx = (ev.clientX - px) / r.width;
      const dy = (ev.clientY - py) / r.height;
      caja = modo === 'mover' ? { ...inicio, x: limitar(inicio.x + dx, 0, 1 - inicio.w), y: limitar(inicio.y + dy, 0, 1 - inicio.h) } : redimensionar(inicio, modo, dx, dy);
    };
    const soltar = () => {
      removeEventListener('pointermove', mover);
      // Que soltar fuera del recuadro no cierre la ventana.
      const parar = (c: Event) => c.stopPropagation();
      addEventListener('click', parar, { capture: true, once: true });
      setTimeout(() => removeEventListener('click', parar, { capture: true }), 60);
    };
    addEventListener('pointermove', mover);
    addEventListener('pointerup', soltar, { once: true });
  }

  function teclado(e: KeyboardEvent) {
    const paso = e.altKey ? 0.002 : 0.02;
    const d = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
    if (!d) return;
    e.preventDefault();
    caja = e.shiftKey ? redimensionar(caja, 'se', d[0], d[1]) : { ...caja, x: limitar(caja.x + d[0], 0, 1 - caja.w), y: limitar(caja.y + d[1], 0, 1 - caja.h) };
  }

  function aplicar() {
    const completo = caja.x < 0.001 && caja.y < 0.001 && caja.w > 0.999 && caja.h > 0.999;
    onaplicar({
      recorte: completo ? null : { x: Math.round(caja.x * W), y: Math.round(caja.y * H), ancho: Math.round(caja.w * W), alto: Math.round(caja.h * H) },
      giro,
    });
    abierto = false;
  }
</script>

<Modal bind:abierto {titulo} ancho="920px">
  <div class="herramientas">
    <div class="seg" role="radiogroup" aria-label="Proporción">
      {#each PROPORCIONES as p (p.nombre)}
        <button type="button" role="radio" aria-checked={proporcion === p.valor} onclick={() => { proporcion = p.valor; ajustarCaja(p.valor); }}>{p.nombre}</button>
      {/each}
    </div>
    <button class="p-btn pequeno" type="button" onclick={() => (giro = ((giro + 90) % 360) as Giro)}><Icono nombre="RotateCw" /> Girar</button>
    <button class="p-btn pequeno fantasma" type="button" onclick={() => { giro = 0; proporcion = null; ajustarCaja(null); }}><Icono nombre="RotateCcw" /> Restablecer</button>
  </div>

  {#if error}
    <p class="p-error-campo">{error}</p>
  {:else if vista}
    <div class="lienzo">
      <div class="imagen" bind:this={contenedor}>
        <img src={vista} alt="Foto a recortar" draggable="false" />
        <div class="sombra" style={`--x:${caja.x * 100}%;--y:${caja.y * 100}%;--w:${caja.w * 100}%;--h:${caja.h * 100}%`}>
          <div
            class="caja"
            role="slider"
            tabindex="0"
            aria-label="Zona que se conserva. Flechas para moverla; Mayúsculas y flechas para cambiar su tamaño."
            aria-valuenow={Math.round(caja.w * 100)}
            aria-valuemin={5}
            aria-valuemax={100}
            aria-valuetext={`${salida.ancho} por ${salida.alto} píxeles`}
            onpointerdown={(e) => arrastrar(e, 'mover')}
            onkeydown={teclado}
          >
            <span class="tercio v1"></span><span class="tercio v2"></span><span class="tercio h1"></span><span class="tercio h2"></span>
            {#each ['nw', 'ne', 'sw', 'se'] as const as m (m)}
              <span class="asa {m}" onpointerdown={(e) => arrastrar(e, m)} aria-hidden="true"></span>
            {/each}
          </div>
        </div>
      </div>
    </div>
    <p class="p-ayuda tam">Resultado: {salida.ancho} × {salida.alto} px{Math.max(salida.ancho, salida.alto) > 1600 ? ' (se reducirá a 1600 px de lado, más que suficiente para la web)' : ''}.</p>
  {:else}
    <p class="p-ayuda"><Icono nombre="Loader" clase="p-girar" /> Abriendo la foto…</p>
  {/if}

  {#snippet pie()}
    <button class="p-btn" type="button" onclick={() => (abierto = false)}>Cancelar</button>
    {#if sinRecortar}<button class="p-btn" type="button" onclick={() => { abierto = false; sinRecortar(); }}>Subir sin recortar</button>{/if}
    <button class="p-btn primario" type="button" disabled={!vista} onclick={aplicar}><Icono nombre="Crop" /> {textoAplicar}</button>
  {/snippet}
</Modal>

<style>
  .herramientas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .seg { display: flex; flex-wrap: wrap; gap: 3px; padding: 3px; border-radius: 10px; background: #ebe5dc; }
  .seg button { padding: 5px 10px; border: 0; border-radius: 8px; background: none; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
  .seg button[aria-checked='true'] { background: var(--p-superficie); box-shadow: var(--p-sombra); }
  .lienzo { display: grid; place-items: center; padding: 12px; border-radius: 12px; background: #2a2520; }
  .imagen { position: relative; overflow: hidden; line-height: 0; touch-action: none; user-select: none; }
  .imagen img { max-width: 100%; max-height: 58dvh; }
  .sombra { position: absolute; inset: 0; }
  .caja {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: var(--w);
    height: var(--h);
    box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.55);
    outline: 2px solid #fff;
    cursor: move;
  }
  .caja:focus-visible { outline: 3px solid var(--p-luz); }
  .tercio { position: absolute; background: rgb(255 255 255 / 0.35); pointer-events: none; }
  .v1, .v2 { top: 0; bottom: 0; width: 1px; }
  .v1 { left: 33.33%; }
  .v2 { left: 66.66%; }
  .h1, .h2 { left: 0; right: 0; height: 1px; }
  .h1 { top: 33.33%; }
  .h2 { top: 66.66%; }
  .asa { position: absolute; width: 22px; height: 22px; border: 3px solid #fff; background: rgb(0 0 0 / 0.25); }
  .asa.nw { left: 0; top: 0; border-right: 0; border-bottom: 0; cursor: nwse-resize; }
  .asa.ne { right: 0; top: 0; border-left: 0; border-bottom: 0; cursor: nesw-resize; }
  .asa.sw { left: 0; bottom: 0; border-right: 0; border-top: 0; cursor: nesw-resize; }
  .asa.se { right: 0; bottom: 0; border-left: 0; border-top: 0; cursor: nwse-resize; }
  .tam { text-align: center; }
</style>
