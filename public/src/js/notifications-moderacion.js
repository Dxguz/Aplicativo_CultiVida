import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * NOTIFICACIÓN DE MODERACIÓN DE POSTS
 * SOLO USO DEL ADMIN
 */
export async function crearNotificacionModeracion({
  postText,
  postOwnerId,
  motivo,      // "reporte" | "admin"
  comunidad    // "mujeres" | "agro_prof"
}) {
  const mensajes = {
    reporte:
      "Tu publicación fue eliminada por un reporte de otro usuario porque incumple las normas de la comunidad.",
    admin:
      "Tu publicación fue eliminada por el administrador porque incumple las normas de la comunidad."
  };

  await addDoc(collection(db, "user_notifications"), {
    tipo: "post-moderacion",
    titulo: "Publicación eliminada",
    cuerpo: mensajes[motivo],

    postPreview: postText?.substring(0, 50) || "",
    comunidad,

    usuarios: [postOwnerId], // 🔒 SOLO el autor
    roles: [],

    creadoEn: serverTimestamp(),
    leidoPor: []
  });
}
