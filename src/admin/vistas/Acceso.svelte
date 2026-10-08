<script lang="ts">
  import Icono from '../componentes/Icono.svelte';
  import Gafas from '../componentes/Gafas.svelte';
  import { estado } from '../lib/estado.svelte';

  let token = $state('');
  let recordar = $state(true);
  let ver = $state(false);
  let ayuda = $state(false);

  const propietario = $derived(estado.config.repo.split('/')[0]);
  const nombreRepo = $derived(estado.config.repo.split('/')[1]);
  const enlaceToken = $derived(
    `https://github.com/settings/personal-access-tokens/new?${new URLSearchParams({
      name: 'Panel Siente',
      description: 'Acceso al panel de la web de Siente',
      target_name: propietario,
      expires_in: '365',
      contents: 'write',
      actions: 'read',
    })}`,
  );

  async function entrar(e: Event) {
    e.preventDefault();
    if (!token.trim()) return;
    await estado.conectar(token, recordar);
  }

  // Inicio de sesión con GitHub mediante un servidor OAuth (opcional).
  function entrarConGitHub() {
    const url = `${estado.config.authUrl.replace(/\/$/, '')}/auth?provider=github&site_id=${location.hostname}&scope=repo`;
    const ventana = open(url, 'siente-acceso', 'width=620,height=720');
    const escuchar = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data === 'authorizing:github') return ventana?.postMessage(ev.data, ev.origin);
      if (ev.data.startsWith('authorization:github:success:')) {
        removeEventListener('message', escuchar);
        const { token: t } = JSON.parse(ev.data.slice('authorization:github:success:'.length));
        estado.conectar(t, recordar);
      } else if (ev.data.startsWith('authorization:github:error:')) {
        removeEventListener('message', escuchar);
        estado.errorAcceso = 'GitHub no ha autorizado el acceso.';
      }
    };
    addEventListener('message', escuchar);
  }
</script>

