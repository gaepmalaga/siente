// Agenda de citas: tipos, errores y un almacén en memoria (modo demostración y
// pruebas). El almacén real, con Firestore, está en agenda-firebase.ts y se
// carga solo cuando hace falta.

export type EstadoCita = 'confirmada' | 'cancelada';

export type Cita = {
  id: string;
  /** Identificador del tipo de cita (src/data/citas.json). */
  tipo: string;
  tipoNombre: string;
  fecha: string;
  hora: string;
  duracion: number;
  puesto: number;
  nombre: string;
  telefono: string;
  email: string;
  nota: string;
  estado: EstadoCita;
  origen: 'web' | 'manual';
  /** Milisegundos desde 1970. */
  creada: number;
  /** Celdas de agenda que ocupa (se liberan al cancelar). */
  celdas: string[];
};

export type NuevaCita = Omit<Cita, 'id' | 'estado' | 'creada' | 'celdas'>;

export class HuecoOcupado extends Error {
  constructor() {
    super('Alguien acaba de coger ese hueco.');
  }
}

export class ErrorAgenda extends Error {
  constructor(
    mensaje: string,
    public causa: 'red' | 'permisos' | 'configuracion' | 'otro' = 'otro',
  ) {
    super(mensaje);
  }
}

export interface Almacen {
  modo: 'firebase' | 'memoria';
  /** Identificadores de las celdas ocupadas entre dos días (ambos incluidos). */
  ocupadas(desde: string, hasta: string): Promise<Set<string>>;
  /** Guarda la cita y ocupa sus celdas de una vez; si alguna ya está cogida, lanza HuecoOcupado. */
  reservar(cita: NuevaCita, celdas: string[]): Promise<Cita>;
  /** Citas propias de este navegador (para poder cancelarlas). */
  misCitas(ids: string[]): Promise<Cita[]>;
  cancelar(cita: Cita): Promise<void>;
  // Solo para el equipo (requieren entrar con Google).
  correo(): Promise<string | null>;
  entrar(): Promise<string>;
  salir(): Promise<void>;
  citasDesde(fecha: string): Promise<Cita[]>;
}

const aleatorio = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

export class AlmacenMemoria implements Almacen {
  modo = 'memoria' as const;
  private citas: Cita[] = [];
  private celdas = new Set<string>();
  private conectado = false;

  constructor(semilla: Cita[] = []) {
    for (const c of semilla) {
      this.citas.push(c);
      if (c.estado === 'confirmada') c.celdas.forEach((id) => this.celdas.add(id));
    }
  }

  async ocupadas(desde: string, hasta: string) {
    return new Set([...this.celdas].filter((id) => id.slice(0, 10) >= desde && id.slice(0, 10) <= hasta));
  }

  async reservar(datos: NuevaCita, celdas: string[]) {
    if (celdas.some((id) => this.celdas.has(id))) throw new HuecoOcupado();
    const cita: Cita = { ...datos, id: aleatorio(), estado: 'confirmada', creada: Date.now(), celdas };
    this.citas.push(cita);
    celdas.forEach((id) => this.celdas.add(id));
    return structuredClone(cita);
  }

  async misCitas(ids: string[]) {
    return structuredClone(this.citas.filter((c) => ids.includes(c.id)));
  }

  async cancelar(cita: Cita) {
    const c = this.citas.find((x) => x.id === cita.id);
    if (!c) return;
    c.estado = 'cancelada';
    c.celdas.forEach((id) => this.celdas.delete(id));
  }

  async correo() {
    return this.conectado ? 'demo@siente.local' : null;
  }
  async entrar() {
    this.conectado = true;
    return 'demo@siente.local';
  }
  async salir() {
    this.conectado = false;
  }
  async citasDesde(fecha: string) {
    return structuredClone(this.citas.filter((c) => c.fecha >= fecha));
  }
}
