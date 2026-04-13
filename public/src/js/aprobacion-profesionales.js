import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const lista = document.getElementById("listaProfesionales");
const tabs = document.querySelectorAll(".tab-btn");

let estadoActual = "pendiente";
let uidSeleccionado = null;
let accionActual = null; // "rechazo" | "suspension"

function marcar(label, campo, p) {
    return p.camposModificados?.includes(campo)
        ? `<span style="color:#f0ad4e;font-weight:600">*</span> ${label}`
        : label;
}


/* =========================
   CARGAR PROFESIONALES
========================= */
async function cargarProfesionales() {
    lista.innerHTML = "";

    let q;

    if (estadoActual === "suspendido") {
        q = query(
            collection(db, "users"),
            where("role", "==", "profesional")
        );
    } else {
        q = query(
            collection(db, "users"),
            where("role", "==", "profesional"),
            where("estadoAprobacion", "==", estadoActual)
        );
    }


    const snap = await getDocs(q);

    if (snap.empty) {
        lista.innerHTML = `<p class="text-muted">No hay profesionales en este estado.</p>`;
        return;
    }

    snap.forEach(d => {
        const p = d.data();

        // FILTRO ADMIN (NO usar where)
        if (p.ocultoAdmin === true) return;

        // NUNCA mostrar suspendidos fuera del tab suspendido
        if (p.suspendido === true && estadoActual !== "suspendido") return;


        // evitar perfiles incompletos en aprobados
        if (
            estadoActual === "aprobado" &&
            (!p.firstName || !p.numeroDocumento)
        ) {
            return;
        }

        // TAB SUSPENDIDOS
        if (estadoActual === "suspendido" && p.suspendido !== true) return;

        // TAB APROBADOS
        if (estadoActual === "aprobado" && p.suspendido === true) return;


        const card = document.createElement("div");
        card.className = "prof-card";

        card.innerHTML = `
      <div>
        <h5>${p.firstName ? `${p.firstName} ${p.lastName}` : "Profesional agrónomo"}</h5>
        <div class="email">${p.email}</div>

        <span class="estado ${p.suspendido ? "suspendido" : estadoActual}">
          ${p.suspendido ? "SUSPENDIDO" : estadoActual.toUpperCase()}
        </span>

        ${p.motivoRechazo ? `<p class="text-danger mt-2">${p.motivoRechazo}</p>` : ""}
        ${p.motivoSuspension ? `<p class="text-warning mt-2">${p.motivoSuspension}</p>` : ""}
        ${p.requiereRevision && estadoActual === "suspendido"
                ? `<span class="badge bg-warning">⚠ Revisar formulario reenviado</span>`
                : ""}

${p.requiereRevision && estadoActual === "aprobado"
                ? `<span class="badge bg-info">🆕 Cambios recientes</span>`
                : ""}


      </div>

      <div class="card-actions">
        <button class="btn btn-outline-primary ver">Ver profesional</button>

        ${estadoActual === "pendiente"
                ? `
              <button class="btn btn-success aprobar">Aprobar</button>
              <button class="btn btn-danger rechazar">Rechazar</button>
            `
                : estadoActual === "rechazado"
                    ? `<button class="btn btn-outline-danger eliminar">Eliminar</button>`
                    : ""
            }
      </div>
    `;

        /* =========================
           VER PROFESIONAL
        ========================= */
        card.querySelector(".ver").addEventListener("click", async () => {

            document.getElementById("detalleProfesional").innerHTML = `
  <p>
    <strong>${marcar("Nombre", "firstName", p)}:</strong>
    ${p.firstName || ""} ${p.lastName || ""}
  </p>

  <p>
    <strong>${marcar("Correo", "email", p)}:</strong>
    ${p.email}
  </p>

  <p>
    <strong>${marcar("Género", "genero", p)}:</strong>
    ${p.genero || "—"}
  </p>

  <p>
    <strong>${marcar("Tipo de documento", "tipoDocumento", p)}:</strong>
    ${p.tipoDocumento || "—"}
  </p>

  <p>
    <strong>${marcar("Número de documento", "numeroDocumento", p)}:</strong>
    ${p.numeroDocumento || "—"}
  </p>

  <p>
    <strong>${marcar("Teléfono", "telefono", p)}:</strong>
    ${p.telefono || "—"}
  </p>

  <p>
    <strong>${marcar("Institución", "institucion", p)}:</strong>
    ${p.institucion || "—"}
  </p>

  <p>
    <strong>${marcar("Título profesional", "tituloName", p)}:</strong>
    ${p.tituloName || "—"}
  </p>

  <p>
    <strong>${marcar("Experiencia", "experiencia", p)}:</strong>
    ${p.experiencia
                    ? `${p.experiencia.cantidad} ${p.experiencia.unidad}`
                    : "—"}
  </p>

  <p>
    <strong>${marcar("Especialidades", "especialidades", p)}:</strong>
    ${p.especialidades || "—"}
  </p>

  <p>
    <strong>${marcar("Modalidad de atención", "modalidad", p)}:</strong>
    ${[
                    p.modalidadPresencial ? "Presencial" : null,
                    p.modalidadVirtual ? "Virtual" : null
                ].filter(Boolean).join(" / ") || "—"}
  </p>

  <p>
    <strong>${marcar("Descripción", "descripcion", p)}:</strong><br>
    ${p.descripcion || "—"}
  </p>

  <hr>

  <p>
    <strong>${marcar("Documento de identidad", "documentoURL", p)}:</strong><br>
    ${p.documentoURL
                    ? p.documentoURL.endsWith(".pdf")
                        ? `<a href="${p.documentoURL}" target="_blank">📄 Ver PDF</a>`
                        : `<img src="${p.documentoURL}" style="max-width:150px;border-radius:8px">`
                    : "No adjunto"}
  </p>

  <p>
    <strong>${marcar("Soporte título profesional", "soporteTituloURL", p)}:</strong><br>
    ${p.soporteTituloURL
                    ? p.soporteTituloURL.endsWith(".pdf")
                        ? `<a href="${p.soporteTituloURL}" target="_blank">📄 Ver PDF</a>`
                        : `<img src="${p.soporteTituloURL}" style="max-width:150px;border-radius:8px">`
                    : "No adjunto"}
  </p>
`;


            // ⚠️ SOLO quitar el badge visual, NO borrar camposModificados aquí
            if (p.requiereRevision) {
                await updateDoc(doc(db, "users", d.id), {
                    requiereRevision: false
                });
            }

            manejarBotonesEstado(p, d.id);
            new bootstrap.Modal("#modalVerProfesional").show();
        });


        /* =========================
           APROBAR
        ========================= */
        card.querySelector(".aprobar")?.addEventListener("click", async () => {
            await updateDoc(doc(db, "users", d.id), {
                estadoAprobacion: "aprobado",
                motivoRechazo: null,
                suspendido: false,
                motivoSuspension: null,
                requiereRevision: false,
                camposModificados: []
            });
            cargarProfesionales();
        });

        /* =========================
           RECHAZAR
        ========================= */
        card.querySelector(".rechazar")?.addEventListener("click", () => {
            uidSeleccionado = d.id;
            accionActual = "rechazo";
            document.getElementById("motivoRechazo").value = "";
            document.getElementById("modalRechazoTitulo").textContent =
                "Rechazar profesional";
            //new bootstrap.Modal("#modalRechazo").show();
            const modalPerfil = bootstrap.Modal.getInstance(
                document.getElementById("modalVerProfesional")
            );

            modalPerfil.hide();

            setTimeout(() => {
                new bootstrap.Modal("#modalRechazo").show();
            }, 300);

        });

        /* =========================
           ELIMINAR DEL HISTORIAL
        ========================= */
        card.querySelector(".eliminar")?.addEventListener("click", async () => {
            await updateDoc(doc(db, "users", d.id), {
                ocultoAdmin: true
            });
            cargarProfesionales();
        });

        lista.appendChild(card);
    });
}

