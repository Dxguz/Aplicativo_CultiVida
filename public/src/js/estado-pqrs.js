import { buscarPQRSPorRadicado, obtenerPQRSPorEmail } from "./pqrs-firebase.js";

// ==================== ELEMENTOS DEL DOM ====================
const btnBuscar = document.getElementById("btnBuscar");
const radicadoInput = document.getElementById("radicado");
const claveInput = document.getElementById("clave");
const tablaContainer = document.getElementById("tabla-container");
const tablaBody = document.querySelector("#tablaPQRS tbody");
const filtroFecha = document.getElementById("filtroFecha");
const filtroEstado = document.getElementById("filtroEstado");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Convierte estado a HTML con icono
 */
function estadoIcono(estado) {
    switch ((estado || "").toLowerCase()) {
        case "radicada": 
            return `<i class="fas fa-file-alt"></i> ${estado}`;
        case "en proceso": 
            return `<i class="fas fa-spinner"></i> ${estado}`;
        case "respondida": 
            return `<i class="fas fa-check-circle"></i> ${estado}`;
        case "cerrada": 
            return `<i class="fas fa-lock"></i> ${estado}`;
        default: 
            return estado;
    }
}

/**
 * Obtiene clase CSS según estado
 */
function estadoColor(estado) {
    switch ((estado || "").toLowerCase()) {
        case "radicada": 
            return "estado-radicada";
        case "en proceso": 
            return "estado-proceso";
        case "respondida": 
            return "estado-respondida";
        case "cerrada": 
            return "estado-cerrada";
        default: 
            return "";
    }
}

/**
 * Renderiza las PQRS en la tabla
 */
function renderizarTabla(pqrs) {
    tablaBody.innerHTML = "";

    if (!pqrs || pqrs.length === 0) {
        const fila = document.createElement("tr");
        fila.innerHTML = `<td colspan="6" style="text-align:center;">No hay PQRS asociadas</td>`;
        tablaBody.appendChild(fila);
        return;
    }

    pqrs.forEach(p => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${p.radicado || "N/A"}</td>
            <td>${p.fecha || "N/A"}</td>
            <td>${p.rol || "N/A"}</td>
            <td>${(p.mensaje || "").substring(0, 100)}...</td>
            <td class="${estadoColor(p.estado)}">${estadoIcono(p.estado)}</td>
            <td>${p.respuesta || "Sin respuesta aún"}</td>
        `;
        tablaBody.appendChild(fila);
    });
}

// ==================== EVENT LISTENERS ====================

btnBuscar.addEventListener("click", async () => {
    const radicado = radicadoInput.value.trim();
    const clave = claveInput.value.trim();

    if (!radicado || !clave) {
        alert("⚠️ Por favor ingresa radicado y clave");
        return;
    }

    try {
        // Buscar PQRS con radicado y clave
        const pqrsEncontrada = await buscarPQRSPorRadicado(radicado, clave);

        if (!pqrsEncontrada) {
            alert("❌ Radicado o clave incorrectos");
            return;
        }

        console.log("✅ PQRS encontrada:", pqrsEncontrada);

        // Obtener todas las PQRS asociadas a este email
        const pqrsAsociadas = await obtenerPQRSPorEmail(pqrsEncontrada.correo);

        // Mostrar tabla
        renderizarTabla(pqrsAsociadas);
        tablaContainer.style.display = "block";

        // Scroll a la tabla
        tablaContainer.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (error) {
        console.error("❌ Error al buscar PQRS:", error);
        alert("❌ Error al consultar PQRS. Intenta más tarde.");
    }
});

// Filtro por fecha exacta
filtroFecha.addEventListener("change", () => {
    const filtro = filtroFecha.value; // formato YYYY-MM-DD
    const filas = tablaBody.querySelectorAll("tr");
    
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll("td");
        if (celdas.length > 0) {
            const fecha = celdas[1].textContent.trim();
            fila.style.display = filtro === "" || fecha === filtro ? "" : "none";
        }
    });
});

// Filtro por estado
filtroEstado.addEventListener("change", () => {
    const filtro = filtroEstado.value.toLowerCase();
    const filas = tablaBody.querySelectorAll("tr");
    
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll("td");
        if (celdas.length > 0) {
            const estado = celdas[4].textContent.toLowerCase();
            fila.style.display = filtro === "" || estado.includes(filtro) ? "" : "none";
        }
    });
});

// Limpiar filtros
btnLimpiarFiltros.addEventListener("click", () => {
    // Limpiar valores de filtros
    filtroFecha.value = "";
    filtroEstado.value = "";

    // Mostrar todas las filas
    const filas = tablaBody.querySelectorAll("tr");
    filas.forEach(fila => {
        fila.style.display = "";
    });

    console.log("✅ Filtros limpiados");
});
