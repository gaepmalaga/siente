<script lang="ts">
  import { onMount } from 'svelte';
  import Icono from '../componentes/Icono.svelte';
  import { estado } from '../lib/estado.svelte';
  import { RUTAS } from '../lib/backend';
  import { AlmacenMemoria, ErrorAgenda, HuecoOcupado, type Almacen, type Cita } from '../../lib/agenda';
  import { celdasDeCita, huecosDelDia, idCelda, type Entorno } from '../../lib/citas';
  import { ahoraEnMadrid, diaDeFecha, fechaLarga, NOMBRE_DIA, porDia, sumarDias } from '../../lib/horario';
  import type { DatosCitas, DatosNegocio } from '../../lib/esquemas';

  const config = $derived(estado.json<DatosCitas>(RUTAS.citas));
  const negocio = $derived(estado.json<DatosNegocio>(RUTAS.negocio));
  const hoy = ahoraEnMadrid().iso;

  let almacen = $state<Almacen | null>(null);
  let correo = $state<string | null>(null);
  let citas = $state<Cita[]>([]);
  let cargando = $state(true);
  let error = $state('');
  let rango = $state<'hoy' | 'semana' | 'todas'>('semana');
  let verCanceladas = $state(false);
  let formulario = $state(false);

  // Cita a mano
  let nuevoTipo = $state('');
  let nuevoDia = $state(hoy);
  let nuevaHora = $state('');
  let nuevoNombre = $state('');
  let nuevoTelefono = $state('');
  let nuevoNota = $state('');
  let guardando = $state(false);

  // Demostración: datos de mentira para enseñar la agenda sin tocar nada real.
  function semilla(): Cita[] {
    const cfg = estado.json<DatosCitas>(RUTAS.citas);
    const mk = (n: number, dias: number, hora: string, tipo: number, nombre: string, tel: string, nota = ''): Cita => {
      const t = cfg.tipos[tipo % cfg.tipos.length];
      const fecha = sumarDias(hoy, dias);
      const [h, m] = hora.split(':').map(Number);
      return {
        id: `demo-${n}`, tipo: t.id, tipoNombre: t.nombre, fecha, hora, duracion: t.duracion, puesto: 0, nombre, telefono: tel, email: '', nota,
        estado: 'confirmada', origen: n % 3 === 0 ? 'manual' : 'web', creada: Date.now() - n * 3_600_000,
        celdas: celdasDeCita(cfg, t, fecha, h * 60 + m, 0),
      };
    };
    return [mk(1, 1, '10:30', 0, 'Carmen García', '612345678'), mk(2, 1, '17:00', 5, 'Luis Ortega', '698765432', 'Viene con su madre'), mk(3, 3, '11:00', 1, 'Ana Ruiz', '655443322')];
  }

  async function abrir() {
    cargando = true;
    error = '';
    try {
      if (estado.modo === 'demo') almacen = new AlmacenMemoria(semilla());
      else if (!config.firebase) throw new ErrorAgenda('Faltan los datos de Firebase en «Tipos de cita y huecos».', 'configuracion');
      else {
        const { AlmacenFirebase } = await import('../../lib/agenda-firebase');
        almacen = new AlmacenFirebase(config.firebase);
      }
      correo = await almacen.correo();
      if (correo) await recargar();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      cargando = false;
    }
  }
  onMount(abrir);

  async function recargar() {
    if (!almacen) return;
    error = '';
    try {
      citas = await almacen.citasDesde(sumarDias(hoy, -30));
    } catch (e) {
      error = e instanceof ErrorAgenda && e.causa === 'permisos' ? 'Esta cuenta no tiene permiso para ver la agenda. Revisa que su correo esté en las reglas de Firestore.' : (e as Error).message;
    }
  }
  async function entrar() {
    if (!almacen) return;
    error = '';
    try {
      correo = await almacen.entrar();
      await recargar();
    } catch (e) {
      error = (e as Error).message;
    }
  }
  async function salir() {
    await almacen?.salir();
    correo = null;
    citas = [];
  }

  const visibles = $derived.by(() => {
    const hasta = rango === 'hoy' ? hoy : rango === 'semana' ? sumarDias(hoy, 7) : '9999-12-31';
    return citas
      .filter((c) => c.fecha >= hoy && c.fecha <= hasta && (verCanceladas || c.estado === 'confirmada'))
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  });
  const porDias = $derived.by(() => {
    const mapa = new Map<string, Cita[]>();
    for (const c of visibles) mapa.set(c.fecha, [...(mapa.get(c.fecha) ?? []), c]);
    return [...mapa.entries()];
  });
  const deHoy = $derived(citas.filter((c) => c.fecha === hoy && c.estado === 'confirmada').length);
  const proximas = $derived(citas.filter((c) => c.fecha > hoy && c.estado === 'confirmada').length);

  const etiquetaDia = (iso: string) => (iso === hoy ? 'Hoy' : iso === sumarDias(hoy, 1) ? 'Mañana' : NOMBRE_DIA[diaDeFecha(iso)]) + ` · ${fechaLarga(iso)}`;
  const soloDigitos = (t: string) => t.replace(/\D/g, '');

  async function cancelar(c: Cita) {
    if (!almacen || !confirm(`¿Cancelar la cita de ${c.nombre} (${c.tipoNombre}, ${fechaLarga(c.fecha)} a las ${c.hora})? Si quieres, avísale por teléfono o WhatsApp.`)) return;
    try {
      await almacen.cancelar(c);
      estado.aviso('Cita cancelada. El hueco vuelve a estar libre.', 'ok');
      await recargar();
    } catch (e) {
      estado.aviso((e as Error).message, 'error');
    }
  }

  // Huecos libres para añadir a mano (sin límite de antelación, sí con lo ya reservado).
  const entorno = $derived<Entorno>({
    citas: { ...config, antelacionHoras: 0, maxDias: 365 },
    semanaCentro: porDia(negocio.horario),
    cierres: negocio.cierres,
    ocupadas: new Set(citas.filter((c) => c.estado === 'confirmada').flatMap((c) => c.celdas)),
  });
  const tipoNuevo = $derived(config.tipos.find((t) => t.id === nuevoTipo) ?? config.tipos[0]);
  const horasNuevas = $derived(tipoNuevo && nuevoDia ? huecosDelDia(entorno, tipoNuevo, nuevoDia) : []);
  $effect(() => {
    if (!horasNuevas.some((h) => h.hora === nuevaHora)) nuevaHora = horasNuevas[0]?.hora ?? '';
  });

  async function crearAMano() {
    const hueco = horasNuevas.find((h) => h.hora === nuevaHora);
    if (!almacen || !tipoNuevo || !hueco) return;
    if (!nuevoNombre.trim()) return estado.aviso('Escribe el nombre.', 'error');
    guardando = true;
    try {
      await almacen.reservar(
        { tipo: tipoNuevo.id, tipoNombre: tipoNuevo.nombre, fecha: nuevoDia, hora: hueco.hora, duracion: tipoNuevo.duracion, puesto: hueco.puesto, nombre: nuevoNombre.trim(), telefono: nuevoTelefono.trim(), email: '', nota: nuevoNota.trim(), origen: 'manual' },
        celdasDeCita(config, tipoNuevo, nuevoDia, hueco.minutos, hueco.puesto),
      );
      estado.aviso('Cita añadida.', 'ok');
      nuevoNombre = nuevoTelefono = nuevoNota = '';
      formulario = false;
      await recargar();
    } catch (e) {
      estado.aviso(e instanceof HuecoOcupado ? 'Ese hueco acaba de ocuparse. Elige otra hora.' : (e as Error).message, 'error');
      await recargar();
    } finally {
      guardando = false;
    }
  }
