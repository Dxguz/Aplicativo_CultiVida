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
    updateDoc,
    deleteField,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { onAuthStateChanged } from
    "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { uploadToCloudinary } from "./cloudinary-api.js";

import { limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


/* =========================
   DOM
========================= */
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
const modalConfirmacionAprobacion = document.getElementById("modalConfirmacionAprobacion");
const cancelAprobacionBtn = document.getElementById("cancelAprobacion");
const confirmAprobacionBtn = document.getElementById("confirmAprobacion");


/* =========================
   STATE
========================= */
let currentUser = null;
let currentChatId = null;
let otherUserId = null;
let unsubscribeMessages = null;
let typingTimeout = null;
let chatAutoAbierto = false;
let renderedMessages = new Set();
let unsubscribeChatStatus = null;
let unsubscribeUserStatus = null;
let renderedChats = new Map();
let unsubscribeAsesoria = null;
let avisoNuevaAsesoriaRenderizado = false;
let asesoriaReactivadaMensajeEnviado = false;
let unsubscribeChats = null;
let chatEstadoActual = null;


const modalMotivoRechazo = document.getElementById("modalMotivoRechazo");
const motivoRechazoInput = document.getElementById("motivoRechazoInput");
const cancelRechazoBtn = document.getElementById("cancelRechazo");
const confirmRechazoBtn = document.getElementById("confirmRechazo");

let mensajePagoRechazoActual = null;




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

    await updateDoc(doc(db, "users", user.uid), {
        online: true,
        lastSeen: serverTimestamp()
    });

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

    onSnapshot(q, async snap => {

        // =========================
        // CARGA INICIAL (ORDEN REAL)
        // =========================
        if (renderedChats.size === 0) {
            chatListEl.innerHTML = "";

            for (const docSnap of snap.docs) {
                const chatId = docSnap.id;
                const chat = docSnap.data();

                if (chat.eliminadoPara?.[currentUser.uid]) continue;

                const otherId = chat.participantes.find(
                    id => id !== currentUser.uid
                );

                const userSnap = await getDoc(doc(db, "users", otherId));
                if (!userSnap.exists()) continue;

                const u = userSnap.data();

                const leidoHasta = chat.leidoHasta?.[currentUser.uid];
                const ultimoMsg = chat.ultimoMensajeEn;

                const tieneNoLeido =
                    chatId !== currentChatId &&
                    ultimoMsg &&
                    chat.ultimoMensajeDe !== currentUser.uid &&
                    (!leidoHasta || ultimoMsg.toMillis() > leidoHasta.toMillis());



                const item = document.createElement("div");
                item.className = "chat-item";
                item.dataset.chatId = chatId;
                item.dataset.ultimoMensajeEn =
                    chat.ultimoMensajeEn?.toMillis?.() || 0;


                const borradoHasta = chat.borradoHasta?.[currentUser.uid];
                const ultimoMensajeEn = chat.ultimoMensajeEn;

                const mostrarNuevoChat =
                    borradoHasta &&
                    ultimoMensajeEn &&
                    ultimoMensajeEn.toMillis() <= borradoHasta.toMillis();

                const textoUltimoMensaje = mostrarNuevoChat
                    ? "Nuevo chat"
                    : (chat.ultimoMensaje || "Nuevo chat");



                item.innerHTML = `
                <img src="${u.photoURL || "src/img/avatar-default.png"}" class="chat-avatar">
                <div class="chat-info">
                    <div class="chat-name-row">
                    <span class="chat-name-text">
                    ${u.firstName || ""} ${u.lastName || ""}
                    </span>
                    
                    ${tieneNoLeido
                        ? `<span class="chat-unread-wrap">
                    <i class="fa-solid fa-message chat-unread"></i>
                    </span>`
                        : ""
                    }
                    </div>

                    <div class="chat-last">
                    ${textoUltimoMensaje}
                    </div>

                </div>
            `;

                item.addEventListener("click", () =>
                    abrirChat(chatId, otherId, u)
                );

                renderedChats.set(chatId, item);
                chatListEl.appendChild(item);

                // Auto abrir desde URL
                if (chatId === chatIdFromURL && !chatAutoAbierto) {
                    chatAutoAbierto = true;
                    item.classList.add("active");
                    abrirChat(chatId, otherId, u);
                }
            }
            return;
        }

        // =========================
        // TIEMPO REAL (CAMBIOS)
        // =========================
        for (const change of snap.docChanges()) {

            const chatId = change.doc.id;
            const chat = change.doc.data();

            if (chat.eliminadoPara?.[currentUser.uid]) {
                const el = renderedChats.get(chatId);
                if (el) {
                    el.remove();
                    renderedChats.delete(chatId);
                }
                continue;
            }

            // REMOVED
            if (change.type === "removed") {
                const el = renderedChats.get(chatId);
                if (el) {
                    el.remove();
                    renderedChats.delete(chatId);
                }
                continue;
            }

            // MODIFIED
            if (renderedChats.has(chatId)) {
                const el = renderedChats.get(chatId);

                const borradoHasta = chat.borradoHasta?.[currentUser.uid];
                const ultimoMensajeEn = chat.ultimoMensajeEn;

                const mostrarNuevoChat =
                    borradoHasta &&
                    ultimoMensajeEn &&
                    ultimoMensajeEn.toMillis() <= borradoHasta.toMillis();

                el.querySelector(".chat-last").textContent =
                    mostrarNuevoChat
                        ? "Nuevo chat"
                        : (chat.ultimoMensaje || "Nuevo chat");


                const nameRow = el.querySelector(".chat-name-row");
                const badge = nameRow.querySelector(".chat-unread");

                const leidoHasta = chat.leidoHasta?.[currentUser.uid];
                const ultimoMsg = chat.ultimoMensajeEn;

                const tieneNoLeido =
                    chatId !== currentChatId &&
                    ultimoMsg &&
                    chat.ultimoMensajeDe !== currentUser.uid &&
                    (!leidoHasta || ultimoMsg.toMillis() > leidoHasta.toMillis());



                if (tieneNoLeido && !badge) {
                    nameRow.insertAdjacentHTML(
                        "beforeend",
                        `
        <span class="chat-unread-wrap">
            <i class="fa-solid fa-message chat-unread"></i>
        </span>
        `
                    );
                }

                if (!tieneNoLeido && badge) {
                    badge.closest(".chat-unread-wrap")?.remove();
                }

                const nuevoTimestamp =
                    chat.ultimoMensajeEn?.toMillis?.() || 0;

                const timestampPrevio =
                    Number(el.dataset.ultimoMensajeEn || 0);

                // SOLO si llegó mensaje nuevo
                if (nuevoTimestamp > timestampPrevio) {
                    el.dataset.ultimoMensajeEn = nuevoTimestamp;
                    chatListEl.prepend(el);
                }



            }
        }
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

            unsubscribeChatStatus = onSnapshot(
                doc(db, "chats", chatId),
                snap => {
                    if (!snap.exists()) return;

                    const typing = snap.data().escribiendo;

                    if (typing && typing !== currentUser.uid) {
                        chatUserStatusEl.textContent = "Escribiendo…";
                    }
                }
            );

        }
    );
}



