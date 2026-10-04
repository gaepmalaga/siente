<script lang="ts">
  import { untrack } from 'svelte';
  import Icono from '../componentes/Icono.svelte';
  import Interruptor from '../componentes/Interruptor.svelte';
  import Etiquetas from '../componentes/Etiquetas.svelte';
  import ListaOrdenable from '../componentes/ListaOrdenable.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { clonar } from '../lib/texto';
  import { describirCambios } from '../lib/describir';
  import { ahoraEnMadrid, fechaLarga } from '../../lib/horario';
  import { Negocio, type DatosNegocio } from '../../lib/esquemas';

  const publicado = JSON.parse(estado.originales[RUTAS.negocio] ?? 'null');
  let d = $state(clonar(estado.json<DatosNegocio>(RUTAS.negocio)));
  const hoy = ahoraEnMadrid().iso;

  $effect(() => {
    const nuevo = $state.snapshot(d);
    untrack(() => estado.fijarJson(RUTAS.negocio, nuevo, describirCambios(publicado, nuevo, 'Datos del centro')));
  });

  // Errores por campo, con el mismo esquema que usa la web al compilar.
  const errores = $derived.by(() => {
    const r = Negocio.safeParse($state.snapshot(d));
    const m: Record<string, string> = {};
    if (!r.success) for (const i of r.error.issues) m[i.path.join('.')] = i.message;
    return m;
  });

  const diasVeo = $derived(Math.round((Date.parse(d.planVeo.fin) - Date.parse(hoy)) / 86_400_000));
  const waOk = $derived(/^\d{11,13}$/.test(d.whatsapp));
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Datos del centro</h1>
      <p>Teléfonos, dirección y redes aparecen en toda la web, en la ficha de contacto que se descarga y en los datos que lee Google.</p>
    </div>
  </header>

  <div class="secciones">
    <section class="p-tarjeta" id="contacto">
      <div class="p-tarjeta-cab"><h2><Icono nombre="Phone" /> Contacto</h2></div>
      <div class="p-tarjeta-cuerpo p-rejilla dos">
        <label class="p-campo"><span class="p-etiqueta">Teléfono fijo</span><input class="p-input" bind:value={d.telefono} inputmode="tel" />{#if errores.telefono}<span class="p-error-campo">{errores.telefono}</span>{/if}</label>
        <label class="p-campo"><span class="p-etiqueta">Móvil</span><input class="p-input" bind:value={d.movil} inputmode="tel" /></label>
        <label class="p-campo">
          <span class="p-etiqueta">WhatsApp <small>con 34 delante, sin espacios</small></span>
          <input class="p-input" bind:value={d.whatsapp} inputmode="numeric" aria-invalid={!waOk} />
          {#if waOk}<a class="p-ayuda" href={`https://wa.me/${d.whatsapp}`} target="_blank" rel="noopener">Probar el enlace de WhatsApp ↗</a>{:else}<span class="p-error-campo">Ejemplo: 34641446882</span>{/if}
        </label>
        <label class="p-campo"><span class="p-etiqueta">Correo</span><input class="p-input" type="email" bind:value={d.email} />{#if errores.email}<span class="p-error-campo">Revisa el correo</span>{/if}</label>
      </div>
    </section>

    <section class="p-tarjeta" id="direccion">
      <div class="p-tarjeta-cab">
        <h2><Icono nombre="MapPin" /> Dirección</h2>
        <a class="p-btn pequeno" href={`https://www.google.com/maps?q=${d.geo.lat},${d.geo.lng}`} target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Ver en el mapa</a>
      </div>
      <div class="p-tarjeta-cuerpo">
        <div class="p-rejilla dos">
          <label class="p-campo"><span class="p-etiqueta">Calle y número</span><input class="p-input" bind:value={d.direccion.calle} /></label>
          <label class="p-campo"><span class="p-etiqueta">Código postal</span><input class="p-input" bind:value={d.direccion.codigoPostal} inputmode="numeric" /></label>
          <label class="p-campo"><span class="p-etiqueta">Barrio</span><input class="p-input" bind:value={d.direccion.barrio} /></label>
          <label class="p-campo"><span class="p-etiqueta">Ciudad</span><input class="p-input" bind:value={d.direccion.ciudad} /></label>
          <label class="p-campo"><span class="p-etiqueta">Latitud <small>para el mapa</small></span><input class="p-input" type="number" step="0.000001" bind:value={d.geo.lat} /></label>
          <label class="p-campo"><span class="p-etiqueta">Longitud</span><input class="p-input" type="number" step="0.000001" bind:value={d.geo.lng} /></label>
        </div>
        <div class="p-campo">
          <span class="p-etiqueta">Cómo llegar</span>
          <ListaOrdenable bind:items={d.comoLlegar}>
            {#snippet fila(c, i)}
              <div class="llegar">
                <select class="p-select" bind:value={c.medio} aria-label="Medio">
                  <option value="metro">Metro</option><option value="bus">Autobús</option><option value="coche">Coche</option>
                </select>
                <input class="p-input" bind:value={c.texto} aria-label="Texto" />
                <button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Quitar" onclick={() => d.comoLlegar.splice(i, 1)}><Icono nombre="Trash2" /></button>
              </div>
            {/snippet}
          </ListaOrdenable>
          <button class="p-btn pequeno" type="button" onclick={() => d.comoLlegar.push({ medio: 'bus', texto: '' })}><Icono nombre="Plus" /> Añadir</button>
        </div>
      </div>
    </section>

    <section class="p-tarjeta" id="redes">
      <div class="p-tarjeta-cab"><h2><Icono nombre="Globe" /> Redes y Google</h2></div>
      <div class="p-tarjeta-cuerpo">
        <div class="p-rejilla dos">
          <label class="p-campo"><span class="p-etiqueta">Instagram</span><input class="p-input" bind:value={d.redes.instagram} /></label>
          <label class="p-campo"><span class="p-etiqueta">Facebook</span><input class="p-input" bind:value={d.redes.facebook} /></label>
          <label class="p-campo"><span class="p-etiqueta">Ficha de Google Maps</span><input class="p-input" bind:value={d.redes.googleMaps} /></label>
          <label class="p-campo">
            <span class="p-etiqueta">Enlace para dejar reseña</span>
            <input class="p-input" bind:value={d.redes.resenasGoogle} placeholder="https://g.page/r/…/review" />
          </label>
        </div>
        <div class="consejo">
          <Icono nombre="Lightbulb" />
          <p><strong>Cómo conseguir el enlace directo de reseñas:</strong> en Google Business Profile pulsa <em>Pedir reseñas</em> y copia el enlace. Con él, los carteles y tarjetas con QR llevan directamente a la ventana de opinar.</p>
        </div>
      </div>
    </section>

    <section class="p-tarjeta" id="marcas">
      <div class="p-tarjeta-cab"><h2><Icono nombre="Sparkles" /> Marcas y barrios</h2></div>
      <div class="p-tarjeta-cuerpo">
        <div class="p-campo"><span class="p-etiqueta">Marcas que trabajáis <small>salen en la portada y en Óptica</small></span><Etiquetas bind:valores={d.marcas} /></div>
        <div class="p-campo"><span class="p-etiqueta">Barrios cercanos <small>ayudan a Google a saber a quién atendéis</small></span><Etiquetas bind:valores={d.zonas} /></div>
      </div>
    </section>

    <section class="p-tarjeta" id="planveo">
      <div class="p-tarjeta-cab"><h2><Icono nombre="Gift" /> Plan VEO</h2></div>
      <div class="p-tarjeta-cuerpo">
        <Interruptor bind:activo={d.planVeo.activo} etiqueta="Anunciar el Plan VEO en la web" ayuda="Página propia, franja en la portada, menú y botón en Instagram." />
        <label class="p-campo">
          <span class="p-etiqueta">Fecha de fin</span>
          <input class="p-input" type="date" bind:value={d.planVeo.fin} />
          <span class="p-ayuda">{diasVeo >= 0 ? `Quedan ${diasVeo} días (hasta el ${fechaLarga(d.planVeo.fin, true)}). Después, la web lo retira sola.` : 'Ya ha terminado: la web no lo muestra.'}</span>
        </label>
      </div>
    </section>

    <section class="p-tarjeta" id="analitica">
      <div class="p-tarjeta-cab"><h2><Icono nombre="BarChart3" /> Analítica</h2></div>
      <div class="p-tarjeta-cuerpo">
        <label class="p-campo">
          <span class="p-etiqueta">ID de Google Analytics 4</span>
          <input class="p-input" bind:value={d.analitica.ga4} placeholder="G-XXXXXXXXXX" aria-invalid={!!errores['analitica.ga4']} />
          {#if errores['analitica.ga4']}<span class="p-error-campo">{errores['analitica.ga4']}</span>{/if}
        </label>
        <p class="p-ayuda">
          {d.analitica.ga4
            ? 'Activa: aparece el aviso de cookies y se miden las visitas y los clics en WhatsApp, llamar y pedir cita de quien acepte.'
            : 'Sin ID no hay analítica ni aviso de cookies. Crea una propiedad en analytics.google.com y pega aquí su ID de medición.'}
        </p>
        <label class="p-campo">
          <span class="p-etiqueta">Verificación de Search Console <small>opcional</small></span>
          <input class="p-input" bind:value={d.analitica.verificacion} placeholder="Código de la etiqueta google-site-verification" spellcheck="false" aria-invalid={!!errores['analitica.verificacion']} />
          {#if errores['analitica.verificacion']}<span class="p-error-campo">{errores['analitica.verificacion']}</span>{:else}<span class="p-ayuda">Al añadir la web en Search Console, elige «Etiqueta HTML» y pega aquí solo lo que va dentro de <code>content="…"</code>.</span>{/if}
        </label>
        <a class="p-btn pequeno ir-estadisticas" href="#/estadisticas"><Icono nombre="ChartLine" /> Ver las estadísticas en el panel</a>
      </div>
    </section>

    <section class="p-tarjeta" id="identidad">
      <div class="p-tarjeta-cab"><h2><Icono nombre="Store" /> Nombre y datos legales</h2></div>
      <div class="p-tarjeta-cuerpo p-rejilla dos">
        <label class="p-campo"><span class="p-etiqueta">Nombre del centro</span><input class="p-input" bind:value={d.nombre} /></label>
        <label class="p-campo"><span class="p-etiqueta">Nombre corto</span><input class="p-input" bind:value={d.nombreCorto} /></label>
        <label class="p-campo"><span class="p-etiqueta">Eslogan</span><input class="p-input" bind:value={d.eslogan} /></label>
        <label class="p-campo"><span class="p-etiqueta">Razón social</span><input class="p-input" bind:value={d.razonSocial} /></label>
        <label class="p-campo"><span class="p-etiqueta">NIF</span><input class="p-input" bind:value={d.nif} /></label>
      </div>
    </section>
  </div>
</div>

<style>
  .ir-estadisticas { justify-self: start; }
  .secciones { display: grid; gap: 20px; }
  .llegar { display: grid; grid-template-columns: 130px 1fr auto; gap: 8px; align-items: center; }
  .consejo { display: flex; gap: 10px; padding: 12px 14px; border-radius: 10px; background: #fdf8ee; font-size: 0.9rem; }
  .consejo :global(.p-icono) { color: #c98a14; margin-top: 2px; }
</style>
