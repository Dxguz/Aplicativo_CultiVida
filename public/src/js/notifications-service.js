import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    doc,
    arrayUnion,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function initNotifications() {
    const { uid, rol, createdAt } = window.NOTI_USER;

    const q = query(
        collection(db, "user_notifications"),
        orderBy("creadoEn", "desc")
    );
    onSnapshot(q, snap => {
        const data = [];

        snap.forEach(d => {
            const n = d.data();

            //FILTRO: no mostrar notificaciones anteriores a la creación del usuario
            if (createdAt && n.creadoEn && n.creadoEn.seconds < createdAt.seconds) {
                return;
            }

            // Filtro por destinatario
            if (n.usuarios?.length && !n.usuarios.includes(uid)) return;

            if (n.userId === "ALL") {
                // válida para todos
            }
            else if (n.targetRol) {
                if (n.targetRol !== rol) return;
            }
            else if (n.userId && n.userId !== uid) {
                return;
            }

            // Si el usuario la eliminó, no mostrarla
            if (n.eliminadoPor?.includes(uid)) return;

            data.push({
                id: d.id,
                ...n,
                leido: n.leidoPor?.includes(uid) || false
            });
        });

        window.dispatchEvent(
            new CustomEvent("notificaciones:update", { detail: data })
        );
    });
}



export async function marcarLeida(id) {
    const { uid } = window.NOTI_USER;

    await updateDoc(doc(db, "user_notifications", id), {
        leidoPor: arrayUnion(uid)
    });
}


// MARCAR TODAS COMO LEÍDAS
export async function marcarTodasLeidas(notificaciones) {
    const { uid } = window.NOTI_USER;

    const pendientes = notificaciones.filter(n => !n.leido);

    await Promise.all(
        pendientes.map(n =>
            updateDoc(doc(db, "user_notifications", n.id), {
                leidoPor: arrayUnion(uid)
            })
        )
    );
}

// ELIMINAR UNA (soft delete usando leidoPor)
export async function eliminarNotificacion(id) {
    const { uid } = window.NOTI_USER;

    await updateDoc(doc(db, "user_notifications", id), {
        eliminadoPor: arrayUnion(uid)
    });
}

// ELIMINAR TODAS (soft delete usando leidoPor)
export async function eliminarTodas(notificaciones) {
    const { uid } = window.NOTI_USER;

    await Promise.all(
        notificaciones.map(n =>
            updateDoc(doc(db, "user_notifications", n.id), {
                eliminadoPor: arrayUnion(uid)
            })
        )
    );
}