/* =========================
   ABRIR CHAT
========================= */
async function abrirChat(chatId, uid, userData) {

    ocultarUploadEstado();
    resetComposer();

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    chatMessagesEl.innerHTML = "";
    // Reset aviso de nueva asesoría al abrir el chat
    avisoNuevaAsesoriaRenderizado = false;


    const chatWindow = document.getElementById("chatWindow");
    chatWindow.classList.remove("empty");

    currentChatId = chatId;

    // Obtener datos del chat
    const chatSnap = await getDoc(doc(db, "chats", currentChatId));
    const chatData = chatSnap.data();

    // Mostrar aviso de nueva asesoría automáticamente si aplica
    if (chatData?.inicioAsesoriaActual && !avisoNuevaAsesoriaRenderizado) {
        const inicioTs = chatData.inicioAsesoriaActual.toDate();
        const key = chatData.inicioAsesoriaActual.toMillis();
        renderAvisoNuevaAsesoria(inicioTs, key);
        avisoNuevaAsesoriaRenderizado = true;
    }



    // Marcar chat como leído para este usuario
    updateDoc(doc(db, "chats", chatId), {
        [`leidoHasta.${currentUser.uid}`]: serverTimestamp()
    }).catch(() => { });


    //  Resetear chat activo visual
    document.querySelectorAll(".chat-item.active")
        .forEach(el => el.classList.remove("active"));

    //  Marcar como activo el actual
    // Quitar badge de no leído al abrir el chat
    const activeItem = renderedChats.get(chatId);
    if (activeItem) {
        activeItem.classList.add("active");
        if (activeItem) {
            activeItem.classList.add("active");
            activeItem.querySelector(".chat-unread-wrap")?.remove();
        }

    }


    otherUserId = uid;

    chatUserNameEl.textContent =
        `${userData.firstName || ""} ${userData.lastName || ""}`;

    chatAvatarEl.src =
        userData.photoURL || "src/img/avatar-default.png";

    escucharEstado(uid);
    escucharMensajes();
    escucharEstadoChat(chatId);
    escucharEstadoAsesoria(chatId);


    if (window.innerWidth <= 768) {
        document.querySelector(".chat-list").style.display = "none";
        document.getElementById("chatWindow").classList.add("active");
    }


}


