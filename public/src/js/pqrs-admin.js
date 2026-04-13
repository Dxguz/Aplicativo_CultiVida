import { 
  obtenerTodasPQRS, 
  actualizarPQRS, 
  marcarComoNotificada,
  crearNotificacionInterna,
  filtrarPQRS 
} from "./pqrs-admin-firebase.js";

const tablaBody = document.querySelector("#tablaPQRSAdmin tbody");
const filtroRol = document.getElementById("filtroRol");
const filtroEstado = document.getElementById("filtroEstado");
const modalGestion = document.getElementById("modalGestion");
const modalNotificacion = document.getElementById("modalNotificacion");
const modalExito = document.getElementById("modalExito");
const cerrarModal = document.getElementById("cerrarModal");
const contenidoGestion = document.getElementById("contenidoGestion");
const btnCerrarNotificacion = document.getElementById("btnCerrarNotificacion");
const btnCerrarExito = document.getElementById("btnCerrarExito");

let todasLasPQRS = [];
let pqrsMostradas = [];


function rolIcono(rol) {
  switch ((rol || "").toLowerCase()) {
    case "agricultor": 
      return `<span class="rol-agricultor"><i class="fas fa-tractor"></i> Agricultor</span>`;
    case "agrónomo": 
      return `<span class="rol-agronomo"><i class="fas fa-seedling"></i> Agrónomo</span>`;
    case "mujer rural": 
      return `<span class="rol-mujer"><i class="fas fa-female"></i> Mujer Rural</span>`;
    case "externo": 
      return `<span class="rol-externo"><i class="fas fa-user"></i> Externo</span>`;
    default: 
      return rol;
  }
}


function estadoIcono(estado) {
  switch ((estado || "").toLowerCase()) {
    case "radicada": 
      return `<span class="estado-radicada"><i class="fas fa-file-alt"></i> Radicada</span>`;
    case "en proceso": 
      return `<span class="estado-proceso"><i class="fas fa-hourglass-half"></i> En proceso</span>`;
    case "respondida": 
      return `<span class="estado-respondida"><i class="fas fa-check-circle"></i> Respondida</span>`;
    case "cerrada": 
      return `<span class="estado-cerrada"><i class="fas fa-lock"></i> Cerrada</span>`;
    default: 
      return estado;
  }
}

/**
 * Color según estado
 */
function colorPorEstado(estado) {
  switch ((estado || "").toLowerCase()) {
    case "radicada": return "#fbc02d";
    case "en proceso": return "#0288d1";
    case "respondida": return "#2e7d32";
    case "cerrada": return "#bb1212";
    default: return "#bdc3c7";
  }
}

/**
 * Renderiza la tabla de PQRS
 */
function renderizarTabla(pqrs) {
  tablaBody.innerHTML = "";

  if (!pqrs || pqrs.length === 0) {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td colspan="7" style="text-align:center;">📭 No hay PQRS</td>`;
    tablaBody.appendChild(fila);
    return;
  }

  pqrs.forEach((p) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.radicado || "N/A"}</td>
      <td>${p.fecha || "N/A"}</td>
      <td>${rolIcono(p.rol)}</td>
      <td>${estadoIcono(p.estado)}</td>
      <td>${p.tipo || "N/A"}</td>
      <td>${(p.mensaje || "").substring(0, 80)}...</td>
      <td>
        <button class="btn-notificar" data-id="${p.id}" title="Enviar notificación">
          <i class="fas fa-bell"></i>
        </button>
        <button class="btn-gestionar" data-id="${p.id}">
          <i class="fas fa-tools"></i> Gestionar
        </button>
      </td>
    `;

    tablaBody.appendChild(fila);

    // Color dinámico de la campana según estado y notificación
    const btnNotif = fila.querySelector(".btn-notificar");
    
    // Si ya fue notificada, mostrar el color del estado actual
    // Si no fue notificada, gris claro
    if (p.notificado) {
      btnNotif.style.backgroundColor = colorPorEstado(p.estado);
      btnNotif.style.color = "white";
      btnNotif.title = `Notificado - Estado: ${p.estado}`;
    } else {
      btnNotif.style.backgroundColor = "#f0f0f0";
      btnNotif.style.color = "#666";
      btnNotif.title = "Pendiente de notificar";
    }
  });
}

/**
 * Carga todas las PQRS desde Firebase
 */
async function cargarPQRS() {
  try {
    console.log("⏳ Cargando PQRS desde Firebase...");
    todasLasPQRS = await obtenerTodasPQRS();
    pqrsMostradas = todasLasPQRS;
    renderizarTabla(pqrsMostradas);
    console.log("✅ PQRS cargadas:", todasLasPQRS.length);
  } catch (error) {
    console.error("❌ Error cargando PQRS:", error);
    alert("❌ Error al cargar PQRS");
  }
}

/**
 * Aplica filtros a la tabla
 */
function aplicarFiltros() {
  const rolFiltro = filtroRol.value;
  const estadoFiltro = filtroEstado.value;

  pqrsMostradas = filtrarPQRS(todasLasPQRS, rolFiltro, estadoFiltro);
  renderizarTabla(pqrsMostradas);
  console.log(`🔍 Filtros aplicados: ${pqrsMostradas.length} PQRS encontradas`);
}

