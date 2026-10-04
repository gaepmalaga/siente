<script lang="ts">
  import './panel.css';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { estado } from './lib/estado.svelte';
  import { SECCIONES } from './lib/secciones';
  import type { ConfigPanel } from './lib/tipos';
  import Icono from './componentes/Icono.svelte';
  import Gafas from './componentes/Gafas.svelte';
  import Avisos from './componentes/Avisos.svelte';
  import Bandeja from './componentes/Bandeja.svelte';
  import Paleta from './componentes/Paleta.svelte';
  import EstadoPublicacion from './componentes/EstadoPublicacion.svelte';
  import Acceso from './vistas/Acceso.svelte';
  import Resumen from './vistas/Resumen.svelte';
  import Horario from './vistas/Horario.svelte';
  import Centro from './vistas/Centro.svelte';
  import Portada from './vistas/Portada.svelte';
  import Servicios from './vistas/Servicios.svelte';
  import EditorServicio from './vistas/EditorServicio.svelte';
  import Blog from './vistas/Blog.svelte';
  import EditorArticulo from './vistas/EditorArticulo.svelte';
  import Resenas from './vistas/Resenas.svelte';
  import Enlaces from './vistas/Enlaces.svelte';
  import Fotos from './vistas/Fotos.svelte';
  import Historial from './vistas/Historial.svelte';
  import Accesos from './vistas/Accesos.svelte';

  let { config }: { config: ConfigPanel } = $props();
  onMount(() => estado.iniciar(config));

  const partes = $derived(estado.ruta.split('#')[0].split('/').filter(Boolean));
  const seccion = $derived(`/${partes[0] ?? ''}`);
  const sub = $derived(partes[1] ? decodeURIComponent(partes[1]) : '');
  const actual = $derived(SECCIONES.find((s) => s.ruta === seccion) ?? SECCIONES[0]);
  const grupos = $derived([...new Set(SECCIONES.map((s) => s.grupo))]);

  // Anclas dentro de una vista: #/horario#cierres
  $effect(() => {
    const ancla = estado.ruta.split('#')[1];
    if (ancla && estado.fase === 'listo') setTimeout(() => document.getElementById(ancla)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  });

  const esMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
</script>

<svelte:head><title>{estado.fase === 'listo' ? `${actual.titulo} · Panel Siente` : 'Panel · Siente'}</title></svelte:head>

{#if estado.fase !== 'listo'}
  <Acceso />
{:else}
  <div class="app">
    <aside class="lateral" class:abierto={estado.menuAbierto} aria-label="Menú del panel">
      <a class="marca" href="#/">
        <Gafas clase="gafas" />
        <span><strong>SIENTE</strong><small>Panel de la web</small></span>
      </a>
      <nav>
        {#each grupos as g (g)}
          {#if g}<p class="grupo">{g}</p>{/if}
          {#each SECCIONES.filter((s) => s.grupo === g) as s (s.ruta)}
            <a href={`#${s.ruta}`} class:activo={seccion === s.ruta} aria-current={seccion === s.ruta ? 'page' : undefined}>
              <Icono nombre={s.icono} />
              <span>{s.titulo}</span>
            </a>
          {/each}
        {/each}
      </nav>
      <div class="usuario">
        {#if estado.usuario?.avatar}<img src={estado.usuario.avatar} alt="" />{:else}<span class="avatar"><Icono nombre="Users" /></span>{/if}
        <span class="quien">
          <strong>{estado.usuario?.nombre}</strong>
          <small>{estado.modo === 'demo' ? 'Sin guardar nada' : `@${estado.usuario?.login}`}</small>
        </span>
        <button class="p-btn fantasma solo-icono pequeno" type="button" title="Salir" aria-label="Salir" onclick={() => (estado.numPendientes && !confirm('Tienes cambios sin publicar. Se guardan en este navegador. ¿Salir igualmente?') ? null : estado.salir())}>
          <Icono nombre="LogOut" />
        </button>
      </div>
    </aside>
    {#if estado.menuAbierto}<div class="velo" onclick={() => (estado.menuAbierto = false)} aria-hidden="true"></div>{/if}

    <div class="principal">
      {#if estado.modo === 'demo'}
        <div class="demo"><Icono nombre="Sparkles" /> Modo demostración: toca lo que quieras, nada se publica de verdad.</div>
      {/if}
      <header class="barra">
        <button class="p-btn fantasma solo-icono menu" type="button" aria-label="Abrir menú" onclick={() => (estado.menuAbierto = true)}><Icono nombre="Menu" /></button>
        <div class="titulo">
          <span class="seccion"><Icono nombre={actual.icono} /> <span class="nombre-seccion">{actual.titulo}</span></span>
        </div>
        <button class="buscar" type="button" onclick={() => (estado.paletaAbierta = true)}>
          <Icono nombre="Search" /> <span>Buscar…</span> <span class="p-kbd">{esMac ? '⌘' : 'Ctrl'} K</span>
        </button>
        <EstadoPublicacion />
        <button class="p-btn cambios" class:hay={estado.numPendientes > 0} type="button" onclick={() => (estado.bandejaAbierta = true)}>
          <Icono nombre="CloudUpload" />
          <span class="texto">{estado.numPendientes ? 'Publicar' : 'Todo publicado'}</span>
          {#if estado.numPendientes}<span class="cuenta">{estado.numPendientes}</span>{/if}
        </button>
        <a class="p-btn fantasma solo-icono" href={estado.config.sitio} target="_blank" rel="noopener" title="Ver la web" aria-label="Ver la web"><Icono nombre="Globe" /></a>
      </header>

      <main class="p-contenido">
        {#key seccion + sub + estado.revision}
          <div in:fly={{ y: 8, duration: 180 }}>
            {#if seccion === '/'}<Resumen />
            {:else if seccion === '/horario'}<Horario />
            {:else if seccion === '/centro'}<Centro />
            {:else if seccion === '/portada'}<Portada />
            {:else if seccion === '/servicios' && sub}<EditorServicio slug={sub} />
            {:else if seccion === '/servicios'}<Servicios />
            {:else if seccion === '/blog' && sub}<EditorArticulo slug={sub} />
            {:else if seccion === '/blog'}<Blog />
            {:else if seccion === '/resenas'}<Resenas />
            {:else if seccion === '/enlaces'}<Enlaces />
            {:else if seccion === '/fotos'}<Fotos />
            {:else if seccion === '/historial'}<Historial sha={sub} />
            {:else if seccion === '/accesos'}<Accesos />
            {:else}<Resumen />{/if}
          </div>
        {/key}
      </main>

      {#if estado.numPendientes}
        <div class="movil-publicar" transition:fly={{ y: 80, duration: 200 }}>
          <span><strong>{estado.numPendientes === 1 ? '1 cambio' : `${estado.numPendientes} cambios`}</strong> sin publicar</span>
          <button class="p-btn roble" type="button" onclick={() => (estado.bandejaAbierta = true)}><Icono nombre="CloudUpload" /> Revisar y publicar</button>
        </div>
      {/if}
    </div>
  </div>
  <Bandeja />
  <Paleta />
{/if}
<Avisos />

<style>
  .app { display: grid; min-height: 100dvh; }
  @media (min-width: 1000px) { .app { grid-template-columns: 252px minmax(0, 1fr); } }

  .lateral {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    width: 268px;
    background: var(--p-tinta);
    color: #efe7da;
    transform: translateX(-100%);
    transition: transform 0.22s cubic-bezier(0.3, 0.7, 0.3, 1);
  }
  .lateral.abierto { transform: none; box-shadow: var(--p-sombra-2); }
  @media (min-width: 1000px) {
    .lateral { position: sticky; top: 0; height: 100dvh; width: auto; transform: none; }
  }
  .velo { position: fixed; inset: 0; z-index: 49; background: rgb(23 20 17 / 0.4); }
  .marca {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 18px 18px;
    text-decoration: none;
    color: #f6e2c0;
    background:
      radial-gradient(120% 120% at 20% 0%, rgb(255 208 140 / 0.18), transparent 60%),
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.025) 0 2px, transparent 2px 12px);
    border-bottom: 1px solid rgb(255 255 255 / 0.08);
  }
  .marca :global(.gafas) { width: 62px; filter: drop-shadow(0 0 6px rgb(255 200 120 / 0.55)); }
  .marca span { display: grid; line-height: 1.1; }
  .marca strong { font-family: var(--p-mono); font-size: 1.3rem; letter-spacing: 0.05em; }
  .marca small { color: rgb(239 231 218 / 0.6); font-size: 0.78rem; margin-top: 3px; }
  nav { flex: 1; overflow: auto; padding: 10px 10px 16px; display: grid; gap: 2px; align-content: start; }
  .grupo { margin: 14px 10px 6px; font-family: var(--p-mono); font-weight: 700; font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(234 214 188 / 0.55); }
  nav a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    border-radius: 10px;
    color: rgb(239 231 218 / 0.82);
    text-decoration: none;
    font-weight: 700;
    font-size: 0.95rem;
    transition: background 0.12s, color 0.12s;
  }
  nav a:hover { background: rgb(255 255 255 / 0.06); color: #fff; }
  nav a.activo { background: rgb(255 208 140 / 0.14); color: var(--p-luz); box-shadow: inset 3px 0 0 var(--p-luz); }
  .usuario { display: flex; align-items: center; gap: 10px; padding: 14px 14px 18px; border-top: 1px solid rgb(255 255 255 / 0.08); }
  .usuario img, .avatar { width: 36px; height: 36px; border-radius: 50%; flex: none; }
  .avatar { display: grid; place-items: center; background: rgb(255 255 255 / 0.1); }
  .quien { flex: 1; display: grid; min-width: 0; line-height: 1.25; }
  .quien strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.92rem; }
  .quien small { color: rgb(239 231 218 / 0.55); font-size: 0.78rem; }
  .usuario .p-btn { color: rgb(239 231 218 / 0.75); }
  .usuario .p-btn:hover { background: rgb(255 255 255 / 0.08); }

  .principal { min-width: 0; display: flex; flex-direction: column; }
  .demo { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 16px; background: var(--p-luz); color: var(--p-tinta); font-weight: 700; font-size: 0.9rem; text-align: center; }
  .barra {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 64px;
    padding: 10px 16px;
    background: rgb(243 240 235 / 0.88);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--p-borde);
  }
  .menu { display: inline-flex; }
  @media (min-width: 1000px) { .menu { display: none; } }
  .titulo { flex: 1; min-width: 0; }
  .seccion { display: flex; align-items: center; gap: 8px; min-width: 0; font-weight: 800; color: var(--p-texto-2); }
  .nombre-seccion { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .buscar {
    display: none;
    align-items: center;
    gap: 8px;
    min-width: 220px;
    min-height: 38px;
    padding: 0 10px;
    border: 1px solid var(--p-borde);
    border-radius: 10px;
    background: var(--p-superficie);
    color: var(--p-apagado);
    cursor: pointer;
  }
  .buscar span:nth-of-type(1) { flex: 1; text-align: left; }
  @media (min-width: 760px) { .buscar { display: inline-flex; } }
  .cambios { gap: 8px; }
  .cambios.hay { background: var(--p-tinta); border-color: var(--p-tinta); color: #fff; }
  .cuenta { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--p-luz); color: var(--p-tinta); font-size: 0.8rem; }
  @media (max-width: 640px) { .cambios .texto { display: none; } }
  .p-contenido { flex: 1; }
  .movil-publicar {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom));
    z-index: 45;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 10px 10px 16px;
    border-radius: 16px;
    background: var(--p-tinta);
    color: #fff;
    box-shadow: var(--p-sombra-2);
  }
  @media (min-width: 1000px) { .movil-publicar { display: none; } }
</style>