/* =========================
   ESTADO USUARIO
========================= */
function escucharEstado(uid) {
    if (unsubscribeUserStatus) unsubscribeUserStatus();

    unsubscribeUserStatus = onSnapshot(doc(db, "users", uid), snap => {
        if (!snap.exists()) return;

        const online = snap.data().online === true;

        chatUserStatusEl.textContent =
            online ? "Activo" : "Desconectado";

        chatUserStatusEl.className =
            "chat-user-status " + (online ? "online" : "offline");
    });
}


function escucharEstadoAsesoria(chatId) {
    if (unsubscribeAsesoria) {
        unsubscribeAsesoria();
        unsubscribeAsesoria = null;
    }

    unsubscribeAsesoria = onSnapshot(
        doc(db, "chats", chatId),
        async snap => {
            if (!snap.exists()) return;

            chatEstadoActual = snap.data();


            const data = snap.data();
            const inputArea = document.querySelector(".chat-input-area");

            // Ocultar botones de pago si ya NO está pendiente
            if (data.estadoAsesoria !== "pendiente_aprobacion") {
                document.querySelectorAll(".acciones-pago").forEach(el => {
                    el.style.display = "none";
                });
            }

            // Control del input
            if (data.estadoAsesoria !== "activa") {
                inputArea.style.display = "none";
            } else {
                chatMessagesEl
                    .querySelectorAll(".asesoria-finalizada-box")
                    .forEach(el => el.remove());

                inputArea.style.display = "";
            }



        }
    );
}


