import { auth, db } from "./firebase.js";
import { uploadToCloudinary } from "./cloudinary-api.js";
import {
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const sidebarToggle = document.querySelector("#sidebarToggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.toggle("sb-sidenav-toggled");
      localStorage.setItem(
        "sb|sidebar-toggle",
        document.body.classList.contains("sb-sidenav-toggled")
      );
    });
  }

  const defaultIcon = document.getElementById("defaultIcon");
  const adminPhoto = document.getElementById("adminPhoto");
  const newPhotoInput = document.getElementById("newPhoto");
  const saveBtn = document.getElementById("saveProfile");
  const adminEmailEl = document.getElementById("adminEmail");
  const statusDiv = document.getElementById("status");
  const logoutBtn = document.getElementById("btnLogout");
  // Avatar navbar
  const navDefaultIcon = document.getElementById("navDefaultIcon");
  const navAdminPhoto = document.getElementById("navAdminPhoto");


  let selectedFile = null;
  let currentUser = null;

  function setAvatar(src) {
    const hasPhoto = !!src;

    // PERFIL
    if (adminPhoto && defaultIcon) {
      adminPhoto.style.display = hasPhoto ? "block" : "none";
      defaultIcon.style.display = hasPhoto ? "none" : "block";

      if (hasPhoto) adminPhoto.src = src;
    }

    // NAVBAR
    if (!navAdminPhoto) return;

    if (src) {
      navAdminPhoto.src = src;
    } else {
      navAdminPhoto.removeAttribute("src");
    }
  }


  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "admin-login.html";
      return;
    }

    if (user.email !== "cultivida.01@gmail.com") {
      console.warn("Acceso denegado");
      signOut(auth);
      window.location.href = "index.html";
      return;
    }

    currentUser = user;
    adminEmailEl.textContent = user.email || "Sin correo";

    setAvatar(user.photoURL || null);

  });

  newPhotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      statusDiv.textContent = "Solo se permiten imágenes.";
      newPhotoInput.value = "";
      return;
    }

    selectedFile = file;


    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatar(ev.target.result);
    };
    reader.readAsDataURL(file);

  });

  saveBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      statusDiv.textContent = "Selecciona una nueva foto antes de guardar.";
      return;
    }

    saveBtn.disabled = true;
    statusDiv.innerHTML = '<span class="loader"></span> Subiendo imagen...';

    try {
      const imageUrl = await uploadToCloudinary(selectedFile, "admin_profiles");
      if (!imageUrl) throw new Error("No se recibió URL desde Cloudinary.");

      // GUARDAR EN FIREBASE AUTH
      await updateProfile(currentUser, {
        photoURL: imageUrl
      });

      // GUARDAR EN FIRESTORE
      await setDoc(doc(db, "users", currentUser.uid), {
        photoURL: imageUrl
      }, { merge: true });

      setAvatar(imageUrl);
      statusDiv.textContent = "Foto guardada correctamente.";

    } catch (err) {
      console.error("Error al subir imagen:", err);
      statusDiv.textContent = "No se pudo subir la imagen.";
    } finally {
      saveBtn.disabled = false;
      selectedFile = null;
      newPhotoInput.value = "";
      setTimeout(() => (statusDiv.textContent = ""), 4000);
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Error cerrando sesión:", err);
      } finally {
        localStorage.removeItem("sb|sidebar-toggle");
        sessionStorage.clear();
        window.location.replace("admin-login.html");
      }
    });
  }
});