import { auth } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const navAdminPhoto = document.getElementById("navAdminPhoto");
  if (!navAdminPhoto) return;

  onAuthStateChanged(auth, (user) => {
    if (user?.photoURL) {
      navAdminPhoto.src = user.photoURL;
    } else {
      navAdminPhoto.removeAttribute("src");
    }
  });
});
