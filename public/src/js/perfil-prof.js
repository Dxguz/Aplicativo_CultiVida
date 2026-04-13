import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { openOrCreateChat } from "./chat-service.js";
import { auth } from "./firebase.js";
import { abrirModalPago } from "./modal-pago-agri.js";


import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";


/* =========================
   ELEMENTOS DOM
========================= */
const grid = document.getElementById("profGrid");
const searchInput = document.getElementById("searchProf");

/* MODAL */
const modal = document.getElementById("profModal");
const mAvatarContainer = document.getElementById("mAvatarContainer");
const mName = document.getElementById("mName");
const mTitle = document.getElementById("mTitle");
const mMeta = document.getElementById("mMeta");
const mDesc = document.getElementById("mDesc");
const modalCloseEls = modal.querySelectorAll(".modal-close, #modalClose");

let profesionalActual = null;
let profesionalActualId = null;
let modalRequierePago = null;
let irAPagarBtn = null;



/* =========================
   CARGAR PROFESIONALES
========================= */
async function cargarProfesionales() {
  grid.innerHTML = "";

  const q = query(
    collection(db, "users"),
    where("role", "==", "profesional"),
    where("estadoAprobacion", "==", "aprobado"),
    where("suspendido", "==", false)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    grid.innerHTML = `<p class="muted">No hay profesionales disponibles.</p>`;
    return;
  }

  snap.forEach(docu => {
    const p = docu.data();

    // Seguridad extra
    if (p.ocultoAdmin === true) return;
    if (!p.profileCompleted) return;

    const nombreCompleto = `${p.firstName || ""} ${p.lastName || ""}`.trim();
    const tieneFoto = !!p.photoURL;

    /* =========================
       CARD (SOLO NOMBRE + TÍTULO)
    ========================= */
    const card = document.createElement("article");
    card.className = "prof-card";
    card.dataset.name = nombreCompleto.toLowerCase();

    card.innerHTML = `
      <div class="prof-avatar">
  ${tieneFoto
        ? `<img src="${p.photoURL}" alt="${nombreCompleto}">`
        : `<div class="avatar-placeholder">
           <i class="fa-solid fa-user"></i>
         </div>`
      }
</div>

      <div class="prof-body">
        <h3 class="prof-name">${nombreCompleto || "Profesional Agrónomo"}</h3>
        <div class="prof-title">${p.tituloName || "Profesional Agrónomo"}</div>
      </div>

      <div class="prof-actions">
        <button class="btn-outline viewBtn">Ver perfil</button>
      </div>
    `;

    card.querySelector(".viewBtn").addEventListener("click", () => abrirModal(p));

    grid.appendChild(card);
  });
}

/* =========================
   MODAL PERFIL (DETALLE)
========================= */
function abrirModal(p) {
  profesionalActual = p;
  profesionalActualId = p.uid;

  const especialidades = Array.isArray(p.especialidades)
    ? p.especialidades
    : [];

  const experienciaTxt = p.experiencia
    ? `${p.experiencia.cantidad} ${p.experiencia.unidad}`
    : "—";

  if (p.photoURL) {
    mAvatarContainer.innerHTML = `
    <img src="${p.photoURL}" alt="${p.firstName || ""} ${p.lastName || ""}">
  `;
  } else {
    mAvatarContainer.innerHTML = `
    <div class="avatar-placeholder">
      <i class="fa-solid fa-user"></i>
    </div>
  `;
  }

  mName.textContent = `${p.firstName || ""} ${p.lastName || ""}`.trim();
  mTitle.textContent = p.tituloName || "Profesional Agrónomo";

  const tienePagosActivos = p.configPagos?.activo === true;

  const tagTipoAsesoria = tienePagosActivos
    ? `<span class="tag tag-costo">Asesorías con costo</span>`
    : `<span class="tag tag-gratis">Asesorías gratuitas</span>`;

  mMeta.innerHTML = `
  <span class="badge">${experienciaTxt}</span>
  ${tagTipoAsesoria}
  ${especialidades.length
      ? especialidades.map(e => `<span class="tag">${e}</span>`).join("")
      : `<span class="tag muted">Sin especialidades</span>`
    }
`;


  mDesc.textContent = p.descripcion || "Sin descripción disponible.";

  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  // Guardar profesional actual para contacto
  modal.dataset.professionalId = p.uid;

}


/* =========================
   CERRAR MODAL
========================= */
function cerrarModal() {
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

modal.querySelector(".prof-modal-backdrop").addEventListener("click", cerrarModal);
modalCloseEls.forEach(btn => btn.addEventListener("click", cerrarModal));
document.addEventListener("keydown", e => {
  if (e.key === "Escape") cerrarModal();
});

/* =========================
   BUSCADOR (SOLO NOMBRE)
========================= */
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  document.querySelectorAll(".prof-card").forEach(card => {
    card.style.display = card.dataset.name.includes(q) ? "" : "none";
  });
});

const btnContactar = document.getElementById("modalContact");

btnContactar.addEventListener("click", async () => {
  if (!profesionalActual) return;

  const user = auth.currentUser;
  if (!user) {
    alert("Debes iniciar sesión.");
    return;
  }

  try {

    // Verificar si profesional es de pago
    const profSnap = await getDoc(doc(db, "users", profesionalActual.uid));
    const profData = profSnap.data();

    const esDePago = profData?.configPagos?.activo === true;

    if (esDePago) {
      cerrarModal();
      modalRequierePago.show();
      return;
    }


    // Si es gratuito → flujo normal
    const chatId = await openOrCreateChat(
      user.uid,
      profesionalActual.uid
    );

    cerrarModal();
    window.location.href = `chats-prof.html?chatId=${chatId}`;

  } catch (err) {
    console.error("Error iniciando chat:", err);
    alert("No se pudo iniciar el chat.");
  }
});



document.getElementById("modalPagoBtn")
  .addEventListener("click", () => {
    if (!profesionalActualId) return;

    // Cerrar modal de perfil
    cerrarModal();

    // Abrir modal de pago
    abrirModalPago(profesionalActualId);
  });


document.addEventListener("DOMContentLoaded", () => {

  const modalEl = document.getElementById("modalRequierePago");

  if (modalEl && window.bootstrap) {
    modalRequierePago = new bootstrap.Modal(modalEl);
  }

  irAPagarBtn = document.getElementById("irAPagarBtn");

  if (irAPagarBtn) {
    irAPagarBtn.addEventListener("click", () => {
      if (!profesionalActual) return;

      modalRequierePago?.hide();

      setTimeout(() => {
        abrirModalPago(profesionalActual.uid);
      }, 300);

    });
  }

});


/* INIT */
cargarProfesionales();
