import { guardarPQRS } from "./pqrs-firebase.js";

// ==================== ELEMENTOS DEL DOM ====================
const form = document.getElementById("formPQRS");
const popup = document.getElementById("popup");
const popupRadicado = document.getElementById("popupRadicado");
const popupContrasena = document.getElementById("popupContrasena");
const cerrarPopup = document.getElementById("cerrarPopup");

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Genera un radicado único: YYYY-MM-DD-HHMMSS-RANDOM
 */
function generarRadicado() {
    const ahora = new Date();
    const fecha = ahora.toISOString().split("T")[0].replace(/-/g, "");
    const hora = ahora.toTimeString().slice(0, 8).replace(/:/g, "");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `PQRS-${fecha}-${hora}-${random}`;
}

/**
 * Genera una clave de 6 dígitos
 */
function generarClave() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Valida que todos los campos requeridos estén completos
 */
function validarFormulario() {
    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const tipo = document.getElementById("tipoSolicitud").value;
    const rol = document.getElementById("rolUsuario").value;
    const mensaje = document.getElementById("mensaje").value.trim();

    if (!nombre || !correo || !tipo || !rol || !mensaje) {
        alert("⚠️ Por favor completa todos los campos");
        return false;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
        alert("⚠️ Por favor ingresa un email válido");
        return false;
    }

    return true;
}

// ==================== EVENT LISTENERS ====================

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    const radicado = generarRadicado();
    const clave = generarClave();

    const nuevaPQRS = {
        radicado,
        clave,
        fecha: new Date().toISOString().split("T")[0],
        nombre: document.getElementById("nombre").value.trim(),
        correo: document.getElementById("correo").value.trim(),
        rol: document.getElementById("rolUsuario").value,
        tipo: document.getElementById("tipoSolicitud").value,
        mensaje: document.getElementById("mensaje").value.trim(),
        estado: "Radicada",
        origen: "Contactanos",
        respuesta: ""
    };

    try {
        const id = await guardarPQRS(nuevaPQRS);
        console.log("✅ PQRS guardada con ID:", id);
        console.log("📝 Datos guardados:", nuevaPQRS);
        console.log("🔑 Radicado:", radicado);
        console.log("🔐 Clave:", clave);

        // Mostrar popup con datos
        popupRadicado.textContent = radicado;
        popupContrasena.textContent = clave;
        popup.style.display = "flex";

        // Limpiar formulario
        form.reset();
    } catch (error) {
        console.error("❌ Error al guardar PQRS:", error);
        alert("❌ Error al enviar la PQRS. Intenta de nuevo.");
    }
});

// Cerrar popup
cerrarPopup.addEventListener("click", () => {
    popup.style.display = "none";
});
