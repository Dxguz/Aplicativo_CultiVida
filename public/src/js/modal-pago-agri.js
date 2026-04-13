import { db, auth } from "./firebase.js";
import {
    doc,
    getDoc,
    collection,
    addDoc,
    serverTimestamp,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { uploadToCloudinary } from "./cloudinary-api.js";

import { openOrCreateChat } from "./chat-service.js";

let profesionalSeleccionadoId = null;

const modalPago = new bootstrap.Modal(
    document.getElementById("modalPago")
);

const infoCuentaDestino = document.getElementById("infoCuentaDestino");
const tarifasVisualizacion = document.getElementById("tarifasVisualizacion");

const medioPagoSelect = document.getElementById("medioPago");
const campoMedioPagoOtro = document.getElementById("campoMedioPagoOtro");
const medioPagoOtroInput = document.getElementById("medioPagoOtro");


medioPagoSelect.addEventListener("change", () => {
    if (medioPagoSelect.value === "Otro") {
        campoMedioPagoOtro.classList.remove("d-none");
        medioPagoOtroInput.setAttribute("required", "true");
    } else {
        campoMedioPagoOtro.classList.add("d-none");
        medioPagoOtroInput.removeAttribute("required");
        medioPagoOtroInput.value = "";
    }
});



/* ============================
   FUNCIÓN ABRIR MODAL
   ============================ */
export async function abrirModalPago(uidProfesional) {

    profesionalSeleccionadoId = uidProfesional;

    const snap = await getDoc(doc(db, "users", uidProfesional));
    const data = snap.data();

    if (!data?.configPagos?.activo) {
        mostrarToast("Este profesional ofrece asesorías gratuitas.");
        return;
    }


    const config = data.configPagos;

    // Mostrar cuenta destino
    infoCuentaDestino.innerHTML = `
    <strong>Cuenta destino:</strong><br>
    Banco: ${config.cuentaDestino.banco}<br>
    Tipo: ${config.cuentaDestino.tipoCuenta}<br>
    Número: ${config.cuentaDestino.numeroCuenta}<br>
    Titular: ${config.cuentaDestino.titular}
  `;

    // Mostrar tarifas
    tarifasVisualizacion.innerHTML = "";

    config.tarifas.forEach(t => {
        const col = document.createElement("div");
        col.className = "col-md-6";

        col.innerHTML = `
      <div class="card border-success shadow-sm h-100">
        <div class="card-body">
          <h6 class="fw-bold">${t.nombre}</h6>
          <div class="text-success fw-bold mb-2">
            $${Number(t.precio).toLocaleString()}
          </div>
          <p class="small text-muted mb-0">${t.descripcion}</p>
        </div>
      </div>
    `;

        tarifasVisualizacion.appendChild(col);
    });

    modalPago.show();
}

function mostrarToast(mensaje) {

    const toast = document.createElement("div");
    toast.className = "custom-toast";
    toast.innerHTML = `
        <i class="fa-solid fa-circle-info me-2"></i>
        ${mensaje}
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* ============================
   CONFIRMAR PAGO
============================ */
document.getElementById("confirmarPagoBtn")
    .addEventListener("click", async () => {

        const user = auth.currentUser;
        if (!user) {
            alert("Debes iniciar sesión.");
            return;
        }

        const form = document.getElementById("formPago");

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        try {

            const comprobanteFile =
                document.getElementById("comprobantePago").files[0];

            let comprobanteURL = null;

            if (comprobanteFile) {
                comprobanteURL = await uploadToCloudinary(
                    comprobanteFile,
                    "comprobantes_pago",
                    "image"
                );
            }


            // Obtener valores
            const nombre = document.getElementById("nombrePagador").value.trim();
            const tipoDocumento = document.getElementById("tipoDocumento").value;
            const documento = document.getElementById("numeroDocumento").value.trim();
            const banco = document.getElementById("bancoOrigen").value.trim();
            const medioPago = medioPagoSelect.value === "Otro"
                ? medioPagoOtroInput.value.trim()
                : medioPagoSelect.value;
            const cuentaOrigen = document.getElementById("cuentaOrigen").value.trim();
            const descripcion = document.getElementById("descripcionPago").value.trim();


            // Usar chat existente o crearlo si no existe
            const chatId = await openOrCreateChat(
                user.uid,
                profesionalSeleccionadoId
            );


            // Ponerlo en pendiente
            await updateDoc(doc(db, "chats", chatId), {
                estadoAsesoria: "pendiente_aprobacion",
                tipoAsesoria: "paga",
                inicioAsesoriaActual: null,
                actualizadoEn: serverTimestamp(),
                ultimoMensaje: "Pago pendiente de aprobación",
                ultimoMensajeTipo: "sistema",
                ultimoMensajeDe: user.uid,
                ultimoMensajeEn: serverTimestamp()
            });


            //Enviar mensaje resumen pago
            // Enviar mensaje resumen pago
            const mensajeRef = await addDoc(
                collection(db, "chats", chatId, "mensajes"),
                {
                    de: user.uid,
                    tipo: "texto",
                    subtipo: "resumen_pago",
                    contenido: "Pago enviado para validación",
                    pagoData: {
                        nombre,
                        tipoDocumento,
                        documento,
                        banco,
                        medioPago,
                        cuentaOrigen,
                        descripcion,
                        comprobanteURL
                    },
                    enviadoEn: serverTimestamp(),
                    enviadoEnLocal: Date.now(),
                    leido: false,
                    reportado: false
                }
            );

            // Guardar cuál es el pago vigente
            await updateDoc(doc(db, "chats", chatId), {
                pagoPendienteMensajeId: mensajeRef.id
            });



            modalPago.hide();

            window.location.href = `chats-prof.html?chatId=${chatId}`;

        } catch (err) {
            console.error("Error completo:", err);
            console.error("Código:", err.code);
            console.error("Mensaje:", err.message);
            alert("No se pudo procesar el pago.");
        }


    });
