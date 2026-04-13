import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const btnLogout = document.getElementById("btnLogout");

if (btnLogout) {
  btnLogout.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "index.html";
  });
}
