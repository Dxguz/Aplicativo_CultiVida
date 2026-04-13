import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function crearNotificacionSocial({
    tipo,
    actorId,
    actorName,
    postId,
    postText,
    postOwnerId,
    comunidad
}) {
    // No notificar a uno mismo
    if (actorId === postOwnerId) return;

    const mensajes = {
        like: `${actorName} le dio like a tu publicación`,
        comment: `${actorName} comentó tu publicación`,
        repost: `${actorName} reposteó tu publicación`
    };

    const tipoMap = {
        like: "like-post",
        comment: "comentario-post",
        repost: "repost-post"
    };

    await addDoc(collection(db, "user_notifications"), {
        tipo: tipoMap[tipo],
        titulo: "Nueva interacción",
        cuerpo: mensajes[tipo],

        postId,
        postPreview: postText?.substring(0, 50) || "",
        comunidad,

        actorId,
        actorName,

        usuarios: [postOwnerId],
        roles: [],

        creadoEn: serverTimestamp(),
        leidoPor: []
    });
}
