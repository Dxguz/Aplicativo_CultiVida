import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp,
    addDoc,
    increment
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";



const container = document.getElementById("reportsContainer");
const emptyState = document.getElementById("emptyState");

const modal = document.getElementById("advertenciaModal");
const tipoSelect = document.getElementById("advertenciaTipo");
const otroWrap = document.getElementById("advertenciaOtroWrap");
const descripcionInput = document.getElementById("advertenciaDescripcion");

let reporteActual = null;

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-message ${type === "error" ? "toast-error" : ""}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}


function formatearRol(rol) {
    if (!rol) return "Usuario";

    if (rol === "agricultor") return "Agricultor";
    if (rol === "profesional") return "Profesional";
    if (rol === "mujer_rural") return "Mujer Rural";

    return rol;
}


/* =========================
   CARGAR REPORTES
========================= */

const q = query(
    collection(db, "chat_reports"),
    where("estado", "==", "pendiente")
);

onSnapshot(q, snap => {

    container.innerHTML = "";

    if (snap.empty) {
        emptyState.classList.remove("d-none");
        return;
    }

    emptyState.classList.add("d-none");

    snap.forEach(docSnap => {
        renderReporte(docSnap.id, docSnap.data());
    });
});

/* =========================
   RENDER CARD
========================= */

function renderReporte(id, data) {

    const card = document.createElement("div");
    card.className = "report-card";

    card.innerHTML = `
        <div class="report-meta">
            <strong>Reportado:</strong> ${data.reportadoNombre} (${formatearRol(data.reportadoRol)})

        </div>

        <div class="report-meta">
    <strong>Reportado por:</strong> ${data.reportadorNombre} (${formatearRol(data.reportadorRol)})

</div>


        <div class="report-message">
            "${data.mensajeContenido}"
        </div>

        <div class="report-meta">
            <strong>Motivo:</strong> ${data.motivoReporte}
        </div>

        <div class="report-actions">
            <button class="btn btn-outline-secondary btn-sm ignore-btn">
                Ignorar
            </button>
            <button class="btn btn-warning btn-sm warn-btn">
                Advertir
            </button>
        </div>
    `;

    card.querySelector(".ignore-btn")
        .addEventListener("click", () => ignorarReporte(id, data));

    card.querySelector(".warn-btn")
        .addEventListener("click", () => abrirModal(id, data));

    container.appendChild(card);
}

/* =========================
   IGNORAR
========================= */

async function ignorarReporte(id, data) {

    await updateDoc(doc(db, "chat_reports", id), {
        estado: "ignorado",
        resueltoEn: serverTimestamp(),
        resueltoPor: "admin"
    });

    await crearNotificacion({
        tipo: "reporte-chat-procesado",
        titulo: "Reporte revisado",
        cuerpo: `Tu reporte sobre el mensaje "${data.mensajeContenido}" contra ${data.reportadoNombre} fue revisado y no se encontraron infracciones.`,
        usuarios: [data.reportadorUid]
    });
}

/* =========================
   MODAL
========================= */

function abrirModal(id, data) {
    reporteActual = { id, data };
    modal.classList.add("active");
}

document.getElementById("cancelAdvertencia")
    .onclick = () => modal.classList.remove("active");

tipoSelect.addEventListener("change", () => {
    if (tipoSelect.value === "otros") {
        otroWrap.classList.remove("d-none");
    } else {
        otroWrap.classList.add("d-none");
        descripcionInput.value = "";
    }
});

/* =========================
   CONFIRMAR ADVERTENCIA
========================= */

document.getElementById("confirmAdvertencia")
    .addEventListener("click", async () => {

        if (!tipoSelect.value) {
            showToast("Selecciona un motivo", "error");
            return;
        }

        if (tipoSelect.value === "otros" && !descripcionInput.value.trim()) {
            showToast("Describe el motivo", "error");
            return;
        }

        const { id, data } = reporteActual;

        await updateDoc(doc(db, "chat_reports", id), {
            estado: "advertido",
            resueltoEn: serverTimestamp(),
            resueltoPor: "admin",
            advertencia: {
                tipo: tipoSelect.value,
                descripcion: descripcionInput.value || null
            }
        });

        await updateDoc(doc(db, "users", data.reportadoUid), {
            advertenciasCount: increment(1)
        });

        /* Notificación al reportado */
        await crearNotificacion({
            tipo: "advertencia-chat",
            titulo: "Has recibido una advertencia",
            cuerpo: `El mensaje que enviaste: 
"${data.mensajeContenido}"<br>

Fue reportado por ${data.reportadorNombre} (${formatearRol(data.reportadorRol)}).<br>

Resolución: ${tipoSelect.value === "otros"
                    ? descripcionInput.value
                    : tipoSelect.options[tipoSelect.selectedIndex].text
                }.`,

            usuarios: [data.reportadoUid]
        });


        /* Notificación al reportador */
        await crearNotificacion({
            tipo: "reporte-chat-procesado",
            titulo: "Reporte procesado correctamente",
            cuerpo: `Tu reporte sobre el mensaje "${data.mensajeContenido}" contra ${data.reportadoNombre} fue procesado y se tomaron medidas.`,
            usuarios: [data.reportadorUid]
        });

        modal.classList.remove("active");
        tipoSelect.value = "";
        descripcionInput.value = "";
        otroWrap.classList.add("d-none");

        showToast("Advertencia enviada correctamente");

    });

/* =========================
   CREAR NOTIFICACIÓN
========================= */

async function crearNotificacion(noti) {
    await addDoc(collection(db, "user_notifications"), {
        ...noti,
        leidoPor: [],
        creadoEn: serverTimestamp()
    });
}
