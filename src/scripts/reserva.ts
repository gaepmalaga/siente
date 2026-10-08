// Reserva de cita en /pedir-cita/: calendario, horas y datos. Los huecos se
// calculan con src/lib/citas.ts a partir de la configuración de /admin y de las
// celdas ya ocupadas en Firestore (que se descarga solo al entrar aquí).
import { ahoraEnMadrid, diaDeFecha, instanteMadrid, sumarDias, fechaLarga, NOMBRE_DIA, type Cierre, type HorarioSemana } from '../lib/horario';
import { celdasDeCita, diasConHuecos, huecosDelDia, puestoLibre, type Entorno, type Hueco } from '../lib/citas';
import { AlmacenMemoria, ErrorAgenda, HuecoOcupado, type Almacen, type Cita } from '../lib/agenda';
import type { DatosCitas, DatosTipoCita } from '../lib/esquemas';

const form = document.querySelector<HTMLFormElement>('[data-reserva]');
const datosEl = document.getElementById('citas-datos');

const CLAVE_CITAS = 'siente-mis-citas';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

type Datos = { citas: DatosCitas; semanaCentro: HorarioSemana; cierres: Cierre[] };

if (form && datosEl) iniciar(form, JSON.parse(datosEl.textContent || '{}') as Datos);

function misIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CITAS) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function guardarId(id: string) {
  try {
    localStorage.setItem(CLAVE_CITAS, JSON.stringify([...new Set([id, ...misIds()])].slice(0, 20)));
  } catch {
    /* sin almacenamiento: la cita se reserva igual */
  }
}

async function abrirAlmacen(citas: DatosCitas): Promise<Almacen> {
  // Solo en las pruebas automáticas (PUBLIC_CITAS_PRUEBAS=true al compilar).
  if (import.meta.env.PUBLIC_CITAS_PRUEBAS === 'true' && new URLSearchParams(location.search).has('memoria')) return new AlmacenMemoria();
  if (!citas.firebase) throw new ErrorAgenda('Sin configuración de Firebase', 'configuracion');
  const { AlmacenFirebase } = await import('../lib/agenda-firebase');
  return new AlmacenFirebase(citas.firebase);
}