<div class="acceso">
  <section class="marca">
    <div class="luz">
      <Gafas clase="gafas" />
      <span class="nombre">SIENTE</span>
      <span class="sub">Panel de la web</span>
    </div>
    <p class="lema">Tus sentidos en las mejores manos.<br />Y tu web, también.</p>
  </section>

  <section class="formulario">
    {#if estado.fase === 'cargando'}
      <div class="cargando">
        <Icono nombre="Loader" clase="p-girar" />
        <h1>Abriendo el panel…</h1>
        <p class="p-apagado">Leyendo los textos, horarios y fotos de la web.</p>
      </div>
    {:else}
      <form onsubmit={entrar}>
        <h1>Entrar al panel</h1>
        <p class="p-apagado">Usa tu clave de acceso de GitHub. Solo se guarda en este navegador.</p>

        {#if estado.config.authUrl}
          <button class="p-btn primario grande" type="button" onclick={entrarConGitHub}><Icono nombre="Lock" /> Entrar con GitHub</button>
          <div class="o"><span>o con una clave</span></div>
        {/if}

        <label class="p-campo">
          <span class="p-etiqueta">Clave de acceso</span>
          <span class="clave">
            <input class="p-input" type={ver ? 'text' : 'password'} bind:value={token} placeholder="github_pat_…" autocomplete="off" spellcheck="false" aria-invalid={!!estado.errorAcceso} />
            <button type="button" class="p-btn fantasma solo-icono" aria-label={ver ? 'Ocultar clave' : 'Mostrar clave'} onclick={() => (ver = !ver)}>
              <Icono nombre={ver ? 'EyeOff' : 'Eye'} />
            </button>
          </span>
        </label>
        <label class="recordar"><input type="checkbox" bind:checked={recordar} /> Recordar en este dispositivo</label>

        {#if estado.errorAcceso}
          <p class="error" role="alert"><Icono nombre="CircleAlert" /> {estado.errorAcceso}</p>
        {/if}

        <button class="p-btn primario grande" type="submit" disabled={!token.trim()}><Icono nombre="KeyRound" /> Entrar</button>

        <button class="enlace" type="button" onclick={() => (ayuda = !ayuda)} aria-expanded={ayuda}>
          <Icono nombre={ayuda ? 'ChevronUp' : 'ChevronDown'} /> ¿No tienes clave? Créala en un minuto
        </button>
        {#if ayuda}
          <ol class="pasos">
            <li>
              <a class="p-btn roble" href={enlaceToken} target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Crear la clave en GitHub</a>
              <span>Se abre GitHub con casi todo rellenado.</span>
            </li>
            <li>En <strong>Repository access</strong>, elige <strong>Only select repositories</strong> y marca <code>{nombreRepo}</code>.</li>
            <li>Baja del todo, pulsa <strong>Generate token</strong> y copia la clave.</li>
            <li>Pégala arriba y pulsa <strong>Entrar</strong>.</li>
          </ol>
        {/if}

        <div class="pie">
          <a href="?demo" class="p-btn fantasma pequeno"><Icono nombre="Sparkles" /> Ver el panel en modo demostración</a>
        </div>
      </form>
    {/if}
  </section>
</div>

<style>
  .acceso { min-height: 100dvh; display: grid; }
  @media (min-width: 960px) { .acceso { grid-template-columns: 1.05fr 1fr; } }
  .marca {
    position: relative;
    display: grid;
    place-content: center;
    gap: 40px;
    min-height: 300px;
    padding: 40px 24px;
    overflow: hidden;
    background-color: #a8743f;
    background-image:
      radial-gradient(110% 70% at 50% 38%, rgb(255 212 150 / 0.55), transparent 62%),
      radial-gradient(120% 90% at 50% 40%, transparent 45%, rgb(30 16 6 / 0.5)),
      repeating-linear-gradient(90deg, #4a2e17 0 2px, #94602f 2px 4px, #b98450 4px 13px, #c48f5a 13px 17px, #aa7542 17px 21px, #6a4220 21px 23px);
  }
  .luz { display: grid; justify-items: center; width: min(380px, 70vw); margin-inline: auto; color: #f6e2c0; animation: encender 1.4s ease-out both; }
  .luz :global(.gafas) { width: 100%; filter: drop-shadow(0 0 5px rgb(255 222 165 / 0.95)) drop-shadow(0 0 22px rgb(255 196 120 / 0.65)) drop-shadow(0 0 60px rgb(255 170 90 / 0.4)); }
  .nombre { margin-top: 18px; font-family: var(--p-mono); font-weight: 700; font-size: clamp(2.6rem, 2rem + 3vw, 4.4rem); line-height: 1; letter-spacing: 0.05em; text-shadow: 0 0 5px rgb(255 222 165 / 0.95), 0 0 22px rgb(255 196 120 / 0.65), 0 0 60px rgb(255 170 90 / 0.45); }
  .sub { margin-top: 12px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; font-size: 0.8rem; color: #fff3df; }
  .lema { text-align: center; color: #fff8ec; font-size: 1.05rem; text-shadow: 0 2px 10px rgb(0 0 0 / 0.5); }
  @keyframes encender { 0% { opacity: 0.15; } 20% { opacity: 0.9; } 28% { opacity: 0.3; } 40% { opacity: 1; } 100% { opacity: 1; } }
  .formulario { display: grid; place-items: center; padding: 40px 20px; background: var(--p-fondo); }
  form, .cargando { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; width: min(420px, 100%); }
  .cargando { justify-items: center; text-align: center; }
  .cargando :global(.p-icono) { width: 36px; height: 36px; color: var(--p-roble); }
  h1 { font-size: 1.9rem; font-weight: 800; }
  .clave { position: relative; display: block; }
  .clave .p-input { padding-right: 48px; }
  .clave .p-btn { position: absolute; top: 50%; right: 4px; transform: translateY(-50%); }
  .recordar { display: flex; align-items: center; gap: 8px; font-size: 0.92rem; }
  .error { display: flex; gap: 8px; padding: 12px; border-radius: 10px; background: var(--p-error-fondo); color: var(--p-error); font-weight: 700; font-size: 0.92rem; }
  .enlace { display: inline-flex; align-items: center; gap: 6px; justify-self: start; padding: 0; border: 0; background: none; font-weight: 700; color: var(--p-roble-oscuro); cursor: pointer; }
  .pasos { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; margin: 0; padding: 16px 16px 16px 36px; border-radius: 12px; background: var(--p-superficie); border: 1px solid var(--p-borde); font-size: 0.93rem; }
  .pasos li:first-child { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; justify-items: start; }
  code { padding: 1px 5px; border-radius: 5px; background: var(--p-fondo); }
  .o { display: flex; align-items: center; gap: 10px; color: var(--p-apagado); font-size: 0.85rem; }
  .o::before, .o::after { content: ''; flex: 1; height: 1px; background: var(--p-borde-fuerte); }
  .pie { display: flex; justify-content: center; padding-top: 8px; border-top: 1px solid var(--p-borde); }
</style>
