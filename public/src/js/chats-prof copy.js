import { auth, db } from "./firebase.js";
import {
    collection,
    query,
    where,
    addDoc,
    deleteDoc,
    getDocs,
    doc,
    getDoc,
    serverTimestamp,
    orderBy,
    onSnapshot,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged } from"https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { uploadToCloudinary } from "./cloudinary-api.js";
import { limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const chatListEl = document.getElementById("chatList");
const chatMessagesEl = document.getElementById("chatMessages");
const chatUserNameEl = document.getElementById("chatUserName");
const chatUserStatusEl = document.getElementById("chatUserStatus");
const chatAvatarEl = document.getElementById("chatAvatar");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendMessageBtn");
const fileInput = document.getElementById("fileInput");
const params = new URLSearchParams(window.location.search);
const initialChatId = params.get("chatId");
const uploadPreview = document.getElementById("uploadPreview");
const previewContent = document.getElementById("previewContent");
const cancelUploadBtn = document.getElementById("cancelUploadBtn");

let currentUser = null;
let currentChatId = null;
let otherUserId = null;
let unsubscribeMessages = null;
let typingTimeout = null;
let chatAutoAbierto = false;
let renderedMessages = new Set();
let unsubscribeChatStatus = null;


function mostrarVistaPrevia(file) {
    previewContent.innerHTML = "";
    const tipo = file.type.startsWith("video") ? "video" : "imagen";

    if (tipo === "imagen") {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        previewContent.appendChild(img);
    } else {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(file);
        video.controls = true;
        previewContent.appendChild(video);
    }
    uploadPreview.classList.remove("hidden");
}
function ocultarVistaPrevia() {
    uploadPreview.classList.add("hidden");
    previewContent.innerHTML = "";
}
cancelUploadBtn.onclick = () => ocultarVistaPrevia();


messageInput.addEventListener("input", async () => {
    if (!currentChatId) return;

    await updateDoc(doc(db, "chats", currentChatId), {
        escribiendo: currentUser.uid
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(async () => {
        await updateDoc(doc(db, "chats", currentChatId), {
            escribiendo: null
        });
    }, 1500);
});


function getChatIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("chatId");
}

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, async user => {
    if (!user) return;

    ocultarUploadEstado();

    currentUser = user;
    cargarChats();


});


/* =========================
   CARGAR CHATS
========================= */
function cargarChats() {
    const q = query(
        collection(db, "chats"),
        where("participantes", "array-contains", currentUser.uid),
        orderBy("actualizadoEn", "desc")
    );


    const chatIdFromURL = getChatIdFromURL();

    onSnapshot(q, snap => {
        chatListEl.innerHTML = "";

        snap.forEach(async docSnap => {
            const chat = docSnap.data();
            const chatId = docSnap.id;

            const otherId = chat.participantes.find(
                id => id !== currentUser.uid
            );

            const userSnap = await getDoc(doc(db, "users", otherId));
            if (!userSnap.exists()) return;

            const u = userSnap.data();

            const item = document.createElement("div");
            item.className = "chat-item";

            item.innerHTML = `
          <img src="${u.photoURL || "src/img/avatar-default.png"}" class="chat-avatar">
          <div class="chat-info">
            <div class="chat-name">${u.firstName || ""} ${u.lastName || ""}</div>
            <div class="chat-last">
            ${chat.ultimoMensaje
                    ? chat.ultimoMensaje
                    : chat.ultimoMensajeEn
                        ? ""
                        : "Nuevo chat"}
                        </div>

          </div>
        `;

            item.addEventListener("click", () => abrirChat(chatId, otherId, u));

            // AUTO-ABRIR CHAT DESDE URL (SOLO UNA VEZ)
            if (chatId === chatIdFromURL && !chatAutoAbierto) {
                chatAutoAbierto = true;
                item.classList.add("active");
                abrirChat(chatId, otherId, u);
            }


            chatListEl.appendChild(item);

            // 🔧 FIX: sincronizar último mensaje si no existe
            if (!chat.ultimoMensaje) {
                const lastMsgQuery = query(
                    collection(db, "chats", chatId, "mensajes"),
                    orderBy("enviadoEn", "desc"),
                    limit(1)
                );

                const lastMsgSnap = await getDocs(lastMsgQuery);

                if (!lastMsgSnap.empty) {
                    const lastMsg = lastMsgSnap.docs[0].data();

                    await updateDoc(doc(db, "chats", chatId), {
                        ultimoMensaje:
                            lastMsg.tipo === "texto"
                                ? lastMsg.contenido
                                : "📎 Archivo",
                        ultimoMensajeTipo: lastMsg.tipo,
                        ultimoMensajeEn: lastMsg.enviadoEn
                    });

                    chat.ultimoMensaje =
                        lastMsg.tipo === "texto"
                            ? lastMsg.contenido
                            : "📎 Archivo";
                }
            }

        });
    });

}


function resetComposer() {
    // Limpiar texto
    messageInput.value = "";

    // Cancelar preview si existía
    ocultarVistaPrevia();

    // Resetear input de archivo
    fileInput.value = "";

    // Quitar estado "escribiendo" del chat anterior
    if (currentChatId) {
        updateDoc(doc(db, "chats", currentChatId), {
            escribiendo: null
        }).catch(() => { });
    }
}


function escucharEstadoChat(chatId) {
    if (unsubscribeChatStatus) {
        unsubscribeChatStatus();
        unsubscribeChatStatus = null;
    }

    unsubscribeChatStatus = onSnapshot(
        doc(db, "chats", chatId),
        snap => {
            if (!snap.exists()) return;

            const typing = snap.data().escribiendo;

            chatUserStatusEl.textContent =
                typing && typing !== currentUser.uid
                    ? "Escribiendo…"
                    : (chatUserStatusEl.classList.contains("online")
                        ? "Activo"
                        : "Desconectado");
        }
    );
}



/* =========================
   ABRIR CHAT
========================= */
function abrirChat(chatId, uid, userData) {

    ocultarUploadEstado();
    resetComposer();

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    chatMessagesEl.innerHTML = "";

    const chatWindow = document.getElementById("chatWindow");
    chatWindow.classList.remove("empty");

    currentChatId = chatId;
    otherUserId = uid;

    chatUserNameEl.textContent =
        `${userData.firstName || ""} ${userData.lastName || ""}`;

    chatAvatarEl.src =
        userData.photoURL || "src/img/avatar-default.png";

    escucharEstado(uid);
    escucharMensajes();

    escucharEstadoChat(chatId);


    if (window.innerWidth <= 768) {
        document.querySelector(".chat-list").style.display = "none";
        document.getElementById("chatWindow").classList.add("active");
    }


}


/* =========================
   ESTADO USUARIO
========================= */
function escucharEstado(uid) {
    onSnapshot(doc(db, "users", uid), snap => {
        if (!snap.exists()) return;
        const online = snap.data().online === true;

        chatUserStatusEl.textContent =
            online ? "Activo" : "Desconectado";

        chatUserStatusEl.className =
            "chat-user-status " + (online ? "online" : "offline");
    });
}

/* =========================
   MENSAJES REALTIME
========================= */
function escucharMensajes() {
    if (unsubscribeMessages) unsubscribeMessages();

    renderedMessages.clear();
    chatMessagesEl.innerHTML = "";

    const q = query(
        collection(db, "chats", currentChatId, "mensajes"),
        orderBy("enviadoEn", "asc")
    );

    unsubscribeMessages = onSnapshot(q, snap => {
        snap.docChanges().forEach(change => {
            if (change.type === "added") {
                if (!renderedMessages.has(change.doc.id)) {
                    renderedMessages.add(change.doc.id);
                    renderMensaje(change.doc.id, change.doc.data());
                }
            }
        });

        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    });
}


/* =========================
   RENDER MENSAJE
========================= */
function renderMensaje(id, m) {
    const div = document.createElement("div");
    div.className = `msg ${m.de === currentUser.uid ? "me" : "other"}`;

    let fechaBase = null;

    if (m.enviadoEn && typeof m.enviadoEn.toDate === "function") {
        // Timestamp real de Firestore
        fechaBase = m.enviadoEn.toDate();
    } else if (typeof m.enviadoEnLocal === "number") {
        // Timestamp local inmediato
        fechaBase = new Date(m.enviadoEnLocal);
    }

    const time = fechaBase
        ? fechaBase.toLocaleTimeString("es-MX", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        })
        : "";

    const date = fechaBase
        ? fechaBase.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
        : "";


    const leido =
        m.de === currentUser.uid && m.leido
            ? `<span class="msg-read">Leído</span>`
            : "";

    let content = "";

    if (m.tipo === "texto") {
        content = `<p>${m.contenido}</p>`;
    }

    if (m.tipo === "imagen") {
        content = `<img src="${m.contenido}" class="msg-img">`;
    }

    if (m.tipo === "video") {
        content = `
        <video
          src="${m.contenido}"
          class="msg-video"
          controls
          preload="metadata"
          controlsList="nodownload"
        ></video>
    `;
    }




    div.innerHTML = `
    ${content}

    <div class="msg-meta">
      <span>${date}</span>
      <span>${time}</span>
    </div>

    ${leido}

    <button class="msg-report" title="Reportar">
      <i class="fa-solid fa-circle-exclamation"></i>
    </button>
  `;

    /* fullscreen media */
    const img = div.querySelector(".msg-img");
    const video = div.querySelector(".msg-video");

    if (video) {
        // AISLAR COMPLETAMENTE EVENTOS DEL VIDEO
        ["click", "mousedown", "mouseup", "touchstart"].forEach(evt => {
            video.addEventListener(evt, e => {
                e.stopPropagation();
            });
        });
    }


    if (img) {
        img.addEventListener("click", e => {
            e.stopPropagation();
            abrirMediaFullscreen(`<img src="${m.contenido}">`);
        });
    }


    div.querySelector(".msg-report")
        .addEventListener("click", e => {
            e.stopPropagation();
            abrirReporte(id);
        });


    chatMessagesEl.appendChild(div);
}



