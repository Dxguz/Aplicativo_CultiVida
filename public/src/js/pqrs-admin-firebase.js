import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function obtenerTodasPQRS() {
  try {
    const q = query(collection(db, "pqrs"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const pqrs = [];
    querySnapshot.forEach(d => {
      pqrs.push({
        id: d.id,
        ...d.data()
      });
    });

    console.log(`✅ ${pqrs.length} PQRS cargadas`);
    return pqrs;

  } catch (error) {
    console.error("❌ Error obteniendo PQRS:", error);
    throw error;
  }
}


export async function actualizarPQRS(pqrsId, nuevoEstado, respuesta) {
  try {
    const pqrsRef = doc(db, "pqrs", pqrsId);

    await updateDoc(pqrsRef, {
      estado: nuevoEstado,
      respuesta,
      notificado: false,
      updatedAt: serverTimestamp()
    });

    console.log(`✅ PQRS ${pqrsId} actualizada`);

  } catch (error) {
    console.error("❌ Error actualizando PQRS:", error);
    throw error;
  }
}

/* =====================================================
   MARCAR COMO NOTIFICADA
===================================================== */
export async function marcarComoNotificada(pqrsId) {
  try {
    const pqrsRef = doc(db, "pqrs", pqrsId);

    await updateDoc(pqrsRef, {
      notificado: true,
      notificadoEn: serverTimestamp()
    });

    console.log(`🔔 PQRS ${pqrsId} marcada como notificada`);

  } catch (error) {
    console.error("❌ Error marcando como notificada:", error);
    throw error;
  }
}

/* =====================================================
   CREAR NOTIFICACIÓN INTERNA (🔥 CORREGIDO 🔥)
===================================================== */
export async function crearNotificacionInterna(pqrs) {
  try {
    if (!pqrs.userId) {
      console.error("❌ PQRS sin userId:", pqrs);
      return;
    }

    // 🔔 Crear notificación (colección raíz)
    const notificacion = {
      userId: pqrs.userId, // 🔑 CLAVE REAL
      titulo: `Actualización PQRS #${pqrs.radicado}`,
      tipo: "PQRS",
      mensaje: `Tu solicitud fue ${pqrs.estado.toLowerCase()}`,
      detalle: pqrs.respuesta || "Tu PQRS está siendo gestionada",
      estado: pqrs.estado,
      pqrsId: pqrs.id,
      pqrsRadicado: pqrs.radicado,
      rol: (pqrs.rol || "").toLowerCase(),
      leida: false,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "notifications"), notificacion);

    console.log("✅ Notificación creada para userId:", pqrs.userId);

  } catch (error) {
    console.error("❌ Error creando notificación:", error);
    throw error;
  }
}


/* =====================================================
   FILTRAR PQRS
===================================================== */
export function filtrarPQRS(pqrs, rol, estado) {
  return pqrs.filter(p => {
    const rolOK = !rol || (p.rol || "").toLowerCase().includes(rol.toLowerCase());
    const estadoOK = !estado || (p.estado || "").toLowerCase().includes(estado.toLowerCase());
    return rolOK && estadoOK;
  });
}
