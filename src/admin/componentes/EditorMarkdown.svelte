<script lang="ts">
  // Editor de texto con formato (Markdown), barra de herramientas, atajos de
  // teclado y vista previa con la tipografía de la web.
  import Icono from './Icono.svelte';
  import Modal from './Modal.svelte';
  import SelectorImagen from './SelectorImagen.svelte';
  import { aHtml } from '../lib/seo';
  import { estado } from '../lib/estado.svelte';
  import { paginasInternas } from '../lib/paginas';
  import { rutaPublica } from '../lib/medios';
  import type { NombreIcono } from '../lib/iconos';

  let { valor = $bindable(''), alto = 460 }: { valor?: string; alto?: number } = $props();

  let modo = $state<'escribir' | 'dividido' | 'vista'>('escribir');
  let area: HTMLTextAreaElement | undefined = $state();
  let enlaceAbierto = $state(false);
  let imagenAbierta = $state(false);
  let enlace = $state({ texto: '', url: '' });
  let seleccion = { ini: 0, fin: 0 };

  const html = $derived(modo === 'escribir' ? '' : aHtml(valor, estado.config.base));
  const paginas = $derived(enlaceAbierto ? paginasInternas() : []);

  function recordar() {
    if (area) seleccion = { ini: area.selectionStart, fin: area.selectionEnd };
  }

  function reemplazar(ini: number, fin: number, texto: string, cursorIni?: number, cursorFin?: number) {
    valor = valor.slice(0, ini) + texto + valor.slice(fin);
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(cursorIni ?? ini + texto.length, cursorFin ?? cursorIni ?? ini + texto.length);
    });
  }

  function envolver(antes: string, despues = antes, ejemplo = 'texto') {
    if (!area) return;
    const { selectionStart: a, selectionEnd: b } = area;
    const sel = valor.slice(a, b) || ejemplo;
    reemplazar(a, b, `${antes}${sel}${despues}`, a + antes.length, a + antes.length + sel.length);
  }

  function prefijoLinea(prefijo: string | ((i: number) => string)) {
    if (!area) return;
    const { selectionStart: a, selectionEnd: b } = area;
    const ini = valor.lastIndexOf('\n', a - 1) + 1;
    const fin = valor.indexOf('\n', b) === -1 ? valor.length : valor.indexOf('\n', b);
    const lineas = valor.slice(ini, fin).split('\n');
    const nuevo = lineas
      .map((l, i) => {
        const p = typeof prefijo === 'string' ? prefijo : prefijo(i);
        return l.startsWith(p) ? l.slice(p.length) : p + l.replace(/^(#{1,6} |> |- |\d+\. )/, '');
      })
      .join('\n');
    reemplazar(ini, fin, nuevo, ini, ini + nuevo.length);
  }

  function insertar(texto: string) {
    const { ini, fin } = seleccion;
    const antes = ini > 0 && valor[ini - 1] !== '\n' ? '\n\n' : '';
    reemplazar(ini, fin, `${antes}${texto}\n`);
  }

  function abrirEnlace() {
    recordar();
    enlace = { texto: valor.slice(seleccion.ini, seleccion.fin), url: '' };
    enlaceAbierto = true;
  }

  function ponerEnlace() {
    if (!enlace.url) return;
    const texto = enlace.texto || enlace.url;
    reemplazar(seleccion.ini, seleccion.fin, `[${texto}](${enlace.url})`);
    enlaceAbierto = false;
  }

  function teclas(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === 'b') (e.preventDefault(), envolver('**'));
    if (e.key === 'i') (e.preventDefault(), envolver('*'));
    if (e.key === 'k') (e.preventDefault(), abrirEnlace());
  }

  const herramientas: { icono: NombreIcono; titulo: string; accion: () => void }[] = [
    { icono: 'Heading2', titulo: 'Subtítulo', accion: () => prefijoLinea('## ') },
    { icono: 'Heading3', titulo: 'Subtítulo pequeño', accion: () => prefijoLinea('### ') },
    { icono: 'Bold', titulo: 'Negrita (Ctrl+B)', accion: () => envolver('**') },
    { icono: 'Italic', titulo: 'Cursiva (Ctrl+I)', accion: () => envolver('*') },
    { icono: 'List', titulo: 'Lista', accion: () => prefijoLinea('- ') },
    { icono: 'ListOrdered', titulo: 'Lista numerada', accion: () => prefijoLinea((i) => `${i + 1}. `) },
    { icono: 'Quote', titulo: 'Cita destacada', accion: () => prefijoLinea('> ') },
    { icono: 'Link2', titulo: 'Enlace (Ctrl+K)', accion: abrirEnlace },
    {
      icono: 'Image',
      titulo: 'Insertar foto',
      accion: () => {
        recordar();
        imagenAbierta = true;
      },
    },
    { icono: 'CalendarDays', titulo: 'Botón «Pide tu cita»', accion: () => (recordar(), insertar('[Pide tu cita en un minuto](/pedir-cita/).')) },
  ];
</script>

<div class="editor" style={`--alto: ${alto}px`}>
  <div class="barra" role="toolbar" aria-label="Formato">
    <div class="herramientas">
      {#each herramientas as h (h.titulo)}
        <button type="button" class="p-btn fantasma solo-icono pequeno" title={h.titulo} aria-label={h.titulo} onmousedown={(e) => e.preventDefault()} onclick={h.accion} disabled={modo === 'vista'}>
          <Icono nombre={h.icono} />
        </button>
      {/each}
    </div>
    <div class="modos" role="tablist" aria-label="Vista">
      <button type="button" role="tab" aria-selected={modo === 'escribir'} onclick={() => (modo = 'escribir')}><Icono nombre="Pencil" /> Escribir</button>
      <button type="button" role="tab" aria-selected={modo === 'dividido'} onclick={() => (modo = 'dividido')} class="solo-ancho"><Icono nombre="Columns2" /> Dividido</button>
      <button type="button" role="tab" aria-selected={modo === 'vista'} onclick={() => (modo = 'vista')}><Icono nombre="Eye" /> Vista previa</button>
    </div>
  </div>
  <div class="zona {modo}">
    {#if modo !== 'vista'}
      <textarea bind:this={area} bind:value={valor} onkeydown={teclas} onblur={recordar} spellcheck="true" lang="es" aria-label="Texto"></textarea>
    {/if}
    {#if modo !== 'escribir'}
      <div class="vista p-prosa">{@html html}</div>
    {/if}
  </div>
  <p class="pie p-apagado">
    <span><strong>## </strong>subtítulo · <strong>**negrita**</strong> · <strong>- </strong>lista · <strong>[texto](/enlace/)</strong></span>
  </p>
</div>

<Modal bind:abierto={enlaceAbierto} titulo="Insertar enlace">
  <div class="p-campo">
    <span class="p-etiqueta">Texto del enlace</span>
    <input class="p-input" bind:value={enlace.texto} placeholder="Por ejemplo: revisión de la vista gratis" />
  </div>
  <div class="p-campo">
    <span class="p-etiqueta">Página de la web</span>
    <select class="p-select" onchange={(e) => (enlace.url = (e.target as HTMLSelectElement).value)}>
      <option value="">Elige una página…</option>
      {#each ['Páginas', 'Servicios', 'Blog'] as grupo (grupo)}
        <optgroup label={grupo}>
          {#each paginas.filter((p) => p.grupo === grupo) as p (p.ruta)}
            <option value={p.ruta} selected={enlace.url === p.ruta}>{p.titulo}</option>
          {/each}
        </optgroup>
      {/each}
    </select>
  </div>
  <div class="p-campo">
    <span class="p-etiqueta">O una dirección completa</span>
    <input class="p-input" bind:value={enlace.url} placeholder="https://…" />
  </div>
  {#snippet pie()}
    <button class="p-btn" type="button" onclick={() => (enlaceAbierto = false)}>Cancelar</button>
    <button class="p-btn primario" type="button" disabled={!enlace.url} onclick={ponerEnlace}><Icono nombre="Link2" /> Insertar</button>
  {/snippet}
</Modal>

<SelectorImagen bind:abierto={imagenAbierta} titulo="Insertar foto en el texto" onelegir={(ruta) => insertar(`![Describe la foto](${rutaPublica(ruta)})`)} />

<style>
  .editor { border: 1px solid var(--p-borde-fuerte); border-radius: 12px; background: var(--p-superficie); overflow: hidden; }
  .editor:focus-within { border-color: var(--p-roble); box-shadow: 0 0 0 4px rgb(185 132 79 / 0.15); }
  .barra { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; padding: 6px; border-bottom: 1px solid var(--p-borde); background: var(--p-superficie-2); }
  .herramientas { display: flex; flex-wrap: wrap; gap: 2px; }
  .modos { display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: #ece7df; }
  .modos button { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 0; border-radius: 8px; background: none; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
  .modos button[aria-selected='true'] { background: var(--p-superficie); box-shadow: var(--p-sombra); }
  .modos :global(.p-icono) { width: 15px; height: 15px; }
  @media (max-width: 899px) { .solo-ancho { display: none !important; } }
  .zona { display: grid; height: var(--alto); }
  .zona.dividido { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  textarea {
    width: 100%;
    height: 100%;
    padding: 16px 18px;
    border: 0;
    outline: none;
    resize: none;
    font-family: var(--p-sans);
    font-size: 1rem;
    line-height: 1.7;
    background: transparent;
  }
  .vista { height: 100%; overflow: auto; padding: 16px 22px; }
  .dividido .vista { border-left: 1px solid var(--p-borde); background: #fbf9f6; }
  .pie { padding: 6px 12px; border-top: 1px solid var(--p-borde); font-size: 0.78rem; }
  .pie strong { font-family: var(--p-mono); }
</style>