/* =========================
   ENVIAR TEXTO
========================= */
sendBtn.addEventListener("click", enviarTexto);
messageInput.addEventListener("keydown", e => {
    if (e.key === "Enter") enviarTexto();
});

async function enviarTexto() {
    if (!messageInput.value.trim() || !currentChatId) return;

    const text = messageInput.value.trim();
    messageInput.value = "";

    await enviarMensajeBase("texto", text);
}

/* =========================
   ENVIAR ARCHIVO
========================= */
fileInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file || !currentChatId) return;

    let tipo = file.type.startsWith("video") ? "video" : "imagen";

    mostrarUploadEstado("Subiendo archivo…");

    try {
        const url = await uploadToCloudinary(
            file,
            "chat_media",
            tipo === "video" ? "video" : "image"
        );

        mostrarUploadEstado("Archivo cargado correctamente");
        await enviarMensajeBase(tipo, url);

        setTimeout(ocultarUploadEstado, 1200);

    } catch (err) {
        console.error(err);
        mostrarUploadError("Error al cargar archivo");
    } finally {
        fileInput.value = "";
    }
});


async function enviarMensajeBase(tipo, contenido) {
    const now = Date.now(); // número en ms

    await addDoc(
        collection(db, "chats", currentChatId, "mensajes"),
        {
            de: currentUser.uid,
            tipo,
            contenido,
            enviadoEn: serverTimestamp(),
            enviadoEnLocal: now,
            leido: false,
            reportado: false
        }
    );

    await updateDoc(
        doc(db, "chats", currentChatId),
        {
            ultimoMensaje:
                tipo === "texto" ? contenido : "📎 Archivo",
            ultimoMensajeTipo: tipo,
            ultimoMensajeDe: currentUser.uid,
            ultimoMensajeEn: serverTimestamp(),
            actualizadoEn: serverTimestamp()
        }
    );
}

