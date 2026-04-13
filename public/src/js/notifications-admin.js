import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function crearNotificacionEvento({
  tituloEvento,
  destinatarios
}) {
  // CASO 1: TODOS
  if (destinatarios.includes("todos")) {
    await addDoc(collection(db, "user_notifications"), {
      tipo: "evento",
      titulo: "Nuevo evento disponible",
      cuerpo: tituloEvento,
      userId: "ALL",
      creadoEn: serverTimestamp(),
      leidoPor: []
    });
    return;
  }

  // CASO 2: POR ROL (una notificación por rol)
  for (const rol of destinatarios) {
    await addDoc(collection(db, "user_notifications"), {
      tipo: "evento",
      titulo: "Nuevo evento disponible",
      cuerpo: tituloEvento,
      targetRol: rol,
      creadoEn: serverTimestamp(),
      leidoPor: []
    });
  }
}