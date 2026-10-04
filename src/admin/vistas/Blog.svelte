<script lang="ts">
  import Icono from '../componentes/Icono.svelte';
  import Anillo from '../componentes/Anillo.svelte';
  import { estado } from '../lib/estado.svelte';
  import { articulos } from '../lib/salud';
  import { fechaLarga } from '../../lib/horario';
  import { normalizar } from '../lib/texto';

  let filtro = $state<'todos' | 'publicado' | 'programado' | 'borrador'>('todos');
  let busqueda = $state('');
  const todos = $derived(articulos());
  const lista = $derived(
    todos.filter((a) => (filtro === 'todos' || a.estadoPub === filtro) && normalizar(`${a.title} ${a.description}`).includes(normalizar(busqueda))),
  );
  const cuenta = (f: string) => (f === 'todos' ? todos.length : todos.filter((a) => a.estadoPub === f).length);
  const miniatura = (cover?: string) => (cover ? estado.medios.find((m) => m.ruta === `public${cover}`)?.url : undefined);
  const CATEGORIA: Record<string, string> = { vista: 'Vista', oido: 'Oído', general: 'Consejos' };
  const FILTROS = [
    ['todos', 'Todos'],
    ['publicado', 'Publicados'],
    ['programado', 'Programados'],
    ['borrador', 'Borradores'],
  ] as const;
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Blog</h1>
      <p>Un artículo útil al mes mantiene la web viva para Google y da motivos para compartirla en Instagram.</p>
    </div>
    <a class="p-btn primario grande" href="#/blog/nuevo"><Icono nombre="FilePlus" /> Escribir artículo</a>
  </header>

  <div class="filtros">
    <div class="seg" role="tablist">
      {#each FILTROS as [v, t] (v)}
        <button type="button" role="tab" aria-selected={filtro === v} onclick={() => (filtro = v)}>{t} <span>{cuenta(v)}</span></button>
      {/each}
    </div>
    <label class="buscar"><Icono nombre="Search" /><input class="p-input" placeholder="Buscar artículos" bind:value={busqueda} /></label>
  </div>

  <section class="p-tarjeta">
    {#if lista.length}
      <div class="p-lista">
        {#each lista as a (a.ruta)}
          <a class="p-fila articulo" href={`#/blog/${a.slug}`}>
            {#if miniatura(a.cover)}<img src={miniatura(a.cover)} alt="" loading="lazy" />{:else}<span class="sin-img"><Icono nombre="Image" /></span>{/if}
            <span class="txt">
              <strong>{a.title || 'Sin título'}</strong>
              <span class="meta">
                {#if a.estadoPub === 'publicado'}<span class="p-chip ok">Publicado</span>{:else if a.estadoPub === 'programado'}<span class="p-chip info"><Icono nombre="CalendarDays" /> {fechaLarga(a.date)}</span>{:else}<span class="p-chip aviso">Borrador</span>{/if}
                <span class="p-chip">{CATEGORIA[a.category ?? 'general']}</span>
                {#if estado.pendientes[a.ruta]}<span class="p-chip tinta">Sin publicar</span>{/if}
                <span class="p-apagado fecha">{a.date ? fechaLarga(a.date, true) : ''}</span>
              </span>
            </span>
            <span class="seo" title="Puntuación SEO"><Anillo valor={a.puntuacion} tamano={44} etiqueta="SEO" /></span>
          </a>
        {/each}
      </div>
    {:else}
      <div class="p-vacio"><Icono nombre="Newspaper" /> No hay artículos {busqueda ? 'que coincidan' : 'aquí'}.</div>
    {/if}
  </section>
</div>

<style>
  .filtros { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; }
  .seg { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; border-radius: 12px; background: #ebe5dc; }
  .seg button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 0; border-radius: 9px; background: none; font-weight: 700; cursor: pointer; font-size: 0.9rem; }
  .seg button span { color: var(--p-apagado); font-size: 0.8rem; }
  .seg button[aria-selected='true'] { background: var(--p-superficie); box-shadow: var(--p-sombra); }
  .buscar { position: relative; min-width: 240px; }
  .buscar :global(.p-icono) { position: absolute; left: 12px; top: 12px; color: var(--p-apagado); }
  .buscar input { padding-left: 38px; }
  .articulo { gap: 16px; }
  .articulo img, .sin-img { width: 72px; height: 54px; flex: none; border-radius: 10px; object-fit: cover; background: var(--p-fondo); }
  .sin-img { display: grid; place-items: center; color: var(--p-apagado); }
  .txt { flex: 1; display: grid; gap: 6px; min-width: 0; }
  .txt strong { font-size: 1.02rem; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .fecha { font-size: 0.85rem; }
  .seo { flex: none; font-size: 0.8rem; }
</style>
