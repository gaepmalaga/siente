<script lang="ts">
  import { untrack, tick } from 'svelte';
  import Icono from '../componentes/Icono.svelte';
  import Interruptor from '../componentes/Interruptor.svelte';
  import EditorMarkdown from '../componentes/EditorMarkdown.svelte';
  import SelectorImagen from '../componentes/SelectorImagen.svelte';
  import PanelSeo from '../componentes/PanelSeo.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { leerMd, escribirMd } from '../lib/frontmatter';
  import { analizar, proponerTitulo, sugerirClaves, type Arreglo } from '../lib/seo';
  import { insertarBloque } from '../lib/bloques';
  import { slug as aSlug } from '../lib/texto';
  import { rutaPublica } from '../lib/medios';
  import { enWeb } from '../lib/paginas';
  import { ahoraEnMadrid, fechaLarga, partesFecha, valorFecha, momentoPublicacion } from '../../lib/horario';

  let props: { slug: string } = $props();
  // El panel recrea el editor al cambiar de artículo, así que el slug no cambia en vida del componente.
  const slug = untrack(() => props.slug);

  type Datos = {
    title: string;
    seoTitle?: string;
    description: string;
    date: string;
    category: 'vista' | 'oido' | 'general';
    draft: boolean;
    cover?: string;
    coverAlt?: string;
    keyword?: string;
  };

  const hoy = ahoraEnMadrid().iso;
  const esNuevo = slug === 'nuevo';
  const rutaInicial = esNuevo ? '' : `${RUTAS.blog}${slug}.md`;
  const existe = !esNuevo && estado.texto(rutaInicial) !== undefined;
  const publicadoAntes = !esNuevo && rutaInicial in estado.originales;

  const PLANTILLA = 'Empieza con una frase que responda a la pregunta del título.\n\n## Primer subtítulo\n\nDesarrolla la idea con ejemplos del día a día.\n\n## Segundo subtítulo\n\nConsejos prácticos.\n\n[Pide tu cita en un minuto](/pedir-cita/).';
  const inicial = existe ? leerMd<Datos>(estado.texto(rutaInicial)!) : { datos: { title: '', description: '', date: hoy, category: 'vista', draft: true } as Datos, cuerpo: PLANTILLA };
  // La fecha se edita como día + hora (opcional) de Madrid.
  const fechaInicial = partesFecha(String(inicial.datos.date ?? hoy));

  let d = $state<Datos>({ ...inicial.datos, category: inicial.datos.category ?? 'general', draft: inicial.datos.draft ?? false, date: fechaInicial.fecha });
  let hora = $state(fechaInicial.hora);
  let cuerpo = $state(inicial.cuerpo);
  const aArchivo = (datos: Datos, h: string) => ({ ...datos, date: valorFecha(datos.date, h) }) as unknown as Record<string, unknown>;
  // Texto de partida ya normalizado: si no cambia, abrir el artículo no cuenta como cambio.
  const textoInicial = existe ? untrack(() => escribirMd(aArchivo($state.snapshot(d) as Datos, hora), inicial.cuerpo)) : '';
  let slugNuevo = $state('');
  let selector = $state(false);
  let rutaCreada = $state(rutaInicial);
  let consultasGoogle = $state<string[]>([]);
  let verTituloSeo = $state(!!inicial.datos.seoTitle);

  const slugFinal = $derived(esNuevo ? slugNuevo || aSlug(d.title) : slug);
  const ruta = $derived(slugFinal ? `${RUTAS.blog}${slugFinal}.md` : '');
  const ocupado = $derived(esNuevo && !!slugFinal && ruta !== rutaCreada && estado.texto(ruta) !== undefined);
  const tituloAuto = $derived(`${d.title} | Blog Siente`);
  const tituloGoogle = $derived(d.seoTitle?.trim() || tituloAuto);
  const analisis = $derived(
    analizar({
      tipo: 'articulo',
      titulo: d.title,
      tituloSeo: tituloGoogle,
      descripcion: d.description,
      cuerpo,
      slug: slugFinal,
      palabraClave: d.keyword,
      imagen: d.cover,
      textoImagen: d.coverAlt,
    }),
  );
  const sugerencias = $derived(d.keyword ? [] : sugerirClaves({ titulo: d.title, cuerpo, categoria: d.category, consultas: consultasGoogle }));
  const momento = $derived(momentoPublicacion(valorFecha(d.date, hora)));
  const programado = $derived(!d.draft && momento > Date.now());
  const portada = $derived(d.cover ? estado.medios.find((m) => m.ruta === `public${d.cover}`)?.url : undefined);

  // Guardado automático como cambio pendiente.
  $effect(() => {
    const datos = $state.snapshot(d) as Datos;
    if (!datos.seoTitle?.trim()) delete datos.seoTitle;
    const texto = escribirMd(aArchivo(datos, hora), cuerpo);
    const r = ruta;
    untrack(() => {
      if (!r || !datos.title.trim() || ocupado || texto === textoInicial) return;
      // Si el título (y con él la dirección) de un artículo nuevo cambia, se mueve el archivo.
      if (esNuevo && rutaCreada && rutaCreada !== r) estado.descartar(rutaCreada);
      rutaCreada = r;
      estado.fijarTexto(r, texto, `Artículo «${datos.title}»`);
    });
  });

  async function enfocar(id: string) {
    await tick();
    const el = document.getElementById(id) as HTMLInputElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
    el?.select?.();
  }

  function arreglar(a: Arreglo) {
    if (a.tipo === 'imagen') return (selector = true);
    if (a.tipo === 'insertar') {
      cuerpo = insertarBloque(cuerpo, a.bloque, d.category);
      estado.aviso(a.bloque === 'preguntas' || a.bloque === 'subtitulo' ? 'Añadido al texto. Completa lo marcado con «[completa aquí]».' : 'Añadido al texto.', 'ok');
      return;
    }
    if (a.campo === 'tituloSeo') {
      verTituloSeo = true;
      if (!d.seoTitle) d.seoTitle = proponerTitulo(d.title);
      return enfocar('campo-titulo-seo');
    }
    if (a.campo === 'textoImagen' && !d.coverAlt) d.coverAlt = d.title;
    enfocar({ descripcion: 'campo-descripcion', clave: 'seo-clave', textoImagen: 'campo-alt' }[a.campo]);
  }

  function eliminar() {
    if (!confirm(publicadoAntes ? '¿Borrar este artículo de la web? Lo puedes recuperar desde el historial.' : '¿Descartar este artículo?')) return;
    if (rutaCreada) estado.borrar(rutaCreada, `Borrar artículo «${d.title}»`);
    estado.ir('/blog');
  }

  function duplicar() {
    const nuevoSlug = `${slugFinal}-copia`;
    estado.fijarTexto(`${RUTAS.blog}${nuevoSlug}.md`, escribirMd({ ...aArchivo($state.snapshot(d) as Datos, hora), title: `${d.title} (copia)`, draft: true }, cuerpo), `Artículo «${d.title} (copia)»`);
    estado.ir(`/blog/${nuevoSlug}`);
  }

  const horaTexto = (h: string) => h.replace(/^0/, '');
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <a class="volver" href="#/blog"><Icono nombre="ChevronRight" clase="girada" /> Blog</a>
      <h1>{esNuevo ? 'Nuevo artículo' : 'Editar artículo'}</h1>
    </div>
    <div class="p-acciones">
      {#if estado.pendientes[rutaCreada]}<span class="p-chip tinta"><Icono nombre="Check" /> Guardado como cambio pendiente</span>{/if}
      {#if estado.pendientes[rutaCreada]}
        <button class="p-btn" type="button" onclick={() => estado.vistaPrevia(`/blog/${slugFinal}/`)} disabled={estado.previa?.estado === 'preparando'}>
          <Icono nombre="Monitor" /> Vista previa
        </button>
      {:else if publicadoAntes}
        <a class="p-btn" href={enWeb(`/blog/${slug}/`)} target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Ver en la web</a>
      {/if}
      <button class="p-btn primario" type="button" onclick={() => (estado.bandejaAbierta = true)} disabled={!estado.numPendientes}><Icono nombre="CloudUpload" /> Publicar</button>
    </div>
  </header>

  {#if !esNuevo && !existe}
    <div class="p-tarjeta p-vacio"><Icono nombre="FileText" /> Este artículo no existe. <a class="p-btn" href="#/blog">Volver al blog</a></div>
  {:else}
    <div class="p-dos-columnas">
      <div class="principal">
        <input class="p-input grande titulo" bind:value={d.title} placeholder="Título del artículo" aria-label="Título" />
        <div class="direccion">
          <span class="p-apagado">Dirección:</span>
          {#if esNuevo}
            <span class="p-apagado">/blog/</span>
            <input class="p-input slug" value={slugFinal} oninput={(e) => (slugNuevo = aSlug((e.target as HTMLInputElement).value))} aria-label="Dirección" />
            <span class="p-apagado">/</span>
            {#if ocupado}<span class="p-error-campo">Ya existe un artículo con esta dirección</span>{/if}
          {:else}
            <code>/blog/{slug}/</code>
            <span class="p-ayuda">No se cambia en artículos publicados: perderías su posicionamiento.</span>
          {/if}
        </div>
        {#if verTituloSeo}
          <label class="p-campo" for="campo-titulo-seo">
            <span class="p-etiqueta">
              Título para Google <small>si lo dejas vacío se usa el del artículo</small>
              <small class="p-contador {tituloGoogle.length >= 30 && tituloGoogle.length <= 65 ? 'bien' : 'mejorable'}">{tituloGoogle.length}/60</small>
            </span>
            <input id="campo-titulo-seo" class="p-input" bind:value={d.seoTitle} placeholder={tituloAuto} />
          </label>
        {:else}
          <button class="enlace-suave" type="button" onclick={() => { verTituloSeo = true; enfocar('campo-titulo-seo'); }}>
            <Icono nombre="Plus" /> Usar un título distinto en Google <span class="p-apagado">({tituloAuto.length} caracteres ahora)</span>
          </button>
        {/if}
        <label class="p-campo" for="campo-descripcion">
          <span class="p-etiqueta">
            Descripción para Google y redes
            <small class="p-contador {d.description.length >= 110 && d.description.length <= 165 ? 'bien' : d.description.length ? 'mejorable' : 'mal'}">{d.description.length}/160</small>
          </span>
          <textarea id="campo-descripcion" class="p-textarea desc" bind:value={d.description} placeholder="Resume en una o dos frases lo que encontrará el lector"></textarea>
        </label>
        <EditorMarkdown bind:valor={cuerpo} alto={560} />
      </div>

      <aside class="lateral">
        <section class="p-tarjeta">
          <div class="p-tarjeta-cab"><h2><Icono nombre="CalendarDays" /> Publicación</h2></div>
          <div class="p-tarjeta-cuerpo">
            <Interruptor bind:activo={d.draft} etiqueta="Borrador" ayuda="Mientras sea borrador no aparece en la web." />
            <div class="fecha-hora">
              <label class="p-campo"><span class="p-etiqueta">Fecha</span><input class="p-input" type="date" bind:value={d.date} /></label>
              <label class="p-campo"><span class="p-etiqueta">Hora <small>opcional</small></span><input class="p-input" type="time" bind:value={hora} step="300" /></label>
            </div>
            {#if d.draft}<p class="estado-pub aviso">Borrador: no se publicará hasta que lo desactives.</p>
            {:else if programado}
              <p class="estado-pub info">
                <Icono nombre="AlarmClock" />
                <span>Programado: aparecerá solo el {fechaLarga(d.date)}{hora ? ` a las ${horaTexto(hora)}` : ' a primera hora'}. Pulsa Publicar para dejarlo programado.</span>
              </p>
            {:else}<p class="estado-pub ok"><Icono nombre="CircleCheck" /> Se publica en cuanto pulses Publicar.</p>{/if}
            <label class="p-campo">
              <span class="p-etiqueta">Categoría</span>
              <select class="p-select" bind:value={d.category}><option value="vista">Vista</option><option value="oido">Oído</option><option value="general">Consejos</option></select>
            </label>
          </div>
        </section>

        <section class="p-tarjeta">
          <div class="p-tarjeta-cab"><h2><Icono nombre="Image" /> Portada</h2></div>
          <div class="p-tarjeta-cuerpo">
            {#if portada}<img class="portada" src={portada} alt="" />{/if}
            <div class="p-acciones">
              <button class="p-btn pequeno" type="button" onclick={() => (selector = true)}><Icono nombre="Images" /> {d.cover ? 'Cambiar' : 'Elegir foto'}</button>
              {#if d.cover}<button class="p-btn pequeno fantasma" type="button" onclick={() => { d.cover = undefined; d.coverAlt = undefined; }}>Quitar</button>{/if}
            </div>
            {#if d.cover}
              <label class="p-campo" for="campo-alt"><span class="p-etiqueta">Describe la foto</span><input id="campo-alt" class="p-input" bind:value={d.coverAlt} placeholder="Niño en clase mirando la pizarra" /></label>
            {/if}
          </div>
        </section>

        <PanelSeo
          {analisis}
          bind:clave={d.keyword}
          {sugerencias}
          onarreglo={arreglar}
          vistaGoogle={{ titulo: tituloGoogle, descripcion: d.description, url: enWeb(`/blog/${slugFinal || 'nuevo'}/`) }}
          ruta={`/blog/${slug}/`}
          publicada={publicadoAntes}
          onconsultas={(c) => (consultasGoogle = c)}
        />

        {#if !esNuevo || rutaCreada}
          <div class="p-acciones extra">
            <button class="p-btn pequeno" type="button" onclick={duplicar} disabled={!d.title}><Icono nombre="Copy" /> Duplicar</button>
            <button class="p-btn pequeno peligro" type="button" onclick={eliminar}><Icono nombre="Trash2" /> {publicadoAntes ? 'Borrar artículo' : 'Descartar'}</button>
          </div>
        {/if}
      </aside>
    </div>
  {/if}
</div>

<SelectorImagen bind:abierto={selector} titulo="Foto de portada" onelegir={(r) => (d.cover = rutaPublica(r))} />

<style>
  .volver { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; font-weight: 700; color: var(--p-texto-2); text-decoration: none; }
  .volver :global(.girada) { transform: rotate(180deg); }
  .principal { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .titulo { font-size: 1.7rem; min-height: 60px; }
  .direccion { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.9rem; }
  .slug { width: auto; flex: 1; min-width: 200px; min-height: 34px; padding: 4px 8px; font-family: var(--p-mono); font-size: 0.88rem; }
  code { font-family: var(--p-mono); }
  .enlace-suave { justify-self: start; display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; font-weight: 700; font-size: 0.9rem; color: var(--p-texto-2); cursor: pointer; }
  .enlace-suave:hover { color: var(--p-texto); }
  .desc { min-height: 76px; }
  .lateral { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .fecha-hora { display: grid; grid-template-columns: minmax(0, 1fr) 120px; gap: 10px; }
  .estado-pub { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 10px; font-weight: 700; font-size: 0.9rem; }
  .estado-pub.ok { background: var(--p-ok-fondo); color: var(--p-ok); }
  .estado-pub.info { background: var(--p-info-fondo); color: var(--p-info); }
  .estado-pub.aviso { background: var(--p-aviso-fondo); color: var(--p-aviso); }
  .estado-pub :global(.p-icono) { margin-top: 2px; }
  .portada { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; }
  .extra { justify-content: space-between; }
</style>
