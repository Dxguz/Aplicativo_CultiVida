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
      // colección correcta
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) return;

      const data = snap.data();

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
        window.location.href = `completar-perfil-mujer.html?role=${encodeURIComponent(role)}`;
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
