<script lang="ts">
  import Icono from '../componentes/Icono.svelte';
  import { estado } from '../lib/estado.svelte';
  import { hace, fechaHora } from '../lib/texto';
  import type { AvisoVigilancia, Colaborador, EstadoVigilancia } from '../lib/tipos';

  let colaboradores = $state<Colaborador[] | null>(null);
  let errorColab = $state('');
  estado.backend
    ?.colaboradores()
    .then((c) => (colaboradores = c))
    .catch((e) => (errorColab = (e as Error).message));

  const repo = estado.config.repo;
  const [propietario, nombre] = repo.split('/');
  const caducidad = $derived(estado.usuario?.caducidad ? new Date(estado.usuario.caducidad.replace(' UTC', 'Z').replace(' ', 'T')) : null);
  const diasCaducidad = $derived(caducidad ? Math.round((caducidad.getTime() - Date.now()) / 86_400_000) : null);
  let opcion = $state<'org' | 'clasica' | 'boton'>('org');

  // Diagnóstico: vigilancia automática y errores del panel en este navegador.
  let vigilancia = $state<EstadoVigilancia>(null);
  let alertas = $state<AvisoVigilancia[]>([]);
  estado.backend?.vigilancia().then((v) => (vigilancia = v)).catch(() => {});
  estado.backend?.avisosVigilancia().then((a) => (alertas = a)).catch(() => {});

  async function copiarInforme() {
    const informe = {
      fecha: new Date().toISOString(),
      repositorio: estado.config.repo,
      version: estado.cabeza,
      modo: estado.modo,
      navegador: navigator.userAgent,
      pendientes: Object.values(estado.pendientes).map((c) => `${c.tipo} ${c.ruta}`),
      despliegue: estado.despliegue ? { estado: estado.despliegue.estado, url: estado.despliegue.url } : null,
      errores: estado.errores,
    };
    await navigator.clipboard.writeText(JSON.stringify(informe, null, 2));
    estado.aviso('Informe copiado. Pégalo en un correo a quien mantiene la web.', 'ok');
  }
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Accesos</h1>
      <p>Quién puede entrar en este panel y cómo dar acceso a otra persona.</p>
    </div>
  </header>

  <div class="p-dos-columnas">
    <div class="principal">
      <section class="p-tarjeta">
        <div class="p-tarjeta-cab"><h2><Icono nombre="Users" /> Personas con acceso</h2></div>
        {#if colaboradores}
          <div class="p-lista">
            {#each colaboradores as c (c.login)}
              <div class="p-fila">
                {#if c.avatar}<img class="av" src={c.avatar} alt="" />{:else}<span class="av inicial">{c.login.slice(0, 1).toUpperCase()}</span>{/if}
                <span class="txt"><strong>@{c.login}</strong></span>
                <span class="p-chip {c.rol === 'admin' ? 'tinta' : ''}">{c.rol === 'admin' ? 'Administrador' : 'Puede editar'}</span>
              </div>
            {/each}
          </div>
        {:else if errorColab}
          <div class="p-tarjeta-cuerpo"><p class="p-ayuda">No se puede ver la lista con tu clave actual ({errorColab}). Consulta la lista en GitHub.</p></div>
        {:else}
          <div class="p-tarjeta-cuerpo"><p class="p-apagado"><Icono nombre="Loader" clase="p-girar" /> Cargando…</p></div>
        {/if}
        <div class="p-tarjeta-pie">
          <a class="p-btn pequeno" href={`https://github.com/${repo}/settings/access`} target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Gestionar en GitHub</a>
        </div>
      </section>

      <section class="p-tarjeta">
        <div class="p-tarjeta-cab"><h2><Icono nombre="KeyRound" /> Dar acceso a otra persona</h2></div>
        <div class="p-tarjeta-cuerpo">
          <p>La otra persona necesita una cuenta gratuita de GitHub. Hay tres formas, de más a menos recomendable:</p>
          <div class="opciones" role="tablist">
            <button type="button" role="tab" aria-selected={opcion === 'org'} onclick={() => (opcion = 'org')}><strong>Organización</strong><small>Recomendada</small></button>
            <button type="button" role="tab" aria-selected={opcion === 'boton'} onclick={() => (opcion = 'boton')}><strong>Botón «Entrar con GitHub»</strong><small>La más cómoda</small></button>
            <button type="button" role="tab" aria-selected={opcion === 'clasica'} onclick={() => (opcion = 'clasica')}><strong>Clave clásica</strong><small>La más rápida</small></button>
          </div>
          {#if opcion === 'org'}
            <ol class="pasos">
              <li>Crea una organización gratuita en GitHub (por ejemplo, «optica-siente»). <a href="https://github.com/account/organizations/new?plan=free" target="_blank" rel="noopener">Crear organización ↗</a></li>
              <li>Transfiere este repositorio a la organización: <em>Settings → Danger Zone → Transfer</em>. <a href={`https://github.com/${repo}/settings`} target="_blank" rel="noopener">Abrir ajustes ↗</a></li>
              <li>Invita a la otra persona como miembro de la organización.</li>
              <li>Cada persona crea su propia clave en la pantalla de acceso de este panel, eligiendo la organización como propietaria.</li>
            </ol>
            <p class="p-ayuda">Ventajas: cada persona tiene su clave, el historial muestra quién hizo cada cambio y se puede quitar el acceso a una sin afectar a las demás. Si la web pasa a la organización, cambia la dirección de la demo (no la del dominio definitivo).</p>
          {:else if opcion === 'boton'}
            <ol class="pasos">
              <li>Crea una cuenta gratuita en Cloudflare y despliega el «Sveltia CMS Authenticator» (un servidor de inicio de sesión gratuito). <a href="https://github.com/sveltia/sveltia-cms-auth" target="_blank" rel="noopener">Instrucciones ↗</a></li>
              <li>Crea una «OAuth App» en GitHub con la dirección de ese servidor.</li>
              <li>Pon su dirección en la variable <code>PUBLIC_PANEL_AUTH_URL</code> del repositorio y republica.</li>
              <li>Invita a la persona como colaboradora: <a href={`https://github.com/${repo}/settings/access`} target="_blank" rel="noopener">invitar ↗</a>. Ya solo tendrá que pulsar «Entrar con GitHub».</li>
            </ol>
            <p class="p-ayuda">Ventaja: nadie tiene que crear ni copiar claves. Inconveniente: hay que montar el servidor una vez (unos 15 minutos).</p>
          {:else}
            <ol class="pasos">
              <li>Invita a la persona como colaboradora del repositorio. <a href={`https://github.com/${repo}/settings/access`} target="_blank" rel="noopener">Invitar ↗</a></li>
              <li>Ella acepta la invitación y crea una clave <strong>clásica</strong> con el permiso <code>repo</code>. <a href="https://github.com/settings/tokens/new?scopes=repo&description=Panel%20Siente" target="_blank" rel="noopener">Crear clave clásica ↗</a></li>
              <li>Pega esa clave en la pantalla de acceso del panel.</li>
            </ol>
            <p class="p-ayuda">Ojo: GitHub no permite a un colaborador usar las claves nuevas («fine-grained») en un repositorio de una cuenta personal, por eso aquí hace falta la clásica. Esa clave da acceso a todos sus repositorios: que la guarde bien.</p>
          {/if}
        </div>
      </section>
    </div>

    <aside class="p-lateral-fijo">
      <section class="p-tarjeta">
        <div class="p-tarjeta-cab"><h2><Icono nombre="ShieldCheck" /> Tu sesión</h2></div>
        <div class="p-tarjeta-cuerpo">
          <div class="yo">
            {#if estado.usuario?.avatar}<img class="av grande" src={estado.usuario.avatar} alt="" />{/if}
            <div><strong>{estado.usuario?.nombre}</strong><p class="p-apagado">@{estado.usuario?.login}</p></div>
          </div>
          <dl class="datos">
            <div><dt>Repositorio</dt><dd><code>{propietario}/{nombre}</code></dd></div>
            <div><dt>Permisos</dt><dd>{estado.puedeAdministrar ? 'Administrador' : 'Edición'}</dd></div>
            {#if caducidad}
              <div><dt>Tu clave caduca</dt><dd class:aviso={diasCaducidad !== null && diasCaducidad < 15}>{caducidad.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} ({diasCaducidad} días)</dd></div>
            {/if}
          </dl>
          <button class="p-btn" type="button" onclick={() => estado.salir()}><Icono nombre="LogOut" /> Cerrar sesión en este dispositivo</button>
          <p class="p-ayuda">La clave solo está guardada en este navegador. Si pierdes el móvil o el ordenador, bórrala en GitHub y crea otra.</p>
        </div>
      </section>

      <section class="p-tarjeta" id="diagnostico">
        <div class="p-tarjeta-cab"><h2><Icono nombre="Activity" /> Diagnóstico</h2></div>
        <div class="p-tarjeta-cuerpo">
          <div class="diag">
            <span class="luz {alertas.length ? 'mal' : vigilancia?.estado === 'error' ? 'mal' : vigilancia ? 'bien' : ''}"></span>
            <div>
              <strong>Vigilancia automática</strong>
              <p class="p-apagado">
                {#if alertas.length}{alertas.length === 1 ? 'Hay un aviso abierto' : `Hay ${alertas.length} avisos abiertos`}
                {:else if vigilancia}Última comprobación {hace(vigilancia.fecha)}: {vigilancia.estado === 'ok' ? 'todo bien' : vigilancia.estado === 'en_curso' ? 'en marcha' : 'con problemas'}
                {:else}Revisa la web cada 6 horas y tras cada publicación{/if}
              </p>
            </div>
          </div>
          {#each alertas as a (a.numero)}
            <a class="alerta" href={a.url} target="_blank" rel="noopener"><Icono nombre="TriangleAlert" /> {a.titulo}</a>
          {/each}
          <p class="p-ayuda">Si una publicación falla o una página deja de responder, GitHub envía un correo a quien sigue el repositorio y aparece aquí y en el Resumen.</p>

          <div class="diag">
            <span class="luz {estado.errores.length ? 'regular' : 'bien'}"></span>
            <div>
              <strong>Errores del panel en este navegador</strong>
              <p class="p-apagado">{estado.errores.length ? `${estado.errores.length} registrados · el último ${hace(estado.errores[0].fecha)}` : 'Ninguno'}</p>
            </div>
          </div>
          {#if estado.errores.length}
            <ul class="errores">
              {#each estado.errores.slice(0, 5) as e (e.fecha + e.mensaje)}
                <li><small class="p-apagado">{fechaHora(e.fecha)} · {e.donde}</small><span>{e.mensaje}</span></li>
              {/each}
            </ul>
          {/if}
          <div class="p-acciones">
            <button class="p-btn pequeno" type="button" onclick={copiarInforme}><Icono nombre="Copy" /> Copiar informe técnico</button>
            {#if estado.errores.length}<button class="p-btn pequeno fantasma" type="button" onclick={() => estado.borrarErrores()}>Borrar</button>{/if}
          </div>
        </div>
      </section>
    </aside>
  </div>
</div>

<style>
  aside { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-content: start; }
  .diag { display: flex; gap: 12px; align-items: flex-start; }
  .diag p { font-size: 0.88rem; }
  .luz { width: 12px; height: 12px; margin-top: 5px; flex: none; border-radius: 50%; background: var(--p-borde-fuerte); }
  .luz.bien { background: var(--p-ok); box-shadow: 0 0 0 4px var(--p-ok-fondo); }
  .luz.regular { background: #c98a14; box-shadow: 0 0 0 4px var(--p-aviso-fondo); }
  .luz.mal { background: var(--p-error); box-shadow: 0 0 0 4px var(--p-error-fondo); }
  .alerta { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 10px; background: var(--p-error-fondo); color: var(--p-error); font-weight: 700; font-size: 0.9rem; text-decoration: none; }
  .errores { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; max-height: 220px; overflow: auto; }
  .errores li { display: grid; padding: 8px 10px; border-radius: 8px; background: var(--p-superficie-2); font-size: 0.85rem; overflow-wrap: anywhere; }
  .principal { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .av { width: 34px; height: 34px; border-radius: 50%; background: var(--p-fondo); flex: none; }
  .av.grande { width: 52px; height: 52px; }
  .av.inicial { display: grid; place-items: center; background: var(--p-roble-claro); color: var(--p-roble-oscuro); font-weight: 800; }
  .txt { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .opciones { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(170px, 100%), 1fr)); gap: 8px; }
  .opciones button { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; padding: 12px; border: 1px solid var(--p-borde); border-radius: 12px; background: var(--p-superficie); text-align: left; cursor: pointer; }
  .opciones button small { color: var(--p-apagado); }
  .opciones button[aria-selected='true'] { border-color: var(--p-tinta); box-shadow: inset 0 0 0 1px var(--p-tinta); background: var(--p-superficie-2); }
  .pasos { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; margin: 0; padding-left: 1.3em; }
  .pasos a { font-weight: 700; color: var(--p-roble-oscuro); }
  code { padding: 1px 5px; border-radius: 5px; background: var(--p-fondo); font-size: 0.88em; }
  .yo { display: flex; align-items: center; gap: 12px; }
  .datos { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; margin: 0; }
  .datos div { display: flex; justify-content: space-between; gap: 10px; font-size: 0.9rem; }
  .datos dt { color: var(--p-apagado); }
  .datos dd { margin: 0; font-weight: 700; text-align: right; }
  .datos dd.aviso { color: var(--p-error); }
</style>
