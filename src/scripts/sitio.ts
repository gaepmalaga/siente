// JavaScript común a todas las páginas. Es poco y opcional: sin él la web se
// lee y funciona igual (enlaces a teléfono, WhatsApp y mapa son HTML normal).

type Tramo = { abre: string; cierra: string };
type Horario = Record<string, Tramo[]>;

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const NOMBRES: Record<string, string> = {
  lunes: 'el lunes',
  martes: 'el martes',
  miercoles: 'el miércoles',
  jueves: 'el jueves',
  viernes: 'el viernes',
  sabado: 'el sábado',
  domingo: 'el domingo',
};

const minutos = (h: string) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

/** Día y minuto actuales en Madrid, se mire desde donde se mire. */
function ahoraEnMadrid() {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const valor = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(valor('weekday'));
  return { dia, minuto: Number(valor('hour')) * 60 + Number(valor('minute')) };
}

export function estadoApertura(horario: Horario) {
  const { dia, minuto } = ahoraEnMadrid();
  const hoy = horario[DIAS[dia]] ?? [];
  const abierto = hoy.find((t) => minuto >= minutos(t.abre) && minuto < minutos(t.cierra));
  if (abierto) {
    const quedan = minutos(abierto.cierra) - minuto;
    return {
      abierto: true,
      texto: quedan <= 30 ? `Abierto · cierra en ${quedan} min` : `Abierto ahora · hasta las ${abierto.cierra}`,
    };
  }
  const luego = hoy.find((t) => minutos(t.abre) > minuto);
  if (luego) return { abierto: false, texto: `Cerrado · abrimos hoy a las ${luego.abre}` };
  for (let i = 1; i <= 7; i++) {
    const nombre = DIAS[(dia + i) % 7];
    const tramos = horario[nombre] ?? [];
    if (tramos.length) {
      const cuando = i === 1 ? 'mañana' : NOMBRES[nombre];
      return { abierto: false, texto: `Cerrado · abrimos ${cuando} a las ${tramos[0].abre}` };
    }
  }
  return { abierto: false, texto: 'Cerrado' };
}

function pintarEstado() {
  const datos = document.getElementById('horario-datos');
  if (!datos?.textContent) return;
  const horario = JSON.parse(datos.textContent) as Horario;
  const pintar = () => {
    const { abierto, texto } = estadoApertura(horario);
    document.querySelectorAll<HTMLElement>('[data-estado]').forEach((el) => {
      el.dataset.abierto = String(abierto);
      const t = el.querySelector('[data-estado-texto]');
      if (t) t.textContent = texto;
      el.hidden = false;
    });
    // Resalta el día de hoy en las tablas de horario.
    const { dia } = ahoraEnMadrid();
    document.querySelectorAll<HTMLElement>('[data-dias]').forEach((fila) => {
      fila.classList.toggle('hoy', (fila.dataset.dias ?? '').split(',').includes(DIAS[dia]));
    });
  };
  pintar();
  setInterval(pintar, 60_000);
}

function tamanoTexto() {
  const raiz = document.documentElement;
  document.querySelectorAll<HTMLButtonElement>('[data-texto-opcion]').forEach((boton) => {
    const marcar = () =>
      boton.setAttribute('aria-pressed', String((raiz.dataset.texto ?? 'normal') === boton.dataset.textoOpcion));
    marcar();
    boton.addEventListener('click', () => {
      const valor = boton.dataset.textoOpcion ?? 'normal';
      if (valor === 'normal') delete raiz.dataset.texto;
      else raiz.dataset.texto = valor;
      try {
        localStorage.setItem('siente-texto', valor);
      } catch {
        /* modo privado: no pasa nada */
      }
      document.querySelectorAll<HTMLButtonElement>('[data-texto-opcion]').forEach((b) =>
        b.setAttribute('aria-pressed', String((raiz.dataset.texto ?? 'normal') === b.dataset.textoOpcion)),
      );
    });
  });
}

function menuMovil() {
  const dialogo = document.getElementById('menu-movil') as HTMLDialogElement | null;
  if (!dialogo) return;
  document.querySelectorAll('[data-abrir-menu]').forEach((b) =>
    b.addEventListener('click', () => {
      dialogo.showModal();
      document.documentElement.classList.add('menu-abierto');
    }),
  );
  dialogo.addEventListener('close', () => document.documentElement.classList.remove('menu-abierto'));
  dialogo.querySelectorAll('[data-cerrar-menu], a').forEach((el) => el.addEventListener('click', () => dialogo.close()));
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close();
  });
}

function cabeceraConScroll() {
  const cabecera = document.querySelector<HTMLElement>('[data-cabecera]');
  if (!cabecera) return;
  const actualizar = () => cabecera.classList.toggle('con-scroll', window.scrollY > 8);
  actualizar();
  window.addEventListener('scroll', actualizar, { passive: true });
}

function aparecer() {
  const elementos = document.querySelectorAll('[data-aparecer]');
  if (!('IntersectionObserver' in window)) {
    elementos.forEach((el) => el.classList.add('visible'));
    return;
  }
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observador.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  elementos.forEach((el) => observador.observe(el));
}

pintarEstado();
tamanoTexto();
menuMovil();
cabeceraConScroll();
aparecer();