/* =========================
   MENSAJES REALTIME
========================= */
async function escucharMensajes() {
    if (unsubscribeMessages) unsubscribeMessages();

    renderedMessages.clear();
    chatMessagesEl.innerHTML = "";

    const chatSnap = await getDoc(doc(db, "chats", currentChatId));
    const borradoHasta = chatSnap.data()?.borradoHasta?.[currentUser.uid];
    const chatData = chatSnap.data();
    const inicioAsesoria = chatData?.inicioAsesoriaActual;
    let avisoInsertado = false;

    const finalizacionTs =
        chatData?.estadoAsesoria === "finalizada"
            ? chatData.finalizacion?.finalizadaEn
            : null;


    const q = query(
        collection(db, "chats", currentChatId, "mensajes"),
        orderBy("enviadoEn", "asc")
    );

    unsubscribeMessages = onSnapshot(q, snap => {
        snap.docChanges().forEach(change => {
            if (change.type !== "added") return;

            const data = change.doc.data();

            if (
                borradoHasta &&
                data.enviadoEn?.toMillis?.() <= borradoHasta.toMillis()
            ) {
                return;
            }




            if (!renderedMessages.has(change.doc.id)) {
                renderedMessages.add(change.doc.id);
                if (
                    inicioAsesoria &&
                    !avisoInsertado &&
                    data.enviadoEn &&
                    data.enviadoEn.toMillis() > inicioAsesoria.toMillis()
                ) {
                    renderAvisoNuevaAsesoria(
                        inicioAsesoria.toDate(),
                        inicioAsesoria.toMillis()
                    );
                    avisoInsertado = true;
                }

                renderMensaje(change.doc.id, data);
                avisoNuevaAsesoriaRenderizado = true;
            }
        });

        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

        // Aviso de asesoría finalizada (si existe)
        if (finalizacionTs) {
            const key = finalizacionTs.toMillis();

            if (!chatMessagesEl.querySelector(`[data-finalizacion="${key}"]`)) {
                renderAvisoAsesoriaFinalizada(
                    chatData,
                    finalizacionTs.toDate(),
                    key
                );
            }
        }

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

    if (m.tipo === "texto" && m.subtipo === "asesoria_finalizada") {

        content = `
        <div class="fin-asesoria-box">
            <h6>Asesoría finalizada por el profesional</h6>
            <p><strong>Motivo:</strong> ${m.motivo || "-"}</p>
            ${m.descripcion
                ? `<p><strong>Descripción:</strong> ${m.descripcion}</p>`
                : ""
            }
            <p>---Si necesitas volver a contactarlo, puedes hacerlo desde el perfil del profesional.---</p>
        </div>
    `;
    }
    else if (m.tipo === "texto" && m.subtipo === "asesoria_reactivada") {

        content = `
        <div class="pago-aprobado-box">
            <h6>Asesoría reactivada</h6>
            <p>El profesional reactivó la asesoría.</p>
        </div>
    `;
    }


    else if (
        m.tipo === "texto" &&
        m.subtipo === "asesoria_solicitada_agricultor"
    ) {

        content = `
        <div class="pago-aprobado-box">
            <h6>Nueva asesoría solicitada</h6>
            <p>El agricultor solicitó iniciar una nueva asesoría.</p>
        </div>
    `;
    }


    else if (
        m.tipo === "texto" &&
        m.subtipo === "resumen_pago"
    ) {

        const esProfesional =
            document.body.dataset.role === "profesional";

        const pago = m.pagoData || {};

        content = `
        <div class="pago-box">
            <h4>Pago recibido para iniciar asesoría</h4>

            <p><strong>Solicitante:</strong> ${pago.nombre || "-"}</p>
            <p><strong>Documento:</strong> ${pago.tipoDocumento || "-"} ${pago.documento || ""}</p>
            <p><strong>Banco:</strong> ${pago.banco || "-"}</p>
            <p><strong>Medio de pago:</strong> ${pago.medioPago || "-"}</p>
            <p><strong>Cuenta origen:</strong> ${pago.cuentaOrigen || "-"}</p>
            <p><strong>Descripción:</strong> ${pago.descripcion || "-"}</p>


            ${pago.comprobanteURL ? `
    <div class="comprobante-preview">
        <img src="${pago.comprobanteURL}" class="comprobante-img">
        <a href="${pago.comprobanteURL}" target="_blank">
            Ver en tamaño completo
        </a>
    </div>
` : ""}


            ${esProfesional ? `
    <div class="acciones-pago">
        <button class="btn-aprobar-pago">
            <i class="fa-solid fa-circle-check"></i>
            Aprobar pago
        </button>
        <button class="btn-rechazar-pago">
            <i class="fa-solid fa-circle-xmark"></i>
            Rechazar pago
        </button>
    </div>
` : ""}



        </div>
    `;
    }


    else if (m.subtipo === "pago_rechazado") {

        content = `
        <div class="pago-rechazado-box">
            <h6>Pago rechazado</h6>
            <p><strong>Motivo:</strong> ${m.motivoRechazo}</p>
        </div>
    `;
    }

    else if (m.subtipo === "pago_aprobado") {

        content = `
        <div class="pago-aprobado-box">
            <h6>Pago aprobado</h6>
            <p>El profesional confirmó la transferencia.</p>
        </div>
    `;
    }



    else if (m.tipo === "texto") {
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

    // ==========================
    // LÓGICA APROBACIÓN DE PAGO
    // ==========================
    if (m.subtipo === "resumen_pago") {

        const esProfesional =
            document.body.dataset.role === "profesional";

        const chatRef = doc(db, "chats", currentChatId);


        if (esProfesional) {

            if (m.subtipo === "resumen_pago") {

                const esProfesional =
                    document.body.dataset.role === "profesional";

                if (esProfesional && chatEstadoActual) {

                    const esPagoVigente =
                        chatEstadoActual.pagoPendienteMensajeId === id &&
                        chatEstadoActual.estadoAsesoria === "pendiente_aprobacion";

                    if (!esPagoVigente) {
                        const acciones = div.querySelector(".acciones-pago");
                        if (acciones) acciones.remove();
                        return;
                    }

                    const btnAprobar = div.querySelector(".btn-aprobar-pago");
                    const btnRechazar = div.querySelector(".btn-rechazar-pago");

                    if (btnAprobar) {
                        btnAprobar.onclick = () => {
                            modalConfirmacionAprobacion.classList.add("active");
                        };
                    }

                    if (btnRechazar) {
                        btnRechazar.onclick = () => {
                            mensajePagoRechazoActual = m;
                            modalMotivoRechazo.classList.add("active");
                        };
                    }
                }
            }


        }

    }

}

function renderAvisoNuevaAsesoria(fecha, key) {
    if (
        key &&
        chatMessagesEl.querySelector(
            `[data-asesoria="${key}"]`
        )
    ) {
        return;
    }

    const div = document.createElement("div");

    div.className = "chat-aviso";
    if (key) div.dataset.asesoria = key;

    const textoFecha = fecha
        ? fecha.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
        : "";

    div.innerHTML = `
        <strong>Nueva asesoría</strong>
        ${textoFecha ? `<div style="font-size:.75rem">${textoFecha}</div>` : ""}
    `;

    chatMessagesEl.appendChild(div);
}

function renderAvisoAsesoriaFinalizada(data, fecha, key) {
    const div = document.createElement("div");

    div.className = "asesoria-finalizada-box";
    div.dataset.finalizacion = key;

    const textoFecha = fecha.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

    const esProfesional =
        document.body.dataset.role === "profesional";

    div.innerHTML = `
        <div class="asesoria-finalizada-content">
            <h4>Asesoría finalizada</h4>
            <div class="fecha">${textoFecha}</div>

            <p><strong>Motivo:</strong> ${data.finalizacion?.motivo || "-"}</p>

            ${data.finalizacion?.descripcion
            ? `<p class="desc">${data.finalizacion.descripcion}</p>`
            : ""
        }

            ${esProfesional ? `
                <div class="acciones">
                    <button class="btn-reactivar">
                        Reactivar
                    </button>
                </div>
            ` : ""}
        </div>
    `;

    chatMessagesEl.appendChild(div);

    // Activar lógica de reactivación
    if (esProfesional) {
        const btn = div.querySelector(".btn-reactivar");

        btn.onclick = async () => {

            const nowLocal = Date.now();

            //  MENSAJE AUTOMÁTICO (PRIMERO)
            await addDoc(
                collection(db, "chats", currentChatId, "mensajes"),
                {
                    tipo: "texto",
                    subtipo: "asesoria_reactivada",
                    de: auth.currentUser.uid,

                    contenido: "__ASESORIA_REACTIVADA__",

                    enviadoEn: serverTimestamp(),
                    enviadoEnLocal: nowLocal,

                    leido: false,
                    reportado: false
                }
            );

            // REACTIVAR ASESORÍA (SIN deleteField)
            await updateDoc(doc(db, "chats", currentChatId), {
                estadoAsesoria: "activa",
                inicioAsesoriaActual: serverTimestamp(),
                actualizadoEn: serverTimestamp(),
                pagoPendienteMensajeId: null
            });


            // LIMPIEZA SEGURA (EN SEGUNDO PASO)
            await updateDoc(doc(db, "chats", currentChatId), {
                finalizacion: deleteField()
            });

            // UI
            div.remove();
            document.querySelector(".chat-input-area").style.display = "";
        };

    }
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


/* =========================
   MENSAJE BASE
========================= */
async function enviarMensajeBase(tipo, contenido) {

    const chatSnap = await getDoc(doc(db, "chats", currentChatId));
    const chatData = chatSnap.data();

    if (chatData?.estadoAsesoria !== "activa") {
        mostrarAvisoChat("La asesoría aún no está activa", "error");
        return;
    }


    const now = Date.now(); // timestamp local

    // Si es chat reactivado sin avisoInsertado, inicializa aviso local
    // Solo activar automáticamente si NO está pendiente de aprobación
    if (
        !chatData.inicioAsesoriaActual &&
        chatData?.estadoAsesoria === "activa"
    ) {

        const nowTs = serverTimestamp();
        const nowLocal = Date.now();

        await updateDoc(doc(db, "chats", currentChatId), {
            inicioAsesoriaActual: nowTs,
            estadoAsesoria: "activa",
        });

        // Forzar render local inmediato
        renderAvisoNuevaAsesoria(new Date(nowLocal), nowLocal);
        //avisoInsertado = true;
        avisoNuevaAsesoriaRenderizado = true;
    }


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

    // ====== FORZAR AVISO NUEVA ASESORÍA INMEDIATO ======
    const chatSnapAfter = await getDoc(doc(db, "chats", currentChatId));
    const chatDataAfter = chatSnapAfter.data();

    if (
        chatDataAfter?.inicioAsesoriaActual &&
        !avisoNuevaAsesoriaRenderizado
    ) {
        // Usar timestamp local para que aparezca ya
        const ts = chatDataAfter.inicioAsesoriaActual.toMillis
            ? chatDataAfter.inicioAsesoriaActual.toMillis()
            : Date.now();

        renderAvisoNuevaAsesoria(new Date(ts), ts);
        avisoNuevaAsesoriaRenderizado = true;
    }


    await updateDoc(
        doc(db, "chats", currentChatId),
        {
            ultimoMensaje: tipo === "texto" ? contenido : "📎 Archivo",
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


const cancelDeleteBtn = document.getElementById("cancelDelete");
const deleteModal = document.getElementById("deleteModal");

if (cancelDeleteBtn && deleteModal) {
    cancelDeleteBtn.onclick = () => {
        deleteModal.classList.remove("active");
    };
}


const confirmDeleteBtn = document.getElementById("confirmDelete");

if (confirmDeleteBtn && deleteModal) {
    confirmDeleteBtn.onclick = async () => {
        if (!currentChatId) return;

        try {
            await updateDoc(doc(db, "chats", currentChatId), {
                [`eliminadoPara.${currentUser.uid}`]: true,
                [`borradoHasta.${currentUser.uid}`]: serverTimestamp(),
                actualizadoEn: serverTimestamp()
            });

            currentChatId = null;
            chatMessagesEl.innerHTML = "";
            document.getElementById("chatWindow").classList.add("empty");
            deleteModal.classList.remove("active");

        } catch (err) {
            console.error("Error eliminando chat:", err);
            alert("No se pudo eliminar el chat");
        }
    };
}





let reporteMsgId = null;

function abrirReporte(id) {
    reporteMsgId = id;
    document.getElementById("reportOverlay").classList.add("active");
}

document.getElementById("cancelReport").onclick = () => {
    document.getElementById("reportOverlay").classList.remove("active");
};


// Lógica para enviar el reporte
document.getElementById("sendReport").onclick = async () => {
    const reason = document.getElementById("reportReason").value.trim();
    if (!reason) return alert("Describe el motivo");

    const msgSnap = await getDoc(
        doc(db, "chats", currentChatId, "mensajes", reporteMsgId)
    );

    if (!msgSnap.exists()) return;

    const mensaje = msgSnap.data();

    const reportadoUid = mensaje.de;

    const reportadoSnap = await getDoc(doc(db, "users", reportadoUid));
    const reportadoData = reportadoSnap.data();

    const reportadorSnap = await getDoc(doc(db, "users", currentUser.uid));
    const reportadorData = reportadorSnap.data();

    await addDoc(collection(db, "chat_reports"), {
        chatId: currentChatId,
        mensajeId: reporteMsgId,
        mensajeContenido: mensaje.contenido || "",
        mensajeTipo: mensaje.tipo || "texto",

        reportadoUid,
        reportadoNombre: `${reportadoData?.firstName || ""} ${reportadoData?.lastName || ""}`,
        reportadoRol: reportadoData?.role || "usuario",

        reportadorUid: currentUser.uid,
        reportadorNombre: `${reportadorData?.firstName || ""} ${reportadorData?.lastName || ""}`,
        reportadorRol: reportadorData?.role || "usuario",

        motivoReporte: reason,

        estado: "pendiente",

        creadoEn: serverTimestamp(),
        resueltoEn: null,
        resueltoPor: null,
        advertencia: null
    });



    document.getElementById("reportOverlay").classList.remove("active");
    document.getElementById("reportReason").value = "";

    alert("Reporte enviado correctamente");
};
// FIN REPORTAR



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


const deleteChatBtn = document.getElementById("deleteChatBtn");

if (deleteChatBtn && deleteModal) {
    deleteChatBtn.onclick = () => {
        if (!currentChatId) return;
        deleteModal.classList.add("active");
    };
}

function mostrarAvisoChat(texto, tipo = "error", tiempo = 2500) {
    const box = document.getElementById("chatNotice");
    if (!box) return;

    box.textContent = texto;
    box.className = `chat-notice ${tipo}`;
    box.classList.remove("hidden");

    setTimeout(() => {
        box.classList.add("hidden");
    }, tiempo);
}


window.addEventListener("beforeunload", async () => {
    if (!currentUser) return;

    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            online: false,
            lastSeen: serverTimestamp()
        });
    } catch (e) {
        // silencio intencional
    }
});


//Finalizar asesoría profesional

const finalizarBtn = document.getElementById("finalizarAsesoriaBtn");
const finalizarModal = document.getElementById("finalizarModal");

const cancelFinalizarBtn = document.getElementById("cancelFinalizar");

if (cancelFinalizarBtn && finalizarModal) {
    cancelFinalizarBtn.onclick = () => {
        finalizarModal.classList.remove("active");
    };
}

if (finalizarBtn && finalizarModal) {
    finalizarBtn.onclick = () => {
        finalizarModal.classList.add("active");
    };
}


const confirmFinalizarBtn = document.getElementById("confirmFinalizar");

if (confirmFinalizarBtn) {
    confirmFinalizarBtn.onclick = async (e) => {
        e.preventDefault();

        // CERRAR MODAL INMEDIATAMENTE
        finalizarModal.classList.remove("active");

        const motivo = document.getElementById("motivoFinalizacion").value;
        const descripcion = document
            .getElementById("descripcionFinalizacion")
            .value
            .trim();

        if (!motivo) {
            mostrarAvisoChat("Selecciona un motivo", "error");
            return;
        }

        if (motivo === "otro" && !descripcion) {
            mostrarAvisoChat("Describe el motivo de la finalización", "error");
            return;
        }

        await updateDoc(doc(db, "chats", currentChatId), {
            estadoAsesoria: "finalizada",
            finalizacion: {
                motivo,
                descripcion,
                finalizadaPor: auth.currentUser.uid,
                finalizadaEn: serverTimestamp()
            },
            actualizadoEn: serverTimestamp()
        });

        await addDoc(
            collection(db, "chats", currentChatId, "mensajes"),
            {
                tipo: "texto",
                subtipo: "asesoria_finalizada",
                de: auth.currentUser.uid,

                motivo,
                descripcion,

                contenido: "__ASESORIA_FINALIZADA__",

                enviadoEn: serverTimestamp(),
                enviadoEnLocal: Date.now(),

                leido: false,
                reportado: false
            }
        );


        await updateDoc(
            doc(db, "chats", currentChatId),
            {
                ultimoMensaje: "Asesoría finalizada por el profesional",
                ultimoMensajeTipo: "sistema",
                ultimoMensajeDe: auth.currentUser.uid,
                ultimoMensajeEn: serverTimestamp(),
                actualizadoEn: serverTimestamp()
            }
        );


    };

}

const backToChatsBtn = document.getElementById("backToChats");

if (backToChatsBtn) {
    backToChatsBtn.addEventListener("click", () => {
        document.querySelector(".chat-list").style.display = "block";
        document.getElementById("chatWindow").classList.remove("active");
    });
}


if (cancelRechazoBtn) {
    cancelRechazoBtn.onclick = () => {
        modalMotivoRechazo.classList.remove("active");
        motivoRechazoInput.value = "";
    };
}

if (confirmRechazoBtn) {
    confirmRechazoBtn.onclick = async () => {

        const motivo = motivoRechazoInput.value.trim();
        if (!motivo) {
            alert("Debes explicar el motivo del rechazo.");
            return;
        }

        await updateDoc(doc(db, "chats", currentChatId), {
            estadoAsesoria: "rechazada",
            actualizadoEn: serverTimestamp(),
            pagoPendienteMensajeId: null
        });


        await addDoc(
            collection(db, "chats", currentChatId, "mensajes"),
            {
                tipo: "texto",
                subtipo: "pago_rechazado",
                de: auth.currentUser.uid,
                contenido: "__PAGO_RECHAZADO__",
                motivoRechazo: motivo,
                enviadoEn: serverTimestamp(),
                enviadoEnLocal: Date.now(),
                leido: false,
                reportado: false
            }
        );

        modalMotivoRechazo.classList.remove("active");
        motivoRechazoInput.value = "";
    };
}

if (cancelAprobacionBtn) {
    cancelAprobacionBtn.onclick = () => {
        modalConfirmacionAprobacion.classList.remove("active");
    };
}

if (confirmAprobacionBtn) {
    confirmAprobacionBtn.onclick = async () => {

        await updateDoc(doc(db, "chats", currentChatId), {
            estadoAsesoria: "activa",
            inicioAsesoriaActual: serverTimestamp(),
            actualizadoEn: serverTimestamp()
        });

        await addDoc(
            collection(db, "chats", currentChatId, "mensajes"),
            {
                tipo: "texto",
                subtipo: "pago_aprobado",
                de: auth.currentUser.uid,
                contenido: "__PAGO_APROBADO__",
                enviadoEn: serverTimestamp(),
                enviadoEnLocal: Date.now(),
                leido: false,
                reportado: false
            }
        );

        modalConfirmacionAprobacion.classList.remove("active");
    };
}
