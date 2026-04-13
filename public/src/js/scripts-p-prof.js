import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    try {
    
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) return;

      const data = snap.data();
      console.log("estadoAprobacion:", data.estadoAprobacion);

      if (data.role === "profesional" && data.suspendido === true) {
        const motivo = data.motivoSuspension || "";

        const overlay = document.createElement("div");
        overlay.className = "estado-overlay";

        overlay.innerHTML = `
    <div class="estado-card">
      <div class="icono" style="color:orange">⚠️</div>
      <h3>Perfil suspendido</h3>
      <p>Tu perfil ha sido suspendido por un administrador.</p>
      ${motivo ? `<div class="motivo">${motivo}</div>` : ""}
      <div class="mt-3">
        <button id="btnCerrarSesion" class="btn btn-outline-secondary">
          Cerrar sesión
        </button>
        <button id="btnReenviar" class="btn btn-warning ms-2">
          Corregir y reenviar
        </button>
      </div>
    </div>
  `;

        document.body.appendChild(overlay);

        document.getElementById("btnCerrarSesion").onclick = async () => {
          await signOut(auth);
          window.location.href = "index.html";
        };

        document.getElementById("btnReenviar").onclick = () => {
          window.location.href = "completar-perfil.html?reenviar=true";
        };

        return; 
      }


      if (data.role === "profesional") {

        const estado = data.estadoAprobacion || "pendiente";
        const motivo = data.motivoRechazo || "";

        if (estado !== "aprobado") {

          const overlay = document.createElement("div");
          overlay.className = "estado-overlay";

          let color, icono, titulo, mensaje;

          if (estado === "pendiente") {
            color = "var(--azul)";
            icono = "⏳";
            titulo = "Perfil pendiente de verificación";
            mensaje =
              "Tu perfil está siendo revisado por un administrador. Este proceso garantiza la calidad del servicio.";
          }

          if (estado === "rechazado") {
            color = "var(--rojo)";
            icono = "❌";
            titulo = "Perfil rechazado";
            mensaje =
              "Tu perfil fue rechazado. Revisa el motivo y corrige la información para reenviar tu solicitud.";
          }

          overlay.innerHTML = `
      <div class="estado-card">
        <div class="icono" style="color:${color}">${icono}</div>
        <h3>${titulo}</h3>
        <p>${mensaje}</p>
        ${motivo ? `<div class="motivo">${motivo}</div>` : ""}
        <div class="mt-3">
          <button id="btnCerrarSesion" class="btn btn-outline-secondary">
            Cerrar sesión
          </button>
          ${estado === "rechazado"
              ? `<button id="btnReenviar" class="btn btn-success ms-2">
                 Reenviar solicitud
               </button>`
              : ``}
        </div>
      </div>
    `;

          document.body.appendChild(overlay);

          // Cerrar sesión
          document
            .getElementById("btnCerrarSesion")
            .addEventListener("click", async () => {
              await signOut(auth);
              window.location.href = "index.html";
            });

          // Reenviar solicitud
          if (estado === "rechazado") {
            document
              .getElementById("btnReenviar")
              .addEventListener("click", () => {
                window.location.href = "completar-perfil.html?reenviar=true";
              });
          }

          return; // BLOQUEO TOTAL DEL PANEL
        }
      }



      // contenedor del dropdown
      const dropdown = document.getElementById("navbarDropdown");
      if (!dropdown) return;

      // si hay foto de perfil, reemplazar ícono
      if (data.photoURL) {
        dropdown.innerHTML = `
          <img 
            src="${data.photoURL}" 
            alt="Foto de perfil"
            style="
              width:35px;
              height:35px;
              border-radius:50%;
              object-fit:cover;
              border:2px solid white;
            "
          />
        `;
      }
    } catch (e) {
      console.error("Error cargando perfil:", e);
    }
  });

  /* Configuración del perfil */
  const configBtn = Array.from(document.querySelectorAll(".dropdown-item"))
    .find(el => /configuraci/i.test(el.textContent));

  if (configBtn) {
    configBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const user = auth.currentUser;
      if (!user) return;

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          window.location.href = "index.html";
          return;
        }

        const { role } = snap.data();
        window.location.href = `completar-perfil.html?role=${encodeURIComponent(role)}`;
      } catch (err) {
        console.error(err);
      }
    });
  }

  /* Cerrar sesión */
  const cerrarBtn = Array.from(document.querySelectorAll(".dropdown-item"))
    .find(el => /cerrar/i.test(el.textContent));

  if (cerrarBtn) {
    cerrarBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        sessionStorage.clear();
        localStorage.clear();
        window.location.replace("index.html");
      } catch (err) {
        console.error("Error al cerrar sesión:", err);
      }
    });
  }

  /* Sidebar toggle */
  const sidebarToggle = document.body.querySelector('#sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', event => {
      event.preventDefault();
      document.body.classList.toggle('sb-sidenav-toggled');
      localStorage.setItem(
        'sb|sidebar-toggle',
        document.body.classList.contains('sb-sidenav-toggled')
      );
    });
  }

});
