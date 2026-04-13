import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data();

    /* ===== FOTO DE PERFIL EN NAVBAR ===== */
    if (data.photoURL) {
      const dropdown = document.getElementById('navbarDropdown');
      if (dropdown) {
        dropdown.innerHTML = `
          <img src="${data.photoURL}"
               alt="Perfil"
               style="
                 width:36px;
                 height:36px;
                 border-radius:50%;
                 object-fit:cover;
                 border:2px solid white;
               ">
        `;
      }
    }

    /* ===== CONFIGURACIÓN PERFIL ===== */
    const configBtn = document.querySelector('[data-action="perfil"]');
    if (configBtn) {
      configBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'completar-perfil.html';
      });
    }

    /* ===== CERRAR SESIÓN ===== */
    const logoutBtn = document.querySelector('[data-action="logout"]');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut(auth);
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('index.html');
      });
    }

  } catch (err) {
    console.error('Error cargando navbar:', err);
  }
});
