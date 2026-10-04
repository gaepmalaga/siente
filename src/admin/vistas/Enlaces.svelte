<script lang="ts">
  import { untrack } from 'svelte';
  import QRCode from 'qrcode';
  import Icono from '../componentes/Icono.svelte';
  import Gafas from '../componentes/Gafas.svelte';
  import Interruptor from '../componentes/Interruptor.svelte';
  import ListaOrdenable from '../componentes/ListaOrdenable.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { clonar } from '../lib/texto';
  import { paginasInternas } from '../lib/paginas';
  import { TIPOS_ENLACE, type DatosEnlaces, type DatosNegocio } from '../../lib/esquemas';
  import { porDia, estadoApertura } from '../../lib/horario';
  import type { NombreIcono } from '../lib/iconos';

  let d = $state(clonar(estado.json<DatosEnlaces>(RUTAS.enlaces)));
  const negocio = estado.json<DatosNegocio>(RUTAS.negocio);
  const paginas = paginasInternas();
  const urlBio = `${estado.config.sitio}enlaces/`;
  const ahora = estadoApertura(porDia(negocio.horario), negocio.cierres);
  let abierto = $state<number | null>(null);
  let qr = $state('');

  $effect(() => {
    const nuevo = $state.snapshot(d);
    untrack(() => estado.fijarJson(RUTAS.enlaces, nuevo, 'Página de enlaces de Instagram'));
  });
  $effect(() => {
    QRCode.toString(urlBio, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then((s: string) => (qr = s));
  });

  const TIPOS: Record<(typeof TIPOS_ENLACE)[number], { nombre: string; icono: NombreIcono }> = {
    whatsapp: { nombre: 'Abrir WhatsApp', icono: 'MessageCircle' },
    cita: { nombre: 'Ir a «Pedir cita»', icono: 'CalendarDays' },
    llamar: { nombre: 'Llamar', icono: 'Phone' },
    mapa: { nombre: 'Cómo llegar', icono: 'MapPin' },
    resenas: { nombre: 'Reseñas de Google', icono: 'Star' },
    instagram: { nombre: 'Instagram', icono: 'Globe' },
    facebook: { nombre: 'Facebook', icono: 'Globe' },
    contacto: { nombre: 'Guardar en contactos', icono: 'Smartphone' },
    web: { nombre: 'Página o enlace', icono: 'Link2' },
  };
  const principales = $derived(d.enlaces.filter((e) => e.visible && !e.secundario));
  const secundarios = $derived(d.enlaces.filter((e) => e.visible && e.secundario));

  async function copiar() {
    await navigator.clipboard.writeText(urlBio);
    estado.aviso('Enlace copiado. Pégalo en la bio de Instagram.', 'ok');
  }
  function descargarQr() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([qr], { type: 'image/svg+xml' }));
    a.download = 'qr-enlaces-siente.svg';
    a.click();
  }
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Enlaces de Instagram</h1>
      <p>La página que se abre desde la bio de Instagram. Deja 4 o 5 botones grandes para lo importante y el resto como enlaces pequeños.</p>
    </div>
    <div class="p-acciones">
      <button class="p-btn" type="button" onclick={copiar}><Icono nombre="Copy" /> Copiar enlace</button>
      <button class="p-btn primario" type="button" onclick={() => { d.enlaces.push({ texto: 'Nuevo botón', detalle: '', tipo: 'web', url: '/', destacado: false, secundario: false, visible: true }); abierto = d.enlaces.length - 1; }}><Icono nombre="Plus" /> Añadir botón</button>
    </div>
  </header>

  <div class="p-dos-columnas">
    <div class="editor">
      <section class="p-tarjeta">
        <div class="p-tarjeta-cuerpo p-rejilla dos">
          <label class="p-campo"><span class="p-etiqueta">Título</span><input class="p-input" bind:value={d.titulo} /></label>
          <label class="p-campo"><span class="p-etiqueta">Subtítulo</span><input class="p-input" bind:value={d.subtitulo} /></label>
        </div>
      </section>

      <ListaOrdenable bind:items={d.enlaces}>
        {#snippet fila(e, i)}
          <div class="boton-ed" class:oculto={!e.visible}>
            <button class="resumen" type="button" onclick={() => (abierto = abierto === i ? null : i)} aria-expanded={abierto === i}>
              <span class="ic" class:wa={e.tipo === 'whatsapp' && e.destacado}><Icono nombre={TIPOS[e.tipo].icono} /></span>
              <span class="txt"><strong>{e.texto || 'Sin texto'}</strong><small class="p-apagado">{TIPOS[e.tipo].nombre}{e.tipo === 'web' ? ` · ${e.url}` : ''}</small></span>
              {#if !e.visible}<span class="p-chip">Oculto</span>{:else if e.secundario}<span class="p-chip">Pequeño</span>{:else if e.destacado}<span class="p-chip tinta">Destacado</span>{/if}
              <Icono nombre={abierto === i ? 'ChevronUp' : 'ChevronDown'} />
            </button>
            {#if abierto === i}
              <div class="campos">
                <div class="p-rejilla dos">
                  <label class="p-campo"><span class="p-etiqueta">Texto del botón</span><input class="p-input" bind:value={e.texto} /></label>
                  <label class="p-campo"><span class="p-etiqueta">Texto pequeño</span><input class="p-input" bind:value={e.detalle} /></label>
                  <label class="p-campo">
                    <span class="p-etiqueta">Qué hace</span>
                    <select class="p-select" bind:value={e.tipo}>{#each TIPOS_ENLACE as t (t)}<option value={t}>{TIPOS[t].nombre}</option>{/each}</select>
                  </label>
                  {#if e.tipo === 'web'}
                    <label class="p-campo">
                      <span class="p-etiqueta">Enlace</span>
                      <input class="p-input" list="paginas-web" bind:value={e.url} placeholder="/plan-veo/ o https://…" />
                    </label>
                  {/if}
                </div>
                <div class="toggles">
                  <Interruptor bind:activo={e.visible} etiqueta="Visible" compacto />
                  <Interruptor bind:activo={e.destacado} etiqueta="Destacado" compacto />
                  <Interruptor bind:activo={e.secundario} etiqueta="Enlace pequeño" compacto />
                </div>
                <button class="p-btn pequeno peligro" type="button" onclick={() => { d.enlaces.splice(i, 1); abierto = null; }}><Icono nombre="Trash2" /> Quitar botón</button>
              </div>
            {/if}
          </div>
        {/snippet}
      </ListaOrdenable>
      <datalist id="paginas-web">{#each paginas as p (p.ruta)}<option value={p.ruta}>{p.titulo}</option>{/each}</datalist>
      {#if principales.length > 5}<p class="aviso-n"><Icono nombre="Lightbulb" /> Tienes {principales.length} botones grandes. Con 4 o 5 la gente decide antes.</p>{/if}
    </div>

    <aside class="p-lateral-fijo lateral">
      <div class="movil" aria-label="Vista previa en el móvil">
        <div class="pantalla">
          <div class="cab">
            <span class="luz"><Gafas clase="g" /><span class="nombre">SIENTE</span></span>
            <strong>{d.titulo}</strong>
            <small>{d.subtitulo}</small>
            <span class="estado" class:abierto={ahora.abierto}><span class="p-punto"></span>{ahora.texto}</span>
          </div>
          {#each principales as e (e)}
            <div class="b" class:dest={e.destacado} class:wa={e.tipo === 'whatsapp' && e.destacado}>
              <span class="bi"><Icono nombre={TIPOS[e.tipo].icono} /></span>
              <span class="bt"><strong>{e.texto}</strong>{#if e.detalle}<small>{e.detalle}</small>{/if}</span>
            </div>
          {/each}
          {#if secundarios.length}
            <div class="sec">{#each secundarios as e (e)}<span>{e.texto}</span>{/each}</div>
          {/if}
        </div>
      </div>
      <section class="p-tarjeta qr">
        <div class="p-tarjeta-cuerpo">
          <div class="qr-img">{@html qr}</div>
          <code>{urlBio}</code>
          <div class="p-acciones">
            <button class="p-btn pequeno" type="button" onclick={descargarQr}><Icono nombre="QrCode" /> Descargar QR</button>
            <a class="p-btn pequeno fantasma" href={urlBio} target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Abrir</a>
          </div>
        </div>
      </section>
    </aside>
  </div>
</div>

<style>
  .editor { display: grid; gap: 16px; }
  .boton-ed { display: grid; gap: 12px; }
  .boton-ed.oculto .resumen { opacity: 0.55; }
  .resumen { display: flex; align-items: center; gap: 12px; width: 100%; padding: 0; border: 0; background: none; text-align: left; cursor: pointer; }
  .ic { display: grid; place-items: center; width: 38px; height: 38px; flex: none; border-radius: 10px; background: var(--p-tinta); color: var(--p-luz); }
  .ic.wa { background: var(--p-wa); color: #fff; }
  .txt { flex: 1; display: grid; min-width: 0; line-height: 1.25; }
  .txt small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .campos { display: grid; gap: 14px; padding-top: 12px; border-top: 1px solid var(--p-borde); }
  .toggles { display: flex; flex-wrap: wrap; gap: 8px; }
  .campos > .p-btn { justify-self: start; }
  .aviso-n { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 10px; background: #fdf8ee; font-size: 0.9rem; }
  .lateral { display: grid; gap: 16px; justify-items: center; }
  .movil { width: 300px; padding: 10px; border-radius: 40px; background: #111; box-shadow: var(--p-sombra-2); }
  .pantalla {
    display: grid;
    gap: 8px;
    height: 560px;
    overflow: auto;
    padding: 18px 12px;
    border-radius: 30px;
    background-color: #a8743f;
    background-image:
      radial-gradient(120% 70% at 50% 0%, transparent 30%, rgb(30 16 6 / 0.45)),
      repeating-linear-gradient(90deg, #4a2e17 0 2px, #94602f 2px 4px, #b98450 4px 13px, #c48f5a 13px 17px, #aa7542 17px 21px, #6a4220 21px 23px);
    scrollbar-width: none;
  }
  .cab { display: grid; justify-items: center; gap: 4px; text-align: center; color: #fff8ec; margin-bottom: 4px; }
  .luz { display: grid; justify-items: center; width: 120px; color: #f6e2c0; }
  .luz :global(.g) { width: 100%; filter: drop-shadow(0 0 4px rgb(255 210 150 / 0.9)) drop-shadow(0 0 14px rgb(255 190 110 / 0.6)); }
  .nombre { font-family: var(--p-mono); font-weight: 700; font-size: 1.5rem; letter-spacing: 0.05em; text-shadow: 0 0 4px rgb(255 222 165 / 0.9), 0 0 14px rgb(255 190 110 / 0.6); }
  .cab strong { font-size: 0.95rem; text-shadow: 0 1px 6px rgb(0 0 0 / 0.4); }
  .cab small { font-size: 0.72rem; opacity: 0.9; }
  .estado { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; padding: 4px 10px; border-radius: 999px; background: #f8f4ee; color: var(--p-error); font-size: 0.7rem; font-weight: 700; }
  .estado.abierto { color: var(--p-ok); }
  .b { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 14px; background: #f8f4ee; }
  .b.dest { background: var(--p-tinta); color: #fff; }
  .b.wa { background: var(--p-wa); }
  .bi { display: grid; place-items: center; width: 32px; height: 32px; flex: none; border-radius: 9px; background: var(--p-tinta); color: var(--p-luz); }
  .b.dest .bi { background: var(--p-luz); color: var(--p-tinta); }
  .b.wa .bi { background: #fff; color: var(--p-wa); }
  .bi :global(.p-icono) { width: 16px; height: 16px; }
  .bt { display: grid; line-height: 1.2; }
  .bt strong { font-size: 0.82rem; }
  .bt small { font-size: 0.68rem; opacity: 0.75; }
  .sec { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .sec span { padding: 8px; border-radius: 10px; background: rgb(23 20 17 / 0.78); color: #fff; font-size: 0.7rem; font-weight: 700; text-align: center; }
  .qr { width: 100%; }
  .qr .p-tarjeta-cuerpo { justify-items: center; text-align: center; }
  .qr-img { width: 150px; }
  .qr code { font-size: 0.75rem; overflow-wrap: anywhere; color: var(--p-texto-2); }
</style>
