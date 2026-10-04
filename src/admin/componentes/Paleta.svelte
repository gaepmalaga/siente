<script lang="ts">
  // Buscador de órdenes (Ctrl+K): ir a cualquier sección, artículo o servicio
  // y lanzar acciones rápidas sin tocar el ratón.
  import Icono from './Icono.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { leerMd } from '../lib/frontmatter';
  import { slugDe } from '../lib/paginas';
  import { normalizar } from '../lib/texto';
  import type { NombreIcono } from '../lib/iconos';
  import { SECCIONES } from '../lib/secciones';

  type Orden = { titulo: string; grupo: string; icono: NombreIcono; accion: () => void; extra?: string };

  let consulta = $state('');
  let activo = $state(0);
  let entrada: HTMLInputElement | undefined = $state();
  let dialogo: HTMLDialogElement | undefined = $state();

  const ordenes = $derived.by((): Orden[] => {
    if (!estado.paletaAbierta) return [];
    const ir = (r: string) => () => estado.ir(r);
    const base: Orden[] = [
      { titulo: 'Escribir un artículo nuevo', grupo: 'Acciones', icono: 'FilePlus', accion: ir('/blog/nuevo') },
      { titulo: 'Avisar de un cierre o vacaciones', grupo: 'Acciones', icono: 'CalendarX', accion: ir('/horario#cierres') },
      { titulo: 'Poner un aviso en la web', grupo: 'Acciones', icono: 'Megaphone', accion: ir('/horario#aviso') },
      { titulo: 'Añadir una reseña', grupo: 'Acciones', icono: 'Star', accion: ir('/resenas') },
      { titulo: 'Subir fotos', grupo: 'Acciones', icono: 'Upload', accion: ir('/fotos') },
      { titulo: 'Revisar y publicar cambios', grupo: 'Acciones', icono: 'CloudUpload', accion: () => (estado.bandejaAbierta = true), extra: estado.numPendientes ? `${estado.numPendientes}` : '' },
      { titulo: 'Abrir la web', grupo: 'Acciones', icono: 'Globe', accion: () => open(estado.config.sitio, '_blank') },
      { titulo: 'Imprimir carteles y tarjetas', grupo: 'Acciones', icono: 'Printer', accion: () => open(`${estado.config.sitio}imprimir/`, '_blank') },
      ...SECCIONES.map((s) => ({ titulo: s.titulo, grupo: 'Secciones', icono: s.icono, accion: ir(s.ruta) })),
    ];
    const posts = estado.rutas(RUTAS.blog).map((r) => ({
      titulo: String(leerMd<{ title?: string }>(estado.texto(r) ?? '').datos.title ?? slugDe(r)),
      grupo: 'Artículos',
      icono: 'Newspaper' as const,
      accion: ir(`/blog/${slugDe(r)}`),
    }));
    const servicios = estado.rutas(RUTAS.servicios).map((r) => ({
      titulo: String(leerMd<{ title?: string }>(estado.texto(r) ?? '').datos.title ?? slugDe(r)),
      grupo: 'Servicios',
      icono: 'Stethoscope' as const,
      accion: ir(`/servicios/${slugDe(r)}`),
    }));
    return [...base, ...servicios, ...posts];
  });

  const resultados = $derived.by(() => {
    const q = normalizar(consulta.trim());
    const lista = q ? ordenes.filter((o) => q.split(/\s+/).every((p) => normalizar(`${o.titulo} ${o.grupo}`).includes(p))) : ordenes.slice(0, 18);
    return lista.slice(0, 40);
  });

  $effect(() => {
    if (!dialogo) return;
    if (estado.paletaAbierta && !dialogo.open) {
      consulta = '';
      activo = 0;
      dialogo.showModal();
      requestAnimationFrame(() => entrada?.focus());
    } else if (!estado.paletaAbierta && dialogo.open) dialogo.close();
  });

  $effect(() => {
    void consulta;
    activo = 0;
  });

  function ejecutar(o: Orden | undefined) {
    if (!o) return;
    estado.paletaAbierta = false;
    o.accion();
  }

  function teclas(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') (e.preventDefault(), (activo = Math.min(activo + 1, resultados.length - 1)));
    if (e.key === 'ArrowUp') (e.preventDefault(), (activo = Math.max(activo - 1, 0)));
    if (e.key === 'Enter') (e.preventDefault(), ejecutar(resultados[activo]));
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && estado.fase === 'listo') {
      e.preventDefault();
      estado.paletaAbierta = !estado.paletaAbierta;
    }
  }}
/>

<dialog bind:this={dialogo} class="paleta" onclose={() => (estado.paletaAbierta = false)} onclick={(e) => e.target === dialogo && (estado.paletaAbierta = false)} aria-label="Buscar">
  <div class="caja">
    <label class="buscar">
      <Icono nombre="Search" />
      <input bind:this={entrada} bind:value={consulta} onkeydown={teclas} placeholder="Busca una sección, un artículo o una acción…" aria-label="Buscar" />
      <span class="p-kbd">Esc</span>
    </label>
    <ul role="listbox" aria-label="Resultados">
      {#each resultados as o, i (o.grupo + o.titulo)}
        {#if i === 0 || resultados[i - 1].grupo !== o.grupo}<li class="grupo" role="presentation">{o.grupo}</li>{/if}
        <li role="option" aria-selected={i === activo}>
          <button type="button" class:activo={i === activo} onmouseenter={() => (activo = i)} onclick={() => ejecutar(o)}>
            <Icono nombre={o.icono} />
            <span>{o.titulo}</span>
            {#if o.extra}<span class="p-chip tinta">{o.extra}</span>{/if}
            <Icono nombre="ArrowRight" clase="flecha" />
          </button>
        </li>
      {:else}
        <li class="nada">Nada coincide con «{consulta}».</li>
      {/each}
    </ul>
    <p class="pie p-apagado"><span class="p-kbd">↑</span> <span class="p-kbd">↓</span> para moverte · <span class="p-kbd">Enter</span> para abrir</p>
  </div>
</dialog>

<style>
  .paleta {
    width: min(640px, calc(100% - 24px));
    margin-top: 12vh;
    padding: 0;
    border: 0;
    border-radius: 18px;
    background: var(--p-superficie);
    box-shadow: var(--p-sombra-2);
    color: inherit;
  }
  .paleta::backdrop { background: rgb(23 20 17 / 0.4); backdrop-filter: blur(3px); }
  .caja { display: flex; flex-direction: column; max-height: 70dvh; }
  .buscar { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--p-borde); }
  .buscar :global(.p-icono) { color: var(--p-apagado); }
  .buscar input { flex: 1; border: 0; outline: none; background: none; font-size: 1.1rem; }
  ul { list-style: none; margin: 0; padding: 8px; overflow: auto; }
  .grupo { padding: 10px 10px 4px; font-family: var(--p-mono); font-weight: 700; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--p-roble-oscuro); }
  button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; border: 0; border-radius: 10px; background: none; text-align: left; font-weight: 700; cursor: pointer; }
  button span:first-of-type { flex: 1; }
  button.activo { background: var(--p-fondo); }
  button :global(.flecha) { opacity: 0; color: var(--p-apagado); }
  button.activo :global(.flecha) { opacity: 1; }
  .nada { padding: 20px; text-align: center; color: var(--p-apagado); }
  .pie { padding: 10px 16px; border-top: 1px solid var(--p-borde); font-size: 0.8rem; }
</style>