</script>

<div class="p-vista">
  <header class="p-vista-cab">
    <div>
      <h1>Agenda de citas</h1>
      <p>Las citas que reservan los clientes desde la web, en tiempo real. Aquí también puedes cancelar o añadir las que te piden por teléfono.</p>
    </div>
    {#if correo}
      <div class="p-acciones">
        <button class="p-btn" type="button" onclick={recargar}><Icono nombre="RefreshCw" /> Actualizar</button>
        <button class="p-btn primario" type="button" onclick={() => (formulario = !formulario)}><Icono nombre="CalendarPlus" /> Añadir cita</button>
      </div>
    {/if}
  </header>

  {#if error}<div class="p-tarjeta"><div class="p-tarjeta-cuerpo errores"><p><Icono nombre="CircleAlert" /> {error}</p></div></div>{/if}

  {#if cargando}
    <div class="p-tarjeta p-vacio"><Icono nombre="Loader" /> Conectando con la agenda…</div>
  {:else if !correo}
    <div class="p-tarjeta p-vacio">
      <Icono nombre="Lock" />
      <strong>Entra con tu cuenta de Google</strong>
      <p>Las citas contienen datos de clientes, así que la agenda pide entrar con uno de los correos del equipo ({config.equipo.length ? config.equipo.length : 'ninguno configurado'}).</p>
      <button class="p-btn primario" type="button" onclick={entrar}><Icono nombre="LogIn" /> Entrar con Google</button>
      <a class="p-ayuda" href="#/citas#conexion">Cómo se configura</a>
    </div>
  {:else}
    <div class="cifras">
      <div class="p-tarjeta"><div class="p-tarjeta-cuerpo"><span class="p-ayuda">Hoy</span><strong class="numero">{deHoy}</strong></div></div>
      <div class="p-tarjeta"><div class="p-tarjeta-cuerpo"><span class="p-ayuda">Próximos días</span><strong class="numero">{proximas}</strong></div></div>
      <div class="p-tarjeta"><div class="p-tarjeta-cuerpo"><span class="p-ayuda">Sesión</span><span class="sesion">{correo} <button class="p-btn fantasma pequeno" type="button" onclick={salir}>Salir</button></span></div></div>
    </div>

    {#if formulario}
      <section class="p-tarjeta">
        <div class="p-tarjeta-cab"><h2><Icono nombre="CalendarPlus" /> Añadir una cita</h2></div>
        <div class="p-tarjeta-cuerpo">
          <div class="p-rejilla tres">
            <label class="p-campo"><span class="p-etiqueta">Cita</span>
              <select class="p-select" bind:value={nuevoTipo}>{#each config.tipos as t (t.id)}<option value={t.id}>{t.nombre}</option>{/each}</select>
            </label>
            <label class="p-campo"><span class="p-etiqueta">Día</span><input class="p-input" type="date" min={hoy} bind:value={nuevoDia} /></label>
            <label class="p-campo"><span class="p-etiqueta">Hora</span>
              <select class="p-select" bind:value={nuevaHora} disabled={!horasNuevas.length}>
                {#each horasNuevas as h (h.hora)}<option value={h.hora}>{h.hora}</option>{/each}
              </select>
              {#if !horasNuevas.length}<span class="p-ayuda">No quedan huecos ese día.</span>{/if}
            </label>
            <label class="p-campo"><span class="p-etiqueta">Nombre</span><input class="p-input" bind:value={nuevoNombre} /></label>
            <label class="p-campo"><span class="p-etiqueta">Teléfono</span><input class="p-input" type="tel" bind:value={nuevoTelefono} /></label>
            <label class="p-campo"><span class="p-etiqueta">Nota <small>opcional</small></span><input class="p-input" bind:value={nuevoNota} /></label>
          </div>
          <div class="p-acciones">
            <button class="p-btn primario" type="button" disabled={guardando || !nuevaHora} onclick={crearAMano}><Icono nombre="Check" /> Guardar cita</button>
            <button class="p-btn fantasma" type="button" onclick={() => (formulario = false)}>Cancelar</button>
          </div>
        </div>
      </section>
    {/if}

    <div class="filtros" role="group" aria-label="Mostrar">
      {#each [['hoy', 'Hoy'], ['semana', 'Próximos 7 días'], ['todas', 'Todas']] as [v, t] (v)}
        <button class="p-btn pequeno" class:primario={rango === v} type="button" aria-pressed={rango === v} onclick={() => (rango = v as typeof rango)}>{t}</button>
      {/each}
      <label class="canceladas"><input type="checkbox" bind:checked={verCanceladas} /> Ver canceladas</label>
    </div>

    {#each porDias as [dia, lista] (dia)}
      <section class="p-tarjeta">
        <div class="p-tarjeta-cab"><h2>{etiquetaDia(dia)}</h2><span class="p-chip">{lista.filter((c) => c.estado === 'confirmada').length} citas</span></div>
        <ul class="lista">
          {#each lista as c (c.id)}
            <li class:cancelada={c.estado === 'cancelada'}>
              <span class="hora">{c.hora}</span>
              <span class="datos">
                <strong>{c.nombre}</strong>
                <small>{c.tipoNombre} · {c.duracion} min{c.puesto > 0 ? ` · puesto ${c.puesto + 1}` : ''}{c.origen === 'manual' ? ' · añadida a mano' : ''}</small>
                {#if c.nota}<small class="nota">«{c.nota}»</small>{/if}
              </span>
              <span class="contacto">
                {#if c.telefono}
                  <a class="p-btn pequeno" href={`tel:${soloDigitos(c.telefono)}`}><Icono nombre="Phone" /> {c.telefono}</a>
                  <a class="p-btn pequeno" href={`https://wa.me/34${soloDigitos(c.telefono).replace(/^34(?=\d{9}$)/, '')}`} target="_blank" rel="noopener"><Icono nombre="MessageCircle" /></a>
                {/if}
                {#if c.estado === 'confirmada'}
                  <button class="p-btn fantasma pequeno peligro" type="button" onclick={() => cancelar(c)}><Icono nombre="CalendarX" /> Cancelar</button>
                {:else}<span class="p-chip error">Cancelada</span>{/if}
              </span>
            </li>
          {/each}
        </ul>
      </section>
    {:else}
      <div class="p-tarjeta p-vacio"><Icono nombre="CalendarDays" /> No hay citas en este periodo.</div>
    {/each}
  {/if}
</div>

<style>
  .cifras { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr)); }
  .numero { display: block; font-size: 2rem; line-height: 1.1; }
  .sesion { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; word-break: break-all; }
  .filtros { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .canceladas { display: flex; align-items: center; gap: 6px; margin-left: auto; font-size: 0.9rem; }
  .lista { display: grid; margin: 0; padding: 0; list-style: none; }
  .lista li { display: grid; grid-template-columns: 64px 1fr; gap: 6px 14px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--p-borde); }
  .lista li:last-child { border-bottom: 0; }
  @media (min-width: 900px) { .lista li { grid-template-columns: 64px 1fr auto; } }
  .lista li.cancelada { opacity: 0.55; }
  .lista li.cancelada .datos strong { text-decoration: line-through; }
  .hora { font-size: 1.15rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .datos { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; min-width: 0; }
  .datos small { color: var(--p-texto-2); }
  .nota { font-style: italic; }
  .contacto { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; grid-column: 2; }
  @media (min-width: 900px) { .contacto { grid-column: 3; justify-content: flex-end; } }
  .errores { color: var(--p-error); font-weight: 700; }
</style>