/* =========================
   MARCAR LEÍDO
========================= */
async function marcarLeido(id) {
    await updateDoc(
        doc(db, "chats", currentChatId, "mensajes", id),
        { leido: true }
    );
}

/* =========================
   REPORTAR
========================= */

function abrirMediaFullscreen(html) {
    const overlay = document.getElementById("mediaOverlay");
    document.getElementById("mediaContent").innerHTML = html;
    overlay.classList.add("active");
}

document.getElementById("closeMedia").onclick = () => {
    document.getElementById("mediaOverlay").classList.remove("active");
};


document.getElementById("cancelDelete").onclick = () => {
    document.getElementById("deleteModal").classList.remove("active");
};

document.getElementById("confirmDelete").onclick = async () => {
    if (!currentChatId) return;

    try {
        // Obtener todos los mensajes
        const mensajesSnap = await getDocs(
            collection(db, "chats", currentChatId, "mensajes")
        );

        // Eliminar mensajes
        for (const msg of mensajesSnap.docs) {
            await deleteDoc(msg.ref);
        }

        // Eliminar chat
        await deleteDoc(doc(db, "chats", currentChatId));

        // Reset UI
        currentChatId = null;
        chatMessagesEl.innerHTML = "";
        document.getElementById("chatWindow").classList.add("empty");
        document.getElementById("deleteModal").classList.remove("active");

    } catch (err) {
        console.error("Error eliminando chat:", err);
        alert("No se pudo eliminar el chat");
    }
};




let reporteMsgId = null;

function abrirReporte(id) {
    reporteMsgId = id;
    document.getElementById("reportOverlay").classList.add("active");
}

document.getElementById("cancelReport").onclick = () => {
    document.getElementById("reportOverlay").classList.remove("active");
};

document.getElementById("sendReport").onclick = async () => {
    const reason = document.getElementById("reportReason").value.trim();
    if (!reason) return alert("Describe el motivo");

    await updateDoc(
        doc(db, "chats", currentChatId, "mensajes", reporteMsgId),
        {
            reportado: true,
            motivoReporte: reason
        }
    );

    document.getElementById("reportOverlay").classList.remove("active");
    document.getElementById("reportReason").value = "";
};


function mostrarUploadEstado(texto = "Subiendo archivo…") {
    const box = document.getElementById("uploadStatus");
    const text = document.getElementById("uploadText");

    text.textContent = texto;
    box.classList.remove("hidden");

    // Evitar que tape el input
    box.style.pointerEvents = "none";
}


function ocultarUploadEstado() {
    const box = document.getElementById("uploadStatus");
    const text = document.getElementById("uploadText");

    box.classList.add("hidden");
    text.textContent = "";
}


function mostrarUploadError(texto) {
    const box = document.getElementById("uploadStatus");
    const text = document.getElementById("uploadText");

    text.textContent = texto;
    box.classList.remove("hidden");

    box.querySelector(".upload-spinner")?.remove();

    setTimeout(() => {
        ocultarUploadEstado();
    }, 2000);
}


document.addEventListener("DOMContentLoaded", () => {
    ocultarUploadEstado();
});


document.getElementById("deleteChatBtn").onclick = () => {
    if (!currentChatId) return;
    document.getElementById("deleteModal").classList.add("active");
};