/* =========================
   CONFIRMAR RECHAZO / SUSPENSIÓN
========================= */
document.getElementById("confirmarRechazo").addEventListener("click", async () => {
    const motivo = document.getElementById("motivoRechazo").value.trim();
    if (!motivo || !uidSeleccionado) return;

    if (accionActual === "rechazo") {
        await updateDoc(doc(db, "users", uidSeleccionado), {
            estadoAprobacion: "rechazado",
            motivoRechazo: motivo,
            suspendido: false
        });
    }

    if (accionActual === "suspension") {
        await updateDoc(doc(db, "users", uidSeleccionado), {
            suspendido: true,
            estadoAprobacion: "aprobado",
            motivoSuspension: motivo,
            requiereRevision: false,
            camposModificados: []
        });
    }

    uidSeleccionado = null;
    accionActual = null;

    bootstrap.Modal.getInstance(
        document.getElementById("modalRechazo")
    ).hide();

    cargarProfesionales();
});

/* =========================
   TABS
========================= */
tabs.forEach(t => {
    t.addEventListener("click", () => {
        tabs.forEach(b => b.classList.remove("active"));
        t.classList.add("active");
        estadoActual = t.dataset.filter;
        cargarProfesionales();
    });
});

/* =========================
   SUSPENDER / REACTIVAR
========================= */
function manejarBotonesEstado(p, uid) {
    const btnSusp = document.getElementById("btnSuspender");
    const btnReac = document.getElementById("btnReactivar");

    btnSusp.classList.add("d-none");
    btnReac.classList.add("d-none");

    if (p.estadoAprobacion === "aprobado" && !p.suspendido) {
        btnSusp.classList.remove("d-none");
        btnSusp.onclick = () => {
            uidSeleccionado = uid;
            accionActual = "suspension";
            document.getElementById("motivoRechazo").value = "";
            document.getElementById("modalRechazoTitulo").textContent =
                "Suspender profesional";

            const modalPerfil = bootstrap.Modal.getInstance(
                document.getElementById("modalVerProfesional")
            );

            modalPerfil.hide();

            setTimeout(() => {
                new bootstrap.Modal("#modalRechazo").show();
            }, 300);
        };

    }

    if (p.suspendido) {
        btnReac.classList.remove("d-none");
        btnReac.onclick = async () => {
            await updateDoc(doc(db, "users", uid), {
                suspendido: false,
                estadoAprobacion: "aprobado",
                motivoSuspension: null,
                requiereRevision: false,
                camposModificados: []
            });

            location.reload();
        };
    }
}

/* INIT */
cargarProfesionales();
