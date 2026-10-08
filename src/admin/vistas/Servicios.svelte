<script lang="ts">
  import Icono from '../componentes/Icono.svelte';
  import Anillo from '../componentes/Anillo.svelte';
  import ListaOrdenable from '../componentes/ListaOrdenable.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { leerMd, escribirMd } from '../lib/frontmatter';
  import { analizar } from '../lib/seo';
  import { slugDe } from '../lib/paginas';
  import type { NombreIcono } from '../lib/iconos';
  import { ICONOS } from '../lib/iconos';

  type Fila = { ruta: string; slug: string; title: string; summary: string; area: string; order: number; icon: string; badge?: string; puntuacion: number };

  function leer(): Fila[] {
    return estado
      .rutas(RUTAS.servicios)
      .map((ruta) => {
        const { datos, cuerpo } = leerMd<Record<string, unknown>>(estado.texto(ruta) ?? '');
        const slug = slugDe(ruta);
        const { puntuacion } = analizar({
          tipo: 'servicio',
          titulo: String(datos.h1 ?? ''),
          tituloSeo: String(datos.seoTitle ?? ''),
          descripcion: String(datos.description ?? ''),
          cuerpo,
          slug,
          palabraClave: datos.keyword as string | undefined,
          imagen: datos.image as string | undefined,
          textoImagen: datos.imageAlt as string | undefined,
          extra: { faqs: (datos.faqs as unknown[] | undefined)?.length ?? 0 },
        });
        return { ruta, slug, title: String(datos.title ?? slug), summary: String(datos.summary ?? ''), area: String(datos.area ?? 'vista'), order: Number(datos.order ?? 10), icon: String(datos.icon ?? 'Eye'), badge: datos.badge as string | undefined, puntuacion };
      })
      .sort((a, b) => a.order - b.order);
  }

  let vista = $state(leer().filter((f) => f.area === 'vista'));
  let oido = $state(leer().filter((f) => f.area === 'oido'));

  // Reordenar = reescribir el campo «order» de cada servicio del grupo.
  function guardarOrden(lista: Fila[]) {
    lista.forEach((f, i) => {
      if (f.order === i + 1) return;
      const { datos, cuerpo } = leerMd<Record<string, unknown>>(estado.texto(f.ruta) ?? '');
      estado.fijarTexto(f.ruta, escribirMd({ ...datos, order: i + 1 }, cuerpo), `Orden de «${f.title}»`);
      f.order = i + 1;
    });
  }
  const icono = (n: string): NombreIcono => (n in ICONOS ? (n as NombreIcono) : 'Eye');
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Servicios</h1>
      <p>Cada servicio tiene su página, pensada para salir en Google con búsquedas como «lentes progresivas Barajas». Arrastra para cambiar el orden en la web.</p>
    </div>
    <a class="p-btn primario" href="#/servicios/nuevo"><Icono nombre="Plus" /> Nuevo servicio</a>
  </header>

  {#each [['Óptica', 'vista'], ['Audición', 'oido']] as [titulo, area] (area)}
    <section class="grupo">
      <h2><Icono nombre={area === 'vista' ? 'Eye' : 'Ear'} /> {titulo}</h2>
      {#if area === 'vista'}
        <ListaOrdenable bind:items={vista} onmover={() => guardarOrden(vista)}>
          {#snippet fila(f)}{@render tarjeta(f)}{/snippet}
        </ListaOrdenable>
      {:else}
        <ListaOrdenable bind:items={oido} onmover={() => guardarOrden(oido)}>
          {#snippet fila(f)}{@render tarjeta(f)}{/snippet}
        </ListaOrdenable>
      {/if}
    </section>
  {/each}
</div>

{#snippet tarjeta(f: Fila)}
  <a class="servicio" href={`#/servicios/${f.slug}`}>
    <span class="ic"><Icono nombre={icono(f.icon)} /></span>
    <span class="txt">
      <strong>{f.title} {#if f.badge}<span class="p-chip">{f.badge}</span>{/if} {#if estado.pendientes[f.ruta]}<span class="p-chip tinta">Sin publicar</span>{/if}</strong>
      <small class="p-apagado">{f.summary}</small>
    </span>
    <Anillo valor={f.puntuacion} tamano={42} etiqueta="SEO" />
  </a>
{/snippet}

<style>
  .grupo { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .grupo h2 { display: flex; align-items: center; gap: 8px; font-size: 1.1rem; color: var(--p-texto-2); }
  .servicio { display: flex; align-items: center; gap: 14px; text-decoration: none; padding: 2px 4px; font-size: 0.8rem; }
  .ic { display: grid; place-items: center; width: 42px; height: 42px; flex: none; border-radius: 12px; background: var(--p-fondo); color: var(--p-roble-oscuro); }
  .txt { flex: 1; display: grid; min-width: 0; line-height: 1.35; }
  .txt strong { font-size: 1rem; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .txt small { font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
