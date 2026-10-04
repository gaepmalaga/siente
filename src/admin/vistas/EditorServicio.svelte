<script lang="ts">
  import { untrack } from 'svelte';
  import Icono from '../componentes/Icono.svelte';
  import Anillo from '../componentes/Anillo.svelte';
  import EditorMarkdown from '../componentes/EditorMarkdown.svelte';
  import SelectorImagen from '../componentes/SelectorImagen.svelte';
  import VistaGoogle from '../componentes/VistaGoogle.svelte';
  import ListaOrdenable from '../componentes/ListaOrdenable.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { leerMd, escribirMd } from '../lib/frontmatter';
  import { analizar } from '../lib/seo';
  import { slug as aSlug } from '../lib/texto';
  import { claveFoto } from '../lib/medios';
  import { enWeb } from '../lib/paginas';
  import { ICONOS, type NombreIcono } from '../lib/iconos';

  let props: { slug: string } = $props();
  // El panel recrea el editor al cambiar de artículo, así que el slug no cambia en vida del componente.
  const slug = untrack(() => props.slug);

  type Datos = {
    title: string; h1: string; seoTitle: string; description: string; area: 'vista' | 'oido'; order: number; icon: string;
    summary: string; badge?: string; image?: string; imageAlt?: string; highlights: string[];
    steps: { title: string; text: string }[]; faqs: { q: string; a: string }[]; cita?: string; keyword?: string;
  };

  const esNuevo = slug === 'nuevo';
  const rutaInicial = esNuevo ? '' : `${RUTAS.servicios}${slug}.md`;
  const existe = !esNuevo && estado.texto(rutaInicial) !== undefined;
  const publicadoAntes = !esNuevo && rutaInicial in estado.originales;
  const inicial = existe
    ? leerMd<Datos>(estado.texto(rutaInicial)!)
    : { datos: { title: '', h1: '', seoTitle: '', description: '', area: 'vista', order: 20, icon: 'Eye', summary: '', highlights: [], steps: [], faqs: [] } as Datos, cuerpo: 'Explica en qué consiste el servicio y por qué hacerlo en Siente.\n\n## Qué incluye\n\n- …\n\n[Pide tu cita](/pedir-cita/).' };

  let d = $state<Datos>({ ...inicial.datos, highlights: inicial.datos.highlights ?? [], steps: inicial.datos.steps ?? [], faqs: inicial.datos.faqs ?? [] });
  let cuerpo = $state(inicial.cuerpo);
  // Los puntos clave son textos: los envolvemos para poder reordenarlos.
  let puntos = $state((inicial.datos.highlights ?? []).map((t) => ({ t })));
  let selector = $state(false);
  let rutaCreada = $state(rutaInicial);
  // Texto de partida ya normalizado: si no cambia, abrir el servicio no cuenta como cambio.
  const textoInicial = existe ? untrack(() => escribirMd({ ...$state.snapshot(d), highlights: puntos.map((p) => p.t).filter(Boolean) } as unknown as Record<string, unknown>, inicial.cuerpo)) : '';

  const slugFinal = $derived(esNuevo ? aSlug(d.title) : slug);
  const ruta = $derived(slugFinal ? `${RUTAS.servicios}${slugFinal}.md` : '');
  const urlWeb = $derived(`/${d.area === 'oido' ? 'audifonos-barajas' : 'optica-barajas'}/${slugFinal}/`);
  const foto = $derived(d.image ? estado.medios.find((m) => m.ruta.startsWith(RUTAS.fotos) && claveFoto(m.ruta) === d.image)?.url : undefined);
  const analisis = $derived(
    analizar({ tipo: 'servicio', titulo: d.h1, tituloSeo: d.seoTitle, descripcion: d.description, cuerpo, slug: slugFinal, palabraClave: d.keyword, imagen: d.image, textoImagen: d.imageAlt, extra: { faqs: d.faqs.length } }),
  );

  $effect(() => {
    const datos = { ...$state.snapshot(d), highlights: puntos.map((p) => p.t).filter(Boolean) };
    const texto = escribirMd(datos as unknown as Record<string, unknown>, cuerpo);
    const r = ruta;
    untrack(() => {
      if (!r || !datos.title.trim() || texto === textoInicial) return;
      if (esNuevo && rutaCreada && rutaCreada !== r) estado.descartar(rutaCreada);
      rutaCreada = r;
      estado.fijarTexto(r, texto, `Servicio «${datos.title}»`);
    });
  });

  const ICONOS_SERVICIO: NombreIcono[] = ['ScanEye', 'Eye', 'Glasses', 'Layers', 'Sun', 'Baby', 'Ear', 'AudioLines', 'Wrench', 'Headphones', 'Sparkles', 'ShieldCheck', 'Stethoscope', 'Gift', 'Heart', 'Monitor'];
  const CITAS = [
    ['revision-vista', 'Revisión de la vista'], ['gafas', 'Gafas'], ['progresivas', 'Progresivas'], ['lentillas', 'Lentillas'], ['infantil', 'Visión infantil'],
    ['plan-veo', 'Plan VEO'], ['revision-oido', 'Revisión auditiva'], ['audifonos', 'Audífonos'], ['mantenimiento', 'Mantenimiento de audífonos'], ['otro', 'Otra consulta'],
  ];

  function eliminar() {
    if (!confirm('¿Borrar este servicio de la web? Lo puedes recuperar desde el historial.')) return;
    if (rutaCreada) estado.borrar(rutaCreada, `Borrar servicio «${d.title}»`);
    estado.ir('/servicios');
  }
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <a class="volver" href="#/servicios"><Icono nombre="ChevronRight" clase="girada" /> Servicios</a>
      <h1>{esNuevo ? 'Nuevo servicio' : d.title}</h1>
    </div>
    <div class="p-acciones">
      {#if estado.pendientes[rutaCreada]}<span class="p-chip tinta"><Icono nombre="Check" /> Guardado como cambio pendiente</span>{/if}
      {#if publicadoAntes}<a class="p-btn" href={enWeb(urlWeb)} target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Ver en la web</a>{/if}
    </div>
  </header>

  {#if !esNuevo && !existe}
    <div class="p-tarjeta p-vacio"><Icono nombre="FileText" /> Este servicio no existe. <a class="p-btn" href="#/servicios">Volver</a></div>
  {:else}
    <div class="p-dos-columnas">
      <div class="principal">
        <section class="p-tarjeta">
          <div class="p-tarjeta-cab"><h2><Icono nombre="FileText" /> Textos principales</h2></div>
          <div class="p-tarjeta-cuerpo">
            <div class="p-rejilla dos">
              <label class="p-campo"><span class="p-etiqueta">Nombre corto <small>menús y tarjetas</small></span><input class="p-input" bind:value={d.title} placeholder="Lentes progresivas" /></label>
              <label class="p-campo"><span class="p-etiqueta">Titular de la página</span><input class="p-input" bind:value={d.h1} placeholder="Lentes progresivas en Barajas" /></label>
            </div>
            <label class="p-campo">
              <span class="p-etiqueta">Título para Google <small class="p-contador {d.seoTitle.length >= 30 && d.seoTitle.length <= 65 ? 'bien' : 'mejorable'}">{d.seoTitle.length}/65</small></span>
              <input class="p-input" bind:value={d.seoTitle} />
            </label>
            <label class="p-campo">
              <span class="p-etiqueta">Descripción para Google <small class="p-contador {d.description.length >= 110 && d.description.length <= 165 ? 'bien' : 'mejorable'}">{d.description.length}/160</small></span>
              <textarea class="p-textarea" bind:value={d.description}></textarea>
            </label>
            <label class="p-campo"><span class="p-etiqueta">Resumen <small>sale en la tarjeta del servicio</small></span><input class="p-input" bind:value={d.summary} /></label>
          </div>
        </section>

        <section class="p-tarjeta">
          <div class="p-tarjeta-cab">
            <h2><Icono nombre="CircleCheck" /> Puntos clave</h2>
            <button class="p-btn pequeno" type="button" onclick={() => puntos.push({ t: '' })}><Icono nombre="Plus" /> Añadir</button>
          </div>
          <div class="p-tarjeta-cuerpo">
            <ListaOrdenable bind:items={puntos}>
              {#snippet fila(p, i)}
                <div class="linea"><input class="p-input" bind:value={p.t} placeholder="Revisión gratuita y sin compromiso" aria-label="Punto clave" /><button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Quitar" onclick={() => puntos.splice(i, 1)}><Icono nombre="X" /></button></div>
              {/snippet}
            </ListaOrdenable>
          </div>
        </section>

        <section class="p-tarjeta">
          <div class="p-tarjeta-cab"><h2><Icono nombre="FilePen" /> Texto de la página</h2></div>
          <div class="p-tarjeta-cuerpo"><EditorMarkdown bind:valor={cuerpo} alto={420} /></div>
        </section>

        <section class="p-tarjeta">
          <div class="p-tarjeta-cab">
            <h2><Icono nombre="ListOrdered" /> Paso a paso</h2>
            <button class="p-btn pequeno" type="button" onclick={() => d.steps.push({ title: '', text: '' })}><Icono nombre="Plus" /> Añadir paso</button>
          </div>
          <div class="p-tarjeta-cuerpo">
            <ListaOrdenable bind:items={d.steps}>
              {#snippet fila(p, i)}
                <div class="bloque">
                  <div class="linea"><input class="p-input" bind:value={p.title} placeholder="Título del paso" aria-label="Título del paso" /><button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Quitar" onclick={() => d.steps.splice(i, 1)}><Icono nombre="X" /></button></div>
                  <textarea class="p-textarea corta" bind:value={p.text} placeholder="Qué pasa en este paso" aria-label="Texto del paso"></textarea>
                </div>
              {/snippet}
            </ListaOrdenable>
          </div>
        </section>

        <section class="p-tarjeta">
          <div class="p-tarjeta-cab">
            <h2><Icono nombre="MessageCircle" /> Preguntas frecuentes</h2>
            <button class="p-btn pequeno" type="button" onclick={() => d.faqs.push({ q: '', a: '' })}><Icono nombre="Plus" /> Añadir pregunta</button>
          </div>
          <div class="p-tarjeta-cuerpo">
            <p class="p-ayuda">Google y los asistentes de IA (ChatGPT, Gemini…) las usan para responder. Escribe preguntas reales de tus clientes.</p>
            <ListaOrdenable bind:items={d.faqs}>
              {#snippet fila(p, i)}
                <div class="bloque">
                  <div class="linea"><input class="p-input" bind:value={p.q} placeholder="¿Pregunta?" aria-label="Pregunta" /><button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Quitar" onclick={() => d.faqs.splice(i, 1)}><Icono nombre="X" /></button></div>
                  <textarea class="p-textarea corta" bind:value={p.a} placeholder="Respuesta breve y clara" aria-label="Respuesta"></textarea>
                </div>
              {/snippet}
            </ListaOrdenable>
          </div>
        </section>
      </div>

      <aside class="p-lateral-fijo lateral">
        <section class="p-tarjeta">
          <div class="p-tarjeta-cab"><h2><Icono nombre="Store" /> Ajustes</h2></div>
          <div class="p-tarjeta-cuerpo">
            <label class="p-campo"><span class="p-etiqueta">Sección</span><select class="p-select" bind:value={d.area}><option value="vista">Óptica</option><option value="oido">Audición</option></select></label>
            <div class="p-campo">
              <span class="p-etiqueta">Icono</span>
              <div class="iconos">
                {#each ICONOS_SERVICIO as ic (ic)}
                  <button type="button" class:sel={d.icon === ic} aria-label={ic} aria-pressed={d.icon === ic} onclick={() => (d.icon = ic)}><Icono nombre={ic} /></button>
                {/each}
              </div>
            </div>
            <label class="p-campo"><span class="p-etiqueta">Etiqueta <small>opcional</small></span><input class="p-input" bind:value={d.badge} placeholder="Gratis" /></label>
            <label class="p-campo">
              <span class="p-etiqueta">Opción en «Pedir cita»</span>
              <select class="p-select" bind:value={d.cita}>{#each CITAS as [v, t] (v)}<option value={v}>{t}</option>{/each}</select>
            </label>
          </div>
        </section>

        <section class="p-tarjeta">
          <div class="p-tarjeta-cab"><h2><Icono nombre="Image" /> Foto</h2></div>
          <div class="p-tarjeta-cuerpo">
            {#if foto}<img class="foto" src={foto} alt="" />{/if}
            <button class="p-btn pequeno" type="button" onclick={() => (selector = true)}><Icono nombre="Images" /> {d.image ? 'Cambiar foto' : 'Elegir foto'}</button>
            <label class="p-campo"><span class="p-etiqueta">Describe la foto</span><input class="p-input" bind:value={d.imageAlt} /></label>
          </div>
        </section>

        <section class="p-tarjeta">
          <div class="p-tarjeta-cab"><h2><Icono nombre="Wand2" /> SEO</h2><Anillo valor={analisis.puntuacion} tamano={48} etiqueta="SEO" /></div>
          <div class="p-tarjeta-cuerpo">
            <label class="p-campo"><span class="p-etiqueta">Palabra clave</span><input class="p-input" bind:value={d.keyword} placeholder="lentes progresivas" /></label>
            <ul class="checks">
              {#each analisis.comprobaciones.filter((c) => c.nivel !== 'bien') as c (c.id)}
                <li class={c.nivel}><Icono nombre={c.nivel === 'mal' ? 'CircleAlert' : 'TriangleAlert'} /><span><strong>{c.texto}</strong>{#if c.consejo}<small>{c.consejo}</small>{/if}</span></li>
              {:else}
                <li class="bien"><Icono nombre="CircleCheck" /><span><strong>Todo en orden</strong></span></li>
              {/each}
            </ul>
            <VistaGoogle titulo={d.seoTitle} descripcion={d.description} url={enWeb(urlWeb)} />
          </div>
        </section>

        {#if publicadoAntes}<button class="p-btn pequeno peligro" type="button" onclick={eliminar}><Icono nombre="Trash2" /> Borrar servicio</button>{/if}
      </aside>
    </div>
  {/if}
</div>

<SelectorImagen bind:abierto={selector} carpeta="fotos" titulo="Foto del servicio" onelegir={(r) => (d.image = claveFoto(r))} />

<style>
  .volver { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; font-weight: 700; color: var(--p-texto-2); text-decoration: none; }
  .volver :global(.girada) { transform: rotate(180deg); }
  .principal, .lateral { display: grid; gap: 16px; }
  .linea { display: flex; gap: 6px; align-items: center; }
  .bloque { display: grid; gap: 6px; }
  .corta { min-height: 64px; }
  .iconos { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
  .iconos button { display: grid; place-items: center; aspect-ratio: 1; border: 1px solid var(--p-borde); border-radius: 8px; background: var(--p-superficie); cursor: pointer; color: var(--p-texto-2); }
  .iconos button.sel { background: var(--p-tinta); color: var(--p-luz); border-color: var(--p-tinta); }
  .foto { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; }
  .checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .checks li { display: flex; gap: 8px; align-items: flex-start; font-size: 0.88rem; }
  .checks li span { display: grid; }
  .checks small { color: var(--p-texto-2); }
  .checks li.bien :global(.p-icono) { color: var(--p-ok); }
  .checks li.mejorable :global(.p-icono) { color: #c98a14; }
  .checks li.mal :global(.p-icono) { color: var(--p-error); }
</style>
