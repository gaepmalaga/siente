<script lang="ts">
  import { untrack } from 'svelte';
  import Icono from '../componentes/Icono.svelte';
  import Interruptor from '../componentes/Interruptor.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { clonar } from '../lib/texto';
  import { describirCambios } from '../lib/describir';
  import { paginasInternas } from '../lib/paginas';
  import {
    DIAS,
    NOMBRE_DIA,
    porDia,
    agrupar,
    erroresHorario,
    estadoApertura,
    textoCierre,
    sumarDias,
    fechaLarga,
    ahoraEnMadrid,
    DIAS_PREAVISO,
    type Dia,
    type HorarioSemana,
  } from '../../lib/horario';
  import type { DatosNegocio } from '../../lib/esquemas';

  const original = estado.json<DatosNegocio>(RUTAS.negocio);
  const publicado = JSON.parse(estado.originales[RUTAS.negocio] ?? 'null');
  let semana = $state<HorarioSemana>(porDia(original.horario));
  let cierres = $state(clonar(original.cierres));
  let aviso = $state(clonar(original.aviso));
  const hoy = ahoraEnMadrid().iso;
  const paginas = paginasInternas().filter((p) => p.grupo === 'Páginas');

  const errores = $derived(erroresHorario(semana));
  const grupos = $derived(agrupar(semana));
  const ahora = $derived(estadoApertura(semana, cierres));
  const erroresCierres = $derived(cierres.map((c) => (c.hasta < c.desde ? 'La fecha final es anterior a la inicial' : '')));

  // Cada cambio queda pendiente al momento.
  $effect(() => {
    const horario = DIAS.flatMap((dia) => semana[dia].map((t) => ({ dia, abre: t.abre, cierra: t.cierra })));
    const avisoLimpio = { ...$state.snapshot(aviso) };
    if (!avisoLimpio.desde) delete avisoLimpio.desde;
    if (!avisoLimpio.hasta) delete avisoLimpio.hasta;
    const base = untrack(() => estado.json<DatosNegocio>(RUTAS.negocio));
    const nuevo = { ...base, horario, cierres: $state.snapshot(cierres), aviso: avisoLimpio };
    estado.fijarJson(RUTAS.negocio, nuevo, describirCambios(publicado, nuevo, 'Horario'));
  });

  function anadirTramo(d: Dia) {
    const ult = semana[d].at(-1);
    semana[d].push(ult ? { abre: '17:00', cierra: '20:00' } : { abre: '10:00', cierra: '14:00' });
  }
  function copiarLaborables() {
    for (const d of ['martes', 'miercoles', 'jueves', 'viernes'] as Dia[]) semana[d] = clonar(semana.lunes);
    estado.aviso('Horario del lunes copiado de martes a viernes.', 'ok');
  }
  function anadirCierre() {
    const d = sumarDias(hoy, 7);
    cierres.push({ desde: d, hasta: d, motivo: 'Festivo' });
  }
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Horario y avisos</h1>
      <p>Lo que cambies aquí actualiza la web entera: el horario, el «Abierto ahora», los días que se ofrecen para pedir cita y lo que ve Google.</p>
    </div>
  </header>

  <div class="p-dos-columnas">
    <div class="principal">
      <!-- HORARIO SEMANAL -->
      <section class="p-tarjeta" id="semanal">
        <div class="p-tarjeta-cab">
          <h2><Icono nombre="Clock" /> Horario semanal</h2>
          <button class="p-btn pequeno" type="button" onclick={copiarLaborables}><Icono nombre="Copy" /> Lunes → martes a viernes</button>
        </div>
        <div class="dias">
          {#each DIAS as d (d)}
            <div class="dia" class:cerrado={!semana[d].length}>
              <div class="nombre">
                <strong>{NOMBRE_DIA[d]}</strong>
                <Interruptor
                  etiqueta={semana[d].length ? 'Abierto' : 'Cerrado'}
                  activo={semana[d].length > 0}
                  onchange={(v) => (semana[d] = v ? [{ abre: '10:00', cierra: '14:00' }] : [])}
                />
              </div>
              <div class="tramos">
                {#each semana[d] as t, i (i)}
                  <div class="tramo">
                    <input class="p-input hora" type="time" step="300" bind:value={t.abre} aria-label={`${NOMBRE_DIA[d]}: abre`} />
                    <span>a</span>
                    <input class="p-input hora" type="time" step="300" bind:value={t.cierra} aria-label={`${NOMBRE_DIA[d]}: cierra`} />
                    <button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Quitar tramo" onclick={() => semana[d].splice(i, 1)}><Icono nombre="X" /></button>
                  </div>
                {/each}
                {#if semana[d].length && semana[d].length < 3}
                  <button class="p-btn fantasma pequeno" type="button" onclick={() => anadirTramo(d)}><Icono nombre="Plus" /> Tramo</button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        {#if errores.length}
          <div class="p-tarjeta-pie errores">{#each errores as e (e)}<p><Icono nombre="CircleAlert" /> {e}</p>{/each}</div>
        {/if}
      </section>

      <!-- CIERRES -->
      <section class="p-tarjeta" id="cierres">
        <div class="p-tarjeta-cab">
          <h2><Icono nombre="CalendarX" /> Vacaciones y festivos</h2>
          <button class="p-btn pequeno primario" type="button" onclick={anadirCierre}><Icono nombre="Plus" /> Añadir cierre</button>
        </div>
        <div class="p-tarjeta-cuerpo">
          <p class="p-ayuda">
            La web avisa sola {DIAS_PREAVISO} días antes, deja de ofrecer cita esos días, muestra «Cerrado» y se lo comunica a Google.
          </p>
          {#each cierres as c, i (i)}
            <div class="cierre" class:pasado={c.hasta < hoy}>
              <div class="p-rejilla tres">
                <label class="p-campo"><span class="p-etiqueta">Desde</span><input class="p-input" type="date" bind:value={c.desde} onchange={() => c.hasta < c.desde && (c.hasta = c.desde)} /></label>
                <label class="p-campo"><span class="p-etiqueta">Hasta (incluido)</span><input class="p-input" type="date" bind:value={c.hasta} min={c.desde} /></label>
                <label class="p-campo">
                  <span class="p-etiqueta">Motivo</span>
                  <input class="p-input" list="motivos" bind:value={c.motivo} placeholder="Vacaciones" />
                </label>
              </div>
              <div class="cierre-pie">
                {#if c.hasta < hoy}
                  <span class="p-chip">Terminado</span>
                {:else if c.desde <= hoy}
                  <span class="p-chip error"><span class="p-punto"></span> Cerrado ahora</span>
                {:else}
                  <span class="p-chip info">Aviso desde el {fechaLarga(sumarDias(c.desde, -DIAS_PREAVISO))}</span>
                {/if}
                <span class="previa">«{textoCierre(c)}»</span>
                <button class="p-btn fantasma pequeno peligro" type="button" onclick={() => cierres.splice(i, 1)}><Icono nombre="Trash2" /> Quitar</button>
              </div>
              {#if erroresCierres[i]}<p class="p-error-campo">{erroresCierres[i]}</p>{/if}
            </div>
          {:else}
            <div class="p-vacio"><Icono nombre="CalendarDays" /> No hay cierres programados.</div>
          {/each}
          {#if cierres.some((c) => c.hasta < hoy)}
            <button class="p-btn pequeno fantasma" type="button" onclick={() => (cierres = cierres.filter((c) => c.hasta >= hoy))}>Quitar los cierres que ya han pasado</button>
          {/if}
          <datalist id="motivos">
            <option value="Vacaciones"></option><option value="Festivo"></option><option value="Puente"></option><option value="Inventario"></option><option value="Formación"></option><option value="Reforma"></option>
          </datalist>
        </div>
      </section>

      <!-- AVISO -->
      <section class="p-tarjeta" id="aviso">
        <div class="p-tarjeta-cab"><h2><Icono nombre="Megaphone" /> Aviso en la parte superior</h2></div>
        <div class="p-tarjeta-cuerpo">
          <Interruptor bind:activo={aviso.activo} etiqueta="Mostrar el aviso" ayuda="Para una promoción, un cambio puntual o una novedad." />
          <label class="p-campo">
            <span class="p-etiqueta">Texto <small class="p-contador {aviso.texto.length > 90 ? 'mal' : aviso.texto.length > 70 ? 'mejorable' : 'bien'}">{aviso.texto.length}/90</small></span>
            <input class="p-input" bind:value={aviso.texto} placeholder="Por ejemplo: este sábado, revisión auditiva gratuita" />
          </label>
          <div class="p-rejilla dos">
            <label class="p-campo">
              <span class="p-etiqueta">Al pulsarlo lleva a…</span>
              <select class="p-select" bind:value={aviso.enlace}>
                <option value="">Ningún sitio</option>
                {#each paginas as p (p.ruta)}<option value={p.ruta}>{p.titulo}</option>{/each}
              </select>
            </label>
            <div class="p-rejilla dos">
              <label class="p-campo"><span class="p-etiqueta">Desde <small>opcional</small></span><input class="p-input" type="date" bind:value={aviso.desde} /></label>
              <label class="p-campo"><span class="p-etiqueta">Hasta <small>opcional</small></span><input class="p-input" type="date" bind:value={aviso.hasta} min={aviso.desde} /></label>
            </div>
          </div>
          {#if aviso.texto}
            <div class="barra-aviso" class:apagado={!aviso.activo}>
              <Icono nombre="Info" /> <span>{aviso.texto}</span>
            </div>
            <p class="p-ayuda">
              {#if !aviso.activo}Desactivado: no se muestra.
              {:else if aviso.hasta && aviso.hasta < hoy}Caducado el {fechaLarga(aviso.hasta)}: ya no se muestra.
              {:else if aviso.desde && aviso.desde > hoy}Se mostrará a partir del {fechaLarga(aviso.desde)}.
              {:else}Se está mostrando{aviso.hasta ? ` hasta el ${fechaLarga(aviso.hasta)}` : ''}.{/if}
            </p>
          {/if}
        </div>
      </section>
    </div>

    <!-- VISTA PREVIA -->
    <aside class="p-lateral-fijo lateral">
      <section class="p-tarjeta">
        <div class="p-tarjeta-cab"><h2><Icono nombre="Eye" /> Así se verá</h2></div>
        <div class="p-tarjeta-cuerpo">
          <div class="ahora" class:abierto={ahora.abierto}><span class="p-punto"></span> {ahora.texto}</div>
          <dl class="tabla">
            {#each grupos as g (g.dias)}
              <div><dt>{g.dias}</dt><dd>{g.tramos.length ? g.tramos.join(' · ') : 'Cerrado'}</dd></div>
            {/each}
          </dl>
        </div>
      </section>
      <section class="p-tarjeta consejo">
        <div class="p-tarjeta-cuerpo">
          <p><Icono nombre="Lightbulb" /> <strong>No olvides Google Maps.</strong></p>
          <p class="p-ayuda">Mucha gente mira el horario en Google. Cuando cambies el horario o cierres por vacaciones, actualízalo también en tu ficha de Google Business Profile.</p>
          <a class="p-btn pequeno" href="https://business.google.com/" target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Abrir Google Business</a>
        </div>
      </section>
    </aside>
  </div>
</div>

<style>
  .principal { display: grid; gap: 20px; }
  .dias { display: grid; }
  .dia { display: grid; gap: 10px; padding: 14px 20px; border-bottom: 1px solid var(--p-borde); }
  .dia:last-child { border-bottom: 0; }
  @media (min-width: 720px) { .dia { grid-template-columns: 220px 1fr; align-items: center; } }
  .dia.cerrado { background: var(--p-superficie-2); }
  .nombre { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .nombre :global(.interruptor) { flex-direction: row-reverse; gap: 10px; }
  .nombre :global(.etq) { font-weight: 400; color: var(--p-apagado); font-size: 0.88rem; min-width: 56px; }
  .tramos { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .tramo { display: flex; align-items: center; gap: 6px; padding: 4px 4px 4px 4px; border-radius: 12px; background: var(--p-superficie-2); border: 1px solid var(--p-borde); }
  .hora { width: 112px; min-height: 36px; padding: 4px 8px; font-variant-numeric: tabular-nums; }
  .errores { display: grid; gap: 4px; color: var(--p-error); font-weight: 700; font-size: 0.9rem; }
  .errores p { display: flex; gap: 6px; align-items: center; }
  .cierre { display: grid; gap: 10px; padding: 14px; border-radius: 12px; border: 1px solid var(--p-borde); }
  .cierre.pasado { opacity: 0.6; }
  .cierre-pie { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .previa { flex: 1; min-width: 200px; font-size: 0.88rem; color: var(--p-texto-2); font-style: italic; }
  .barra-aviso { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: var(--p-tinta); color: #fff; font-weight: 700; font-size: 0.92rem; text-align: center; }
  .barra-aviso :global(.p-icono) { color: var(--p-luz); }
  .barra-aviso.apagado { opacity: 0.45; }
  .lateral { display: grid; gap: 20px; }
  .ahora { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--p-error-fondo); color: var(--p-error); font-weight: 700; }
  .ahora.abierto { background: var(--p-ok-fondo); color: var(--p-ok); }
  .tabla { display: grid; margin: 0; }
  .tabla div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--p-borde); }
  .tabla dt { font-weight: 700; }
  .tabla dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
  .consejo p:first-child { display: flex; gap: 8px; align-items: center; }
  .consejo :global(.p-icono) { color: #c98a14; }
</style>
