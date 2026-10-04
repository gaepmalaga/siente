import { iniciarCookies } from './analitica';
import { estadoApertura, ahoraEnMadrid, cierreEn, formatoTramo, avisoVigente, type HorarioSemana, type Cierre } from '../lib/horario';

// JavaScript común a todas las páginas. Es poco y opcional: sin él la web se
// lee y funciona igual (enlaces a teléfono, WhatsApp y mapa son HTML normal).

type DatosHorario = { dias: HorarioSemana; cierres: Cierre[] };

function pintarEstado() {
  const datos = document.getElementById('horario-datos');
  if (!datos?.textContent) return;
  const { dias, cierres } = JSON.parse(datos.textContent) as DatosHorario;
  const pintar = () => {
    const { abierto, texto } = estadoApertura(dias, cierres);
    document.querySelectorAll<HTMLElement>('[data-estado]').forEach((el) => {
      el.dataset.abierto = String(abierto);
      const t = el.querySelector('[data-estado-texto]');
      if (t) t.textContent = texto;
      el.hidden = false;
    });
    // Horario de hoy y día resaltado en las tablas de horario.
    const { iso, dia } = ahoraEnMadrid();
    const hoy = cierreEn(cierres, iso) ? [] : dias[dia];
    document.querySelectorAll<HTMLElement>('[data-horario-hoy]').forEach((el) => {
      el.textContent = hoy.length ? `Hoy: ${hoy.map(formatoTramo).join(' · ')}` : 'Hoy cerrado';
      el.hidden = false;
    });
    document.querySelectorAll<HTMLElement>('[data-dias]').forEach((fila) => {
      fila.classList.toggle('hoy', (fila.dataset.dias ?? '').split(',').includes(dia));
    });
  };
  pintar();
  setInterval(pintar, 60_000);
}

// Avisos programados (vacaciones, festivos, promociones): la web es estática,
// así que es el navegador el que decide si hoy toca mostrarlos.
function avisosProgramados() {
  const { iso } = ahoraEnMadrid();
  document.querySelectorAll<HTMLElement>('[data-aviso]').forEach((el) => {
    const desde = el.dataset.desde || undefined;
    const hasta = el.dataset.hasta || undefined;
    el.hidden = !avisoVigente({ texto: '', desde, hasta }, iso);
  });
  document.querySelectorAll<HTMLElement>('[data-avisos]').forEach((barra) => {
    barra.hidden = !barra.querySelector('[data-aviso]:not([hidden])');
  });
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

// Cuenta atrás de fechas límite (Plan VEO): actualiza los días y oculta el
// bloque cuando la fecha ha pasado, aunque la web no se haya recompilado.
function cuentaAtras() {
  document.querySelectorAll<HTMLElement>('[data-fin]').forEach((bloque) => {
    const fin = new Date(`${bloque.dataset.fin}T23:59:59+01:00`).getTime();
    const dias = Math.ceil((fin - Date.now()) / 86_400_000);
    if (dias < 0) {
      bloque.hidden = true;
      return;
    }
    bloque.querySelectorAll('[data-pv-dias]').forEach((n) => (n.textContent = String(dias)));
  });
}

pintarEstado();
avisosProgramados();
cuentaAtras();
iniciarCookies();
tamanoTexto();
menuMovil();
cabeceraConScroll();
aparecer();
