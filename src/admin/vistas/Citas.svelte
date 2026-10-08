<script lang="ts">
  import { untrack } from 'svelte';
  import Icono from '../componentes/Icono.svelte';
  import Interruptor from '../componentes/Interruptor.svelte';
  import ListaOrdenable from '../componentes/ListaOrdenable.svelte';
  import EditorTramos from '../componentes/EditorTramos.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { clonar, slug } from '../lib/texto';
  import type { NombreIcono } from '../lib/iconos';
  import { Citas as EsquemaCitas, type DatosCitas, type DatosNegocio, type DatosTipoCita } from '../../lib/esquemas';
  import { porDia, DIAS, ahoraEnMadrid, diaDeFecha, fechaLarga, NOMBRE_DIA, type HorarioSemana } from '../../lib/horario';
  import { avisosCitas, celdasNecesarias, diasConHuecos, huecosDelDia, type Entorno } from '../../lib/citas';
  import reglasBase from '../../../firestore.rules?raw';

  const original = estado.json<DatosCitas>(RUTAS.citas);
  const publicado = JSON.parse(estado.originales[RUTAS.citas] ?? 'null');
  let d = $state<DatosCitas>(clonar(original));
  let comun = $state<HorarioSemana>(porDia(original.tramosComunes));
  let propios = $state<Record<string, HorarioSemana>>(Object.fromEntries(original.tipos.map((t) => [t.id, porDia(t.tramos)])));
  let abierto = $state<string | null>(null);
  let previa = $state(original.tipos[0]?.id ?? '');
  let nuevoCorreo = $state('');

  const ICONOS_CITA: NombreIcono[] = ['ScanEye', 'Eye', 'Glasses', 'Layers', 'Baby', 'Ear', 'AudioLines', 'Wrench', 'Gift', 'Headphones', 'Heart', 'Stethoscope', 'MessageCircle'];
  const HUECOS = [5, 10, 15, 20, 30, 45, 60];
  const hoy = ahoraEnMadrid().iso;

  const aTramos = (s: HorarioSemana) => DIAS.flatMap((dia) => s[dia].map((t) => ({ dia, abre: t.abre, cierra: t.cierra })));

  // Cada cambio queda pendiente al momento, como en el resto del panel.
  const actual = $derived<DatosCitas>({
    ...d,
    tramosComunes: aTramos(comun),
    tipos: d.tipos.map((t) => ({ ...t, tramos: t.horarioPropio ? aTramos(propios[t.id] ?? porDia([])) : [] })),
  });
  $effect(() => {
    const nuevo = $state.snapshot(actual);
    untrack(() => estado.fijarJson(RUTAS.citas, nuevo, 'Citas online'));
  });

  const negocio = $derived(estado.json<DatosNegocio>(RUTAS.negocio));
  const semanaCentro = $derived(porDia(negocio.horario));
  const avisos = $derived(avisosCitas(actual, semanaCentro));
  const errores = $derived.by(() => {
    const r = EsquemaCitas.safeParse($state.snapshot(actual));
    return r.success ? [] : r.error.issues.map((i) => i.message);
  });

  // Vista previa: los huecos de los próximos días tal y como los vería un cliente.
  const entorno = $derived<Entorno>({ citas: actual, semanaCentro, cierres: negocio.cierres, ocupadas: new Set() });
  const tipoPrevia = $derived(actual.tipos.find((t) => t.id === previa) ?? actual.tipos[0]);
  const diasPrevia = $derived.by(() => {
    if (!tipoPrevia) return [];
    return [...diasConHuecos(entorno, tipoPrevia).keys()].slice(0, 5).map((iso) => ({
      iso,
      nombre: `${NOMBRE_DIA[diaDeFecha(iso)]} ${fechaLarga(iso)}`,
      horas: huecosDelDia(entorno, tipoPrevia, iso).map((h) => h.hora),
    }));
  });

  function nueva() {
    const base = 'nueva-cita';
    let id = base;
    for (let n = 2; d.tipos.some((t) => t.id === id); n++) id = `${base}-${n}`;
    const tipo: DatosTipoCita = { id, nombre: 'Nueva cita', detalle: '', icono: 'Eye', duracion: 30, activo: true, horarioPropio: false, tramos: [] };
    propios[id] = porDia([]);
    d.tipos.push(tipo);
    abierto = id;
  }
  function renombrar(t: DatosTipoCita) {
    // El identificador se fija al crear la cita y no cambia al renombrarla; solo se ajusta
    // mientras sigue llamándose «nueva-cita» para que sea legible.
    if (!/^nueva-cita(-\d+)?$/.test(t.id) || !t.nombre.trim()) return;
    const viejo = t.id;
    let id = slug(t.nombre) || 'cita';
    for (let n = 2; d.tipos.some((o) => o !== t && o.id === id); n++) id = `${slug(t.nombre)}-${n}`;
    if (id === viejo) return;
    propios[id] = propios[viejo];
    delete propios[viejo];
    if (abierto === viejo) abierto = id;
    if (previa === viejo) previa = id;
    t.id = id;
  }
  function quitar(id: string) {
    const t = d.tipos.find((x) => x.id === id);
    if (!t || !confirm(`¿Quitar «${t.nombre}»? Las citas ya reservadas no se tocan. Si solo quieres dejar de ofrecerla, mejor apágala.`)) return;
    d.tipos = d.tipos.filter((x) => x.id !== id);
    if (abierto === id) abierto = null;
  }
  function anadirCorreo() {
    const c = nuevoCorreo.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(c)) return estado.aviso('Escribe un correo válido.', 'error');
    if (!d.equipo.includes(c)) d.equipo.push(c);
    nuevoCorreo = '';
  }

  const reglas = $derived(
    reglasBase.replace(/\[\s*'CORREO-DEL-EQUIPO@gmail\.com'\s*\]/, `[${d.equipo.length ? d.equipo.map((c) => `\n          '${c}'`).join(',') + '\n        ' : ''}]`),
  );
  async function copiarReglas() {
    await navigator.clipboard.writeText(reglas);
    estado.aviso('Reglas copiadas. Pégalas en Firebase → Firestore → Reglas y pulsa Publicar.', 'ok');
  }
  const consola = $derived(d.firebase ? `https://console.firebase.google.com/project/${d.firebase.projectId}` : '');
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Tipos de cita y huecos</h1>
      <p>Decide qué citas se pueden reservar en la web, cuándo y con qué tiempo entre ellas. Los clientes solo ven las horas que están libres.</p>
    </div>
  </header>

  <div class="p-dos-columnas">
    <div class="principal">
      <section class="p-tarjeta">
        <div class="p-tarjeta-cuerpo">
          <Interruptor
            bind:activo={d.activo}
            etiqueta="Reserva online activada"
            ayuda="Apagada, la web no ofrece reservar y lleva a WhatsApp o al teléfono."
          />
        </div>
      </section>

      <!-- AJUSTES COMUNES -->
      <section class="p-tarjeta" id="ajustes">
        <div class="p-tarjeta-cab"><h2><Icono nombre="Clock" /> Ajustes comunes</h2></div>
        <div class="p-tarjeta-cuerpo">
          <div class="p-rejilla tres">
            <label class="p-campo">
              <span class="p-etiqueta">Descanso entre citas <small>minutos</small></span>
              <input class="p-input" type="number" min="0" max="120" step="5" bind:value={d.descanso} />
              <span class="p-ayuda">Tiempo libre que se reserva tras cada cita.</span>
            </label>
            <label class="p-campo">
              <span class="p-etiqueta">Una cita puede empezar cada <small>minutos</small></span>
              <select class="p-select" bind:value={d.hueco}>
                {#each HUECOS as h (h)}<option value={h}>{h} min</option>{/each}
              </select>
              <span class="p-ayuda">Más pequeño = más horas para elegir.</span>
            </label>
            <label class="p-campo">
              <span class="p-etiqueta">Personas atendiendo a la vez</span>
              <input class="p-input" type="number" min="1" max="9" bind:value={d.simultaneas} />
              <span class="p-ayuda">Con 2, se pueden reservar dos citas en la misma hora.</span>
            </label>
            <label class="p-campo">
              <span class="p-etiqueta">Antelación mínima <small>horas</small></span>
              <input class="p-input" type="number" min="0" max="720" bind:value={d.antelacionHoras} />
              <span class="p-ayuda">No se puede reservar con menos tiempo que este.</span>
            </label>
            <label class="p-campo">
              <span class="p-etiqueta">Se puede reservar hasta <small>días por delante</small></span>
              <input class="p-input" type="number" min="1" max="365" bind:value={d.maxDias} />
            </label>
          </div>
          <p class="p-ayuda">Las citas se confirman automáticamente. Los cierres y vacaciones de «Horario y avisos» bloquean esos días solos.</p>
        </div>
      </section>

      <!-- HORARIO COMÚN -->
      <section class="p-tarjeta" id="horario">
        <div class="p-tarjeta-cab"><h2><Icono nombre="CalendarClock" /> Horario de las citas</h2></div>
        <div class="p-tarjeta-cuerpo">
          <div class="opciones" role="radiogroup" aria-label="Horario común">
            <label class:marcada={d.horarioComun === 'centro'}>
              <input type="radio" bind:group={d.horarioComun} value="centro" />
              <span><strong>El del centro</strong><small>Todas las citas, en el horario de apertura.</small></span>
            </label>
            <label class:marcada={d.horarioComun === 'propio'}>
              <input type="radio" bind:group={d.horarioComun} value="propio" />
              <span><strong>Uno propio para todas</strong><small>Por ejemplo, solo por las tardes.</small></span>
            </label>
          </div>
          {#if d.horarioComun === 'propio'}
            <EditorTramos bind:semana={comun} />
          {/if}
          <p class="p-ayuda">Cada cita puede además tener su propio horario, más abajo.</p>
        </div>
      </section>

      <!-- TIPOS -->
      <section class="p-tarjeta" id="tipos">
        <div class="p-tarjeta-cab">
          <h2><Icono nombre="CalendarCheck" /> Tipos de cita</h2>
          <button class="p-btn pequeno primario" type="button" onclick={nueva}><Icono nombre="Plus" /> Nueva cita</button>
        </div>
        <div class="p-tarjeta-cuerpo">
          <ListaOrdenable bind:items={d.tipos} apilado>
            {#snippet fila(t: DatosTipoCita)}
              <div class="tipo" class:apagada={!t.activo}>
                <div class="tipo-cab">
                  <span class="tipo-icono"><Icono nombre={(ICONOS_CITA.includes(t.icono as NombreIcono) ? t.icono : 'Eye') as NombreIcono} /></span>
                  <button class="tipo-titulo" type="button" onclick={() => (abierto = abierto === t.id ? null : t.id)} aria-expanded={abierto === t.id}>
                    <strong>{t.nombre}</strong>
                    <small>
                      {t.duracion} min{t.detalle ? ` · ${t.detalle}` : ''} · {t.horarioPropio ? 'horario propio' : d.horarioComun === 'propio' ? 'horario común' : 'horario del centro'}
                    </small>
                  </button>
                  <Interruptor compacto etiqueta={t.activo ? 'Activa' : 'Pausada'} bind:activo={t.activo} />
                  <button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Editar" onclick={() => (abierto = abierto === t.id ? null : t.id)}>
                    <Icono nombre={abierto === t.id ? 'ChevronUp' : 'Pencil'} />
                  </button>
                </div>
                {#if abierto === t.id}
                  <div class="tipo-cuerpo">
                    <div class="p-rejilla dos">
                      <label class="p-campo"><span class="p-etiqueta">Nombre</span><input class="p-input" bind:value={t.nombre} onblur={() => renombrar(t)} /></label>
                      <label class="p-campo"><span class="p-etiqueta">Detalle <small>opcional</small></span><input class="p-input" bind:value={t.detalle} placeholder="Gratis, Hasta 100 €…" /></label>
                      <label class="p-campo">
                        <span class="p-etiqueta">Duración <small>minutos</small></span>
                        <input class="p-input" type="number" min="5" max="240" step="5" bind:value={t.duracion} />
                        <span class="p-ayuda">Ocupa {celdasNecesarias(actual, t)} {celdasNecesarias(actual, t) === 1 ? 'hueco' : 'huecos'} contando el descanso.</span>
                      </label>
                      <div class="p-campo">
                        <span class="p-etiqueta">Icono</span>
                        <div class="iconos">
                          {#each ICONOS_CITA as i (i)}
                            <button type="button" class="icono-opcion" class:marcado={t.icono === i} aria-label={i} aria-pressed={t.icono === i} onclick={() => (t.icono = i)}><Icono nombre={i} /></button>
                          {/each}
                        </div>
                      </div>
                    </div>
                    <Interruptor
                      bind:activo={t.horarioPropio}
                      etiqueta="Horario propio para esta cita"
                      ayuda="Apagado, usa el horario común. Útil para, por ejemplo, audiología solo martes y jueves."
                      onchange={(v) => v && (propios[t.id] ??= porDia([]))}
                    />
                    {#if t.horarioPropio}
                      {#if propios[t.id]}<EditorTramos bind:semana={propios[t.id]} />{/if}
                    {/if}
                    <div class="p-acciones">
                      <button class="p-btn fantasma pequeno peligro" type="button" onclick={() => quitar(t.id)}><Icono nombre="Trash2" /> Quitar esta cita</button>
                    </div>
                  </div>
                {/if}
              </div>
            {/snippet}
          </ListaOrdenable>
          {#if !d.tipos.length}<div class="p-vacio"><Icono nombre="CalendarDays" /> Aún no hay ninguna cita. Crea la primera.</div>{/if}
          {#each [...avisos, ...errores] as a (a)}<p class="p-error-campo"><Icono nombre="CircleAlert" /> {a}</p>{/each}
        </div>
      </section>

      <!-- CONEXIÓN -->
      <section class="p-tarjeta" id="conexion">
        <div class="p-tarjeta-cab"><h2><Icono nombre="KeyRound" /> Conexión con Firebase y equipo</h2></div>
        <div class="p-tarjeta-cuerpo">
          <p class="p-ayuda">
            Las reservas se guardan en Firestore, el proyecto <strong>{d.firebase?.projectId ?? '(sin configurar)'}</strong>. Estos son los pasos que hay que hacer una sola vez en la consola de Firebase:
          </p>
          <ol class="pasos">
            <li>En <strong>Authentication → Método de acceso</strong>, activa <strong>Anónimo</strong> y <strong>Google</strong>. En <em>Configuración → Dominios autorizados</em> añade el dominio de la web y el del panel.</li>
            <li>Escribe aquí abajo los correos de Google de quienes gestionan la agenda.</li>
            <li>Copia las reglas y pégalas en <strong>Firestore Database → Reglas</strong>; pulsa Publicar.</li>
          </ol>
          <div class="equipo">
            <span class="p-etiqueta">Correos del equipo</span>
            <ul>
              {#each d.equipo as c, i (c)}
                <li>{c} <button class="p-btn fantasma solo-icono pequeno" type="button" aria-label={`Quitar ${c}`} onclick={() => d.equipo.splice(i, 1)}><Icono nombre="X" /></button></li>
              {/each}
            </ul>
            <div class="nuevo-correo">
              <input class="p-input" type="email" placeholder="persona@gmail.com" bind:value={nuevoCorreo} onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), anadirCorreo())} />
              <button class="p-btn" type="button" onclick={anadirCorreo}><Icono nombre="Plus" /> Añadir</button>
            </div>
            {#if !d.equipo.length}<p class="p-error-campo"><Icono nombre="CircleAlert" /> Sin ningún correo nadie podrá ver la agenda.</p>{/if}
          </div>
          <div class="p-acciones">
            <button class="p-btn primario" type="button" onclick={copiarReglas}><Icono nombre="Copy" /> Copiar las reglas</button>
            {#if consola}<a class="p-btn" href={`${consola}/firestore/rules`} target="_blank" rel="noopener"><Icono nombre="ExternalLink" /> Abrir Firebase</a>{/if}
          </div>
          <p class="p-ayuda">Cuando cambies los correos del equipo, vuelve a copiar y publicar las reglas.</p>
        </div>
      </section>
    </div>

    <!-- VISTA PREVIA -->
    <aside class="p-lateral-fijo lateral">
      <section class="p-tarjeta">
        <div class="p-tarjeta-cab"><h2><Icono nombre="Eye" /> Así lo verá el cliente</h2></div>
        <div class="p-tarjeta-cuerpo">
          <label class="p-campo">
            <span class="p-etiqueta">Cita</span>
            <select class="p-select" bind:value={previa}>
              {#each d.tipos as t (t.id)}<option value={t.id}>{t.nombre}</option>{/each}
            </select>
          </label>
          {#if !actual.activo}
            <p class="p-ayuda">La reserva está apagada: ahora mismo la web lleva a WhatsApp.</p>
          {:else if !tipoPrevia?.activo}
            <p class="p-ayuda">Esta cita está pausada y no se ofrece.</p>
          {:else if !diasPrevia.length}
            <p class="p-ayuda">Sin huecos en los próximos días: revisa el horario y los cierres.</p>
          {:else}
            {#each diasPrevia as dia (dia.iso)}
              <div class="dia-previa">
                <strong>{dia.nombre}</strong>
                <div class="horas">{#each dia.horas as h (h)}<span>{h}</span>{/each}</div>
              </div>
            {/each}
          {/if}
          <p class="p-ayuda">Desde hoy ({fechaLarga(hoy)}), sin tener en cuenta las citas ya reservadas.</p>
        </div>
      </section>
    </aside>
  </div>
</div>

<style>
  .principal { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .opciones { display: grid; gap: 10px; }
  @media (min-width: 720px) { .opciones { grid-template-columns: 1fr 1fr; } }
  .opciones label { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border: 1px solid var(--p-borde); border-radius: 12px; cursor: pointer; }
  .opciones label.marcada { border-color: var(--p-roble); background: var(--p-superficie-2); }
  .opciones span { display: grid; gap: 2px; }
  .opciones small { color: var(--p-texto-2); }
  .tipo { border: 1px solid var(--p-borde); border-radius: 12px; background: var(--p-superficie); }
  .tipo.apagada { opacity: 0.7; }
  .tipo-cab { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; padding: 8px 10px; }
  .tipo-icono { display: grid; place-items: center; width: 38px; height: 38px; flex: none; border-radius: 10px; background: var(--p-superficie-2); color: var(--p-roble); }
  .tipo-titulo { flex: 1 1 150px; min-width: 0; display: grid; gap: 1px; text-align: left; border: 0; background: none; font: inherit; cursor: pointer; padding: 0; }
  .tipo-titulo small { color: var(--p-texto-2); }
  .tipo-cuerpo { display: grid; gap: 14px; padding: 14px; border-top: 1px solid var(--p-borde); }
  .iconos { display: flex; flex-wrap: wrap; gap: 6px; }
  .icono-opcion { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--p-borde); background: var(--p-superficie); cursor: pointer; }
  .icono-opcion.marcado { border-color: var(--p-roble); background: var(--p-superficie-2); box-shadow: 0 0 0 3px rgb(185 132 79 / 0.2); }
  .pasos { margin: 0; padding-left: 20px; display: grid; gap: 6px; font-size: 0.92rem; }
  .equipo { display: grid; gap: 8px; }
  .equipo ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .equipo li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 4px 4px 12px; border: 1px solid var(--p-borde); border-radius: 10px; }
  .nuevo-correo { display: flex; gap: 8px; }
  .nuevo-correo .p-input { flex: 1; }
  .lateral { display: grid; gap: 20px; }
  .dia-previa { display: grid; gap: 6px; padding: 8px 0; border-bottom: 1px solid var(--p-borde); }
  .horas { display: flex; flex-wrap: wrap; gap: 4px; }
  .horas span { padding: 2px 8px; border-radius: 999px; background: var(--p-superficie-2); border: 1px solid var(--p-borde); font-variant-numeric: tabular-nums; font-size: 0.85rem; }
  .p-error-campo { display: flex; gap: 6px; align-items: center; margin: 0; }
</style>