// ==================== EVENT LISTENERS ====================

// Crear botón limpiar filtros
const btnLimpiar = document.createElement("button");
btnLimpiar.textContent = "Limpiar filtros";
btnLimpiar.classList.add("btn", "btn-secondary", "ms-2");
document.querySelector(".titulo-admin").appendChild(btnLimpiar);

btnLimpiar.addEventListener("click", () => {
  filtroRol.value = "";
  filtroEstado.value = "";
  pqrsMostradas = todasLasPQRS;
  renderizarTabla(pqrsMostradas);
  console.log("🔄 Filtros limpiados");
});

// Filtros
filtroRol.addEventListener("change", aplicarFiltros);
filtroEstado.addEventListener("change", aplicarFiltros);

// ==================== BOTÓN GESTIONAR ====================

tablaBody.addEventListener("click", (e) => {
  const btnGestionar = e.target.closest(".btn-gestionar");
  if (!btnGestionar) return;

  const pqrsId = btnGestionar.dataset.id;
  const p = todasLasPQRS.find(x => x.id === pqrsId);

  if (!p) {
    alert("❌ PQRS no encontrada");
    return;
  }

  contenidoGestion.innerHTML = `
    <h4>Resumen PQRS</h4>
    <p><strong>Radicado:</strong> ${p.radicado}</p>
    <p><strong>Fecha:</strong> ${p.fecha}</p>
    <p><strong>Rol:</strong> ${rolIcono(p.rol)}</p>
    <p><strong>Tipo:</strong> ${p.tipo}</p>
    <p><strong>Descripción:</strong> ${p.mensaje}</p>
    <p><strong>Email:</strong> ${p.correo}</p>

    <label>Estado:</label>
    <select id="estadoSelect">
      <option ${p.estado === "Radicada" ? "selected" : ""}>Radicada</option>
      <option ${p.estado === "En proceso" ? "selected" : ""}>En proceso</option>
      <option ${p.estado === "Respondida" ? "selected" : ""}>Respondida</option>
      <option ${p.estado === "Cerrada" ? "selected" : ""}>Cerrada</option>
    </select>

    <label>Respuesta:</label>
    <textarea id="respuestaInput">${p.respuesta || ""}</textarea>

    <button id="btnGuardar" data-id="${pqrsId}">
      <i class="fas fa-save"></i> Guardar
    </button>
  `;

  modalGestion.style.display = "block";
});

// ==================== GUARDAR CAMBIOS ====================

contenidoGestion.addEventListener("click", async (e) => {
  const btnGuardar = e.target.closest("#btnGuardar");
  if (!btnGuardar) return;

  const pqrsId = btnGuardar.dataset.id;
  const nuevoEstado = document.getElementById("estadoSelect").value;
  const respuesta = document.getElementById("respuestaInput").value;

  try {
    console.log("💾 Guardando cambios en PQRS...");
    await actualizarPQRS(pqrsId, nuevoEstado, respuesta);
    
    // Actualizar en memoria
    const pqrs = todasLasPQRS.find(x => x.id === pqrsId);
    if (pqrs) {
      pqrs.estado = nuevoEstado;
      pqrs.respuesta = respuesta;
      pqrs.notificado = false;
    }

    modalGestion.style.display = "none";
    modalExito.style.display = "block";
    
    renderizarTabla(pqrsMostradas);
    console.log("✅ PQRS actualizada correctamente");
  } catch (error) {
    console.error("❌ Error al guardar:", error);
    alert("❌ Error al guardar cambios");
  }
});

// ==================== BOTÓN NOTIFICAR ====================

tablaBody.addEventListener("click", async (e) => {
  const btnNotif = e.target.closest(".btn-notificar");
  if (!btnNotif) return;

  const pqrsId = btnNotif.dataset.id;
  const pqrs = todasLasPQRS.find(x => x.id === pqrsId);

  if (!pqrs) {
    alert("❌ PQRS no encontrada");
    return;
  }

  try {
    // 🔔 CREAR NOTIFICACIÓN
    console.log("🔔 Creando notificación...");
    await crearNotificacionInterna(pqrs);

    // Marcar PQRS como notificada
    await marcarComoNotificada(pqrsId);
    pqrs.notificado = true;

    modalNotificacion.style.display = "block";
    renderizarTabla(pqrsMostradas);
    
    console.log(`✅ Notificación enviada correctamente`);

  } catch (error) {
    console.error("❌ Error al notificar:", error);
    alert("❌ Error al enviar notificación");
  }
});

// ==================== CERRAR MODALES ====================

cerrarModal.addEventListener("click", () => {
  modalGestion.style.display = "none";
});

btnCerrarNotificacion.addEventListener("click", () => {
  modalNotificacion.style.display = "none";
});

btnCerrarExito.addEventListener("click", () => {
  modalExito.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modalGestion) modalGestion.style.display = "none";
});


document.addEventListener("DOMContentLoaded", () => {
  cargarPQRS();
});