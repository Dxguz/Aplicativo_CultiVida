import { auth, db } from "./firebase.js";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

    const activarPagos = document.getElementById("activarPagos");
    const bancoDestino = document.getElementById("bancoDestino");
    const tipoCuentaDestino = document.getElementById("tipoCuentaDestino");
    const tipoCuentaOtro = document.getElementById("tipoCuentaOtro");
    const campoTipoCuentaOtro = document.getElementById("campoTipoCuentaOtro");
    const numeroCuentaDestino = document.getElementById("numeroCuentaDestino");
    const titularCuentaDestino = document.getElementById("titularCuentaDestino");

    const listaTarifas = document.getElementById("listaTarifas");
    const agregarTarifaBtn = document.getElementById("agregarTarifaBtn");
    const guardarBtn = document.getElementById("guardarConfigPagosBtn");

    let tarifas = [];

    // Mostrar campo "Otro"
    tipoCuentaDestino.addEventListener("change", () => {
        if (tipoCuentaDestino.value === "Otro") {
            campoTipoCuentaOtro.classList.remove("d-none");
        } else {
            campoTipoCuentaOtro.classList.add("d-none");
            tipoCuentaOtro.value = "";
        }
    });

    // Cargar datos existentes
    auth.onAuthStateChanged(async (user) => {
        if (!user) return;

        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();

        if (data?.configPagos) {
            const config = data.configPagos;

            activarPagos.checked = config.activo || false;

            if (config.cuentaDestino) {
                bancoDestino.value = config.cuentaDestino.banco || "";
                numeroCuentaDestino.value = config.cuentaDestino.numeroCuenta || "";
                titularCuentaDestino.value = config.cuentaDestino.titular || "";

                const tipo = config.cuentaDestino.tipoCuenta;
                if (["Ahorros", "Corriente", "Nequi", "Daviplata"].includes(tipo)) {
                    tipoCuentaDestino.value = tipo;
                } else if (tipo) {
                    tipoCuentaDestino.value = "Otro";
                    campoTipoCuentaOtro.classList.remove("d-none");
                    tipoCuentaOtro.value = tipo;
                }
            }

            tarifas = config.tarifas || [];
            renderTarifas();
        }
    });

    function renderTarifas() {
        listaTarifas.innerHTML = "";

        tarifas.forEach((tarifa, index) => {

            const col = document.createElement("div");
            col.className = "col-md-6";

            col.innerHTML = `
        <div class="card tarifa-card h-100">
          <div class="card-body">

            <div class="mb-2">
              <label class="form-label">Nombre *</label>
              <input type="text" class="form-control tarifa-nombre"
                     data-index="${index}" value="${tarifa.nombre}">
            </div>

            <div class="mb-2">
              <label class="form-label">Precio *</label>
              <input type="number" class="form-control tarifa-precio"
                     data-index="${index}" value="${tarifa.precio}">
            </div>

            <div class="mb-2">
              <label class="form-label">Descripción *</label>
              <textarea class="form-control tarifa-desc"
                        data-index="${index}" rows="2">${tarifa.descripcion}</textarea>
            </div>

            <div class="text-end">
              <button type="button"
                class="btn btn-sm btn-outline-danger eliminar-tarifa"
                data-index="${index}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>

          </div>
        </div>
      `;

            listaTarifas.appendChild(col);
        });
    }

    agregarTarifaBtn.addEventListener("click", () => {
        tarifas.push({
            id: crypto.randomUUID(),
            nombre: "",
            precio: "",
            descripcion: ""
        });
        renderTarifas();
    });

    listaTarifas.addEventListener("input", (e) => {
        const index = e.target.dataset.index;
        if (index === undefined) return;

        if (e.target.classList.contains("tarifa-nombre"))
            tarifas[index].nombre = e.target.value;

        if (e.target.classList.contains("tarifa-precio"))
            tarifas[index].precio = e.target.value;

        if (e.target.classList.contains("tarifa-desc"))
            tarifas[index].descripcion = e.target.value;
    });

    listaTarifas.addEventListener("click", (e) => {
        const btn = e.target.closest(".eliminar-tarifa");
        if (!btn) return;

        const index = btn.dataset.index;
        tarifas.splice(index, 1);
        renderTarifas();
    });

    guardarBtn.addEventListener("click", async () => {

        const user = auth.currentUser;
        if (!user) return;

        if (!validarCampos()) return;

        const tipoCuentaFinal =
            tipoCuentaDestino.value === "Otro"
                ? tipoCuentaOtro.value.trim()
                : tipoCuentaDestino.value;

        await setDoc(doc(db, "users", user.uid), {
            configPagos: {
                activo: activarPagos.checked,
                cuentaDestino: {
                    banco: bancoDestino.value.trim(),
                    tipoCuenta: tipoCuentaFinal,
                    numeroCuenta: numeroCuentaDestino.value.trim(),
                    titular: titularCuentaDestino.value.trim()
                },
                tarifas: tarifas,
                actualizadoEn: serverTimestamp()
            }
        }, { merge: true });

        mostrarExito();
    });

    function validarCampos() {

        if (!bancoDestino.value.trim() ||
            !tipoCuentaDestino.value ||
            !numeroCuentaDestino.value.trim() ||
            !titularCuentaDestino.value.trim()) {

            alert("Todos los campos de la cuenta son obligatorios.");
            return false;
        }

        if (tipoCuentaDestino.value === "Otro" &&
            !tipoCuentaOtro.value.trim()) {

            alert("Debe especificar el tipo de cuenta.");
            return false;
        }

        if (tarifas.length === 0) {
            alert("Debe agregar al menos una tarifa.");
            return false;
        }

        for (let t of tarifas) {
            if (!t.nombre || !t.precio || !t.descripcion) {
                alert("Todos los campos de las tarifas son obligatorios.");
                return false;
            }
        }

        return true;
    }

    function mostrarExito() {
        const alertDiv = document.createElement("div");

        alertDiv.className =
            "alert alert-success position-fixed end-0 m-4 shadow fade show";

        // Bajarlo debajo del navbar fijo
        alertDiv.style.top = "80px"; // ajustable si el navbar cambia

        alertDiv.style.zIndex = "2000";
        alertDiv.innerText = "Configuración guardada correctamente";

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }


});
