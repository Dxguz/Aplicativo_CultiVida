// Auth Guard para proteger rutas de administración de acceso solo para usuarios autenticados

import { auth } from "./firebase.js";

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    // Mostrar contenido cuando sí está autenticado
    document.body.style.display = "block";
  }
});
