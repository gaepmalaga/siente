// Almacén de citas en Firestore. Se importa de forma diferida: la web solo
// descarga Firebase cuando alguien va a pedir cita o abre la agenda del panel.
//
// Colecciones (reglas en firestore.rules):
//   ocupadas/{AAAA-MM-DD_HHMM_puesto}  Celda de agenda cogida. Lectura pública, sin datos personales.
//   citas/{id}                         Datos de la cita. Solo el equipo y quien la pidió.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, signOut, type Auth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
  type Firestore,
  type DocumentData,
} from 'firebase/firestore';
import { ErrorAgenda, HuecoOcupado, type Almacen, type Cita, type NuevaCita } from './agenda';
import type { DatosCitas } from './esquemas';

type Config = NonNullable<DatosCitas['firebase']>;

const aCita = (id: string, d: DocumentData): Cita => ({
  id,
  tipo: d.tipo,
  tipoNombre: d.tipoNombre,
  fecha: d.fecha,
  hora: d.hora,
  duracion: d.duracion,
  puesto: d.puesto,
  nombre: d.nombre,
  telefono: d.telefono,
  email: d.email ?? '',
  nota: d.nota ?? '',
  estado: d.estado,
  origen: d.origen,
  creada: d.creada,
  celdas: d.celdas ?? [],
});

const traducir = (e: unknown): ErrorAgenda => {
  const codigo = (e as { code?: string })?.code ?? '';
  if (codigo.includes('permission-denied')) return new ErrorAgenda('No tienes permiso para hacer esto.', 'permisos');
  if (codigo.includes('unavailable') || codigo.includes('network') || codigo.includes('deadline')) return new ErrorAgenda('No hay conexión con la agenda.', 'red');
  if (codigo.includes('operation-not-allowed') || codigo.includes('unauthorized-domain') || codigo.includes('failed-precondition'))
    return new ErrorAgenda(`La agenda no está bien configurada en Firebase (${codigo}).`, 'configuracion');
  return new ErrorAgenda((e as Error)?.message || 'Error desconocido en la agenda.');
};

export class AlmacenFirebase implements Almacen {
  modo = 'firebase' as const;
  private db: Firestore;
  private auth: Auth;

  constructor(config: Config) {
    const app = getApps().length ? getApp() : initializeApp(config);
    this.db = getFirestore(app);
    this.auth = getAuth(app);
  }

  private async usuario() {
    await this.auth.authStateReady();
    if (this.auth.currentUser) return this.auth.currentUser;
    return (await signInAnonymously(this.auth)).user;
  }

  async ocupadas(desde: string, hasta: string) {
    try {
      const r = await getDocs(query(collection(this.db, 'ocupadas'), where('dia', '>=', desde), where('dia', '<=', hasta)));
      return new Set(r.docs.map((d) => d.id));
    } catch (e) {
      throw traducir(e);
    }
  }

  async reservar(datos: NuevaCita, celdas: string[]): Promise<Cita> {
    let uid: string;
    try {
      uid = (await this.usuario()).uid;
    } catch (e) {
      throw traducir(e);
    }
    const ref = doc(collection(this.db, 'citas'));
    const creada = Date.now();
    const lote = writeBatch(this.db);
    lote.set(ref, { ...datos, estado: 'confirmada', creada, celdas, uid });
    for (const id of celdas) lote.set(doc(this.db, 'ocupadas', id), { dia: datos.fecha, cita: ref.id, uid });
    try {
      await lote.commit();
    } catch (e) {
      // Las reglas rechazan crear una celda que ya existe: es la protección contra dobles reservas.
      const dias = await this.ocupadas(datos.fecha, datos.fecha).catch(() => null);
      if (dias && celdas.some((id) => dias.has(id))) throw new HuecoOcupado();
      throw traducir(e);
    }
    return { ...datos, id: ref.id, estado: 'confirmada', creada, celdas };
  }

  async misCitas(ids: string[]) {
    const salida: Cita[] = [];
    try {
      await this.usuario();
      for (const id of ids.slice(0, 20)) {
        const d = await getDoc(doc(this.db, 'citas', id)).catch(() => null);
        if (d?.exists()) salida.push(aCita(d.id, d.data()));
      }
    } catch (e) {
      throw traducir(e);
    }
    return salida;
  }

  async cancelar(cita: Cita) {
    const lote = writeBatch(this.db);
    lote.update(doc(this.db, 'citas', cita.id), { estado: 'cancelada' });
    for (const id of cita.celdas) lote.delete(doc(this.db, 'ocupadas', id));
    try {
      await lote.commit();
    } catch (e) {
      throw traducir(e);
    }
  }

  async correo() {
    await this.auth.authStateReady();
    const u = this.auth.currentUser;
    return u && !u.isAnonymous ? (u.email ?? null) : null;
  }

  async entrar() {
    try {
      const r = await signInWithPopup(this.auth, new GoogleAuthProvider());
      return r.user.email ?? '';
    } catch (e) {
      throw traducir(e);
    }
  }

  async salir() {
    await signOut(this.auth);
  }

  async citasDesde(fecha: string) {
    try {
      const r = await getDocs(query(collection(this.db, 'citas'), where('fecha', '>=', fecha), orderBy('fecha')));
      return r.docs.map((d) => aCita(d.id, d.data()));
    } catch (e) {
      throw traducir(e);
    }
  }
}
