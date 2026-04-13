import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { initNotifications } from "./notifications-service.js";
import { initUI } from "./notifications-ui.js";


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn("🔒 Usuario no autenticado, notificaciones detenidas");
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      console.warn("⚠️ Usuario sin documento en users");
      return;
    }

    const data = snap.data();

    window.NOTI_USER = {
      uid: user.uid,
      rol: data.role,
      createdAt: data.createdAt
    };

    console.log("🔔 Notificaciones iniciadas para:", window.NOTI_USER);

    // ✅ INICIALIZACIONES CORRECTAS
    initUI();
    initNotifications();

  } catch (err) {
    console.error("❌ Error iniciando notificaciones:", err);
  }
});
