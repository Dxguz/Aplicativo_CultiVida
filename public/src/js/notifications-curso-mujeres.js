import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * 🔔 Notificación por nuevo curso de mujeres
 */
export async function crearNotificacionNuevoCursoMujeres({
    cursoId,
    cursoNombre
}) {
    try {
        await addDoc(collection(db, "user_notifications"), {
            tipo: "curso-mujeres",

            // CAMPOS ESPERADOS POR LA UI
            titulo: "Nuevo curso disponible",
            cuerpo: `Se ha publicado un nuevo curso: "${cursoNombre}"`,
            creadoEn: serverTimestamp(),
            leido: false,

            // FILTRO DE DESTINO
            userId: "ALL_MUJERES",
            targetRol: "mujer_rural",

            // CONTEXTO
            cursoId,
            comunidad: "mujeres"
        });



        console.log("Notificación de curso creada");
    } catch (error) {
        console.error("Error creando notificación de curso:", error);
    }
}