async function iniciar(form: HTMLFormElement, datos: Datos) {
  const q = <T extends HTMLElement>(sel: string) => form.querySelector<T>(sel)!;
  const { citas } = datos;
  const tipoPorId = (id: string) => citas.tipos.find((t) => t.id === id)!;

  const sinReserva = document.querySelector<HTMLElement>('[data-sin-reserva]')!;
  const fallar = () => {
    form.hidden = true;
    sinReserva.hidden = false;
  };

  let almacen: Almacen;
  let ocupadas = new Set<string>();
  const hoy = ahoraEnMadrid().iso;
  const limite = sumarDias(hoy, citas.maxDias);
  try {
    almacen = await abrirAlmacen(citas);
    // Sin conexión con la agenda, mejor ofrecer WhatsApp que dejar la página esperando.
    ocupadas = await Promise.race([
      almacen.ocupadas(hoy, limite),
      new Promise<never>((_, no) => setTimeout(() => no(new ErrorAgenda('La agenda tarda demasiado', 'red')), 10_000)),
    ]);
  } catch (e) {
    console.warn('Reserva online no disponible', e);
    fallar();
    return;
  }

  const entorno = (): Entorno => ({ citas, semanaCentro: datos.semanaCentro, cierres: datos.cierres, ocupadas });
  let tipo: DatosTipoCita = tipoPorId(q<HTMLInputElement>('input[name="tipo"]:checked').value);
  let dias = new Map<string, number>();
  let diaElegido = '';
  let hueco: Hueco | null = null;
  let [anio, mes] = hoy.split('-').map(Number);
  mes -= 1;
  let ultima: Cita | null = null;

  const pasoHoras = q('[data-paso-horas]');
  const pasoDatos = q('[data-paso-datos]');
  const enviar = q('[data-enviar]');
  const cargando = q('[data-cargando]');
  const sinHuecos = q('[data-sin-huecos]');
  const rejilla = q('[data-rejilla]');
  const aviso = q('[data-aviso]');

  const textoDia = (iso: string) => `${NOMBRE_DIA[diaDeFecha(iso)].toLowerCase()} ${fechaLarga(iso)}`;

  function pintarCalendario() {
    q('[data-mes]').textContent = `${MESES[mes]} ${anio}`;
    const primero = new Date(Date.UTC(anio, mes, 1));
    const huecosAntes = (primero.getUTCDay() + 6) % 7;
    const total = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
    rejilla.replaceChildren();
    for (let i = 0; i < huecosAntes; i++) rejilla.append(Object.assign(document.createElement('span'), { className: 'vacio' }));
    for (let d = 1; d <= total; d++) {
      const iso = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const libres = dias.get(iso) ?? 0;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(d);
      b.disabled = !libres;
      b.dataset.iso = iso;
      b.setAttribute('aria-label', libres ? `${textoDia(iso)}, ${libres} huecos libres` : `${textoDia(iso)}, sin huecos`);
      b.setAttribute('aria-pressed', String(iso === diaElegido));
      rejilla.append(b);
    }
    const [ah, am] = hoy.split('-').map(Number);
    const [lh, lm] = limite.split('-').map(Number);
    q<HTMLButtonElement>('[data-mes-anterior]').disabled = anio === ah && mes <= am - 1;
    q<HTMLButtonElement>('[data-mes-siguiente]').disabled = anio === lh && mes >= lm - 1;
  }

  function pintarHoras() {
    const contenedor = q('[data-horas]');
    contenedor.replaceChildren();
    const lista = diaElegido ? huecosDelDia(entorno(), tipo, diaElegido) : [];
    pasoHoras.hidden = !diaElegido;
    q('[data-titulo-horas]').textContent = diaElegido ? `¿A qué hora el ${textoDia(diaElegido)}?` : '¿A qué hora?';
    // Mañana y tarde por separado, para encontrar la hora antes.
    const grupos = [
      { titulo: 'Por la mañana', horas: lista.filter((h) => h.minutos < 14 * 60) },
      { titulo: 'Por la tarde', horas: lista.filter((h) => h.minutos >= 14 * 60) },
    ].filter((g) => g.horas.length);
    for (const g of grupos) {
      const fila = document.createElement('div');
      fila.className = 'horas-grupo';
      const t = document.createElement('p');
      t.className = 'horas-titulo';
      t.textContent = g.titulo;
      fila.append(t);
      for (const h of g.horas) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = h.hora;
        b.dataset.minutos = String(h.minutos);
        b.setAttribute('aria-pressed', String(hueco?.minutos === h.minutos));
        fila.append(b);
      }
      contenedor.append(fila);
    }
    if (hueco && !lista.some((h) => h.minutos === hueco!.minutos)) hueco = null;
    pasoDatos.hidden = enviar.hidden = !hueco;
    if (hueco) q('[data-resumen]').textContent = `${tipo.nombre} · ${textoDia(diaElegido)} a las ${hueco.hora}`;
  }

  function recalcular(mantenerDia = false) {
    dias = diasConHuecos(entorno(), tipo);
    cargando.hidden = true;
    sinHuecos.hidden = dias.size > 0;
    if (!mantenerDia || !dias.has(diaElegido)) {
      diaElegido = '';
      hueco = null;
    }
    // Salta al mes del primer día libre si el mes mostrado no tiene ninguno.
    const primero = [...dias.keys()][0];
    if (primero && !mantenerDia) [anio, mes] = [Number(primero.slice(0, 4)), Number(primero.slice(5, 7)) - 1];
    pintarCalendario();
    pintarHoras();
  }

  // ── Eventos ──────────────────────────────────────────────────────────────

  form.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.name === 'tipo') {
      tipo = tipoPorId(el.value);
      recalcular();
    }
  });
  q('[data-mes-anterior]').addEventListener('click', () => {
    [anio, mes] = mes === 0 ? [anio - 1, 11] : [anio, mes - 1];
    pintarCalendario();
  });
  q('[data-mes-siguiente]').addEventListener('click', () => {
    [anio, mes] = mes === 11 ? [anio + 1, 0] : [anio, mes + 1];
    pintarCalendario();
  });
  rejilla.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-iso]');
    if (!b) return;
    diaElegido = b.dataset.iso!;
    hueco = null;
    pintarCalendario();
    pintarHoras();
    q('[data-horas] button')?.focus();
  });
  q('[data-horas]').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-minutos]');
    if (!b) return;
    const minutos = Number(b.dataset.minutos);
    const libre = puestoLibre(entorno(), tipo, diaElegido, minutos);
    hueco = { hora: b.textContent!, minutos, puesto: Math.max(libre, 0) };
    pintarHoras();
    q<HTMLInputElement>('input[name="nombre"]').focus({ preventScroll: false });
  });

  const errorDe = (campo: string, mostrar: boolean) => {
    const el = form.querySelector<HTMLElement>(`[data-error="${campo}"]`);
    if (el) el.hidden = !mostrar;
    form.querySelector(`[name="${campo}"]`)?.setAttribute('aria-invalid', String(mostrar));
    return mostrar;
  };

  function validar(): boolean {
    const nombre = q<HTMLInputElement>('input[name="nombre"]').value.trim();
    const tel = q<HTMLInputElement>('input[name="telefono"]').value.replace(/[\s.-]/g, '').replace(/^(\+34|0034)/, '');
    const email = q<HTMLInputElement>('input[name="email"]').value.trim();
    const fallos = [
      errorDe('nombre', !nombre),
      errorDe('telefono', !/^[6-9]\d{8}$/.test(tel)),
      errorDe('email', !!email && !/^\S+@\S+\.\S+$/.test(email)),
      errorDe('acepto', !q<HTMLInputElement>('input[name="acepto"]').checked),
    ];
    if (fallos.some(Boolean)) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return !fallos.some(Boolean);
  }

  const mostrarAviso = (texto: string) => {
    aviso.textContent = texto;
    aviso.hidden = !texto;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarAviso('');
    if (!hueco || !diaElegido || !validar()) return;
    // Trampa para robots: un campo invisible que una persona nunca rellena.
    if (q<HTMLInputElement>('input[name="web"]').value) return;
    const boton = q<HTMLButtonElement>('button[type="submit"]');
    boton.disabled = true;
    try {
      const celdas = celdasDeCita(citas, tipo, diaElegido, hueco.minutos, hueco.puesto);
      const cita = await almacen.reservar(
        {
          tipo: tipo.id,
          tipoNombre: tipo.nombre,
          fecha: diaElegido,
          hora: hueco.hora,
          duracion: tipo.duracion,
          puesto: hueco.puesto,
          nombre: q<HTMLInputElement>('input[name="nombre"]').value.trim(),
          telefono: q<HTMLInputElement>('input[name="telefono"]').value.trim(),
          email: q<HTMLInputElement>('input[name="email"]').value.trim(),
          nota: q<HTMLTextAreaElement>('textarea[name="nota"]').value.trim(),
          origen: 'web',
        },
        celdas,
      );
      guardarId(cita.id);
      ultima = cita;
      window.sienteEvento?.('generate_lead', { canal: 'reserva_web', servicio: tipo.id });
      q('[data-hecho-texto]').textContent = `${tipo.nombre}: ${textoDia(cita.fecha)} a las ${cita.hora}, en ${form.dataset.direccion ?? 'el centro'}. Si no puedes venir, cancélala desde aquí.`;
      const hecho = q('[data-hecho]');
      hecho.hidden = false;
      hecho.focus();
      ocupadas = await almacen.ocupadas(hoy, limite).catch(() => ocupadas);
      pintarMisCitas();
    } catch (err) {
      if (err instanceof HuecoOcupado) {
        mostrarAviso('Alguien acaba de coger ese hueco. Elige otra hora, por favor.');
        ocupadas = await almacen.ocupadas(hoy, limite).catch(() => ocupadas);
        hueco = null;
        recalcular(true);
      } else {
        console.warn(err);
        mostrarAviso('No hemos podido reservar tu cita. Inténtalo de nuevo o escríbenos por WhatsApp.');
      }
    } finally {
      boton.disabled = false;
    }
  });

  q('[data-otra]').addEventListener('click', () => {
    q('[data-hecho]').hidden = true;
    form.reset();
    ultima = null;
    recalcular();
    window.scrollTo({ top: form.offsetTop - 120, behavior: 'smooth' });
  });

  // ── Cancelar y calendario ────────────────────────────────────────────────

  async function cancelar(cita: Cita) {
    if (!confirm(`¿Cancelar la cita de ${cita.tipoNombre} del ${textoDia(cita.fecha)} a las ${cita.hora}?`)) return;
    try {
      await almacen.cancelar(cita);
      window.sienteEvento?.('cita_cancelada', { servicio: cita.tipo });
      ocupadas = await almacen.ocupadas(hoy, limite).catch(() => ocupadas);
      if (ultima?.id === cita.id) {
        q('[data-hecho]').hidden = true;
        form.reset();
        ultima = null;
      }
      recalcular(true);
      await pintarMisCitas();
    } catch (err) {
      console.warn(err);
      alert('No hemos podido cancelar la cita. Llámanos y lo hacemos por ti.');
    }
  }
  q('[data-cancelar-ultima]').addEventListener('click', () => ultima && cancelar(ultima));

  function descargarIcs(cita: Cita) {
    const utc = (hora: string) => new Date(instanteMadrid(cita.fecha, hora)).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const [h, m] = cita.hora.split(':').map(Number);
    const fin = h * 60 + m + cita.duracion;
    const horaFin = `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Siente//Citas//ES',
      'BEGIN:VEVENT',
      `UID:${cita.id}@siente`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
      `DTSTART:${utc(cita.hora)}`,
      `DTEND:${utc(horaFin)}`,
      `SUMMARY:${cita.tipoNombre} en Siente`,
      `LOCATION:${form.dataset.direccion ?? 'Siente, Barajas'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'cita-siente.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  q('[data-ics]').addEventListener('click', () => ultima && descargarIcs(ultima));

  const contenedorCitas = document.querySelector<HTMLElement>('[data-mis-citas]')!;
  async function pintarMisCitas() {
    const ids = misIds();
    if (!ids.length) return;
    const futuras = (await almacen.misCitas(ids).catch(() => [])).filter((c) => c.estado === 'confirmada' && c.fecha >= hoy).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    contenedorCitas.hidden = !futuras.length;
    const lista = contenedorCitas.querySelector('[data-lista-citas]')!;
    lista.replaceChildren();
    for (const c of futuras) {
      const li = document.createElement('li');
      const texto = document.createElement('span');
      texto.textContent = `${c.tipoNombre} · ${textoDia(c.fecha)} a las ${c.hora}`;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'boton secundario';
      b.textContent = 'Cancelar';
      b.addEventListener('click', () => cancelar(c));
      li.append(texto, b);
      lista.append(li);
    }
  }

  // Cita preseleccionada desde la URL: /pedir-cita/?servicio=audifonos
  const pedido = new URLSearchParams(location.search).get('servicio');
  const radio = pedido ? form.querySelector<HTMLInputElement>(`input[name="tipo"][value="${CSS.escape(pedido)}"]`) : null;
  if (radio) {
    radio.checked = true;
    tipo = tipoPorId(radio.value);
  }
  recalcular();
  pintarMisCitas();
}
