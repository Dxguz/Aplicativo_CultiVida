import { auth, provider, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/* ROLES PERMITIDOS*/
const ALLOWED_ROLES = ["agricultor", "profesional"];

const btnIniciar = document.getElementById("btn__iniciar-sesion");
const btnRegistrarse = document.getElementById("btn__registrarse");
btnIniciar.addEventListener("click", iniciarSesion);
btnRegistrarse.addEventListener("click", registerView);
window.addEventListener("resize", anchoPage);

const formulario_login = document.querySelector(".formulario__login");
const formulario_register = document.querySelector(".formulario__register");
const contenedor_login_register = document.querySelector(".contenedor__login-register");
const caja_trasera_login = document.querySelector(".caja__trasera-login");
const caja_trasera_register = document.querySelector(".caja__trasera-register");

const termsLogin = document.getElementById("termsLogin");
const termsRegister = document.getElementById("termsRegister");
const termsModal = document.getElementById("termsModal");
const openTermsLogin = document.getElementById("openTermsLogin");
const openTermsRegister = document.getElementById("openTermsRegister");
const closeTerms = document.getElementById("closeTerms");
const acceptTermsModal = document.getElementById("acceptTermsModal");


function anchoPage() {
  if (window.innerWidth > 850) {

    caja_trasera_register.style.display = "block";
    caja_trasera_login.style.display = "block";

    caja_trasera_login.style.opacity = "1";
    caja_trasera_register.style.opacity = "1";

  } else {


    caja_trasera_register.style.display = "block";
    caja_trasera_login.style.display = "block";

    caja_trasera_login.style.opacity = "1";
    caja_trasera_register.style.opacity = "1";

    contenedor_login_register.style.left = "0px";
  }
}

anchoPage();

function iniciarSesion() {

  formulario_login.style.display = "block";
  formulario_register.style.display = "none";

  if (window.innerWidth > 850) {
    contenedor_login_register.style.left = "10px";
    caja_trasera_login.style.opacity = "0";
    caja_trasera_register.style.opacity = "1";
  } else {
    contenedor_login_register.style.left = "0px";
  }
}


function registerView() {

  formulario_register.style.display = "block";
  formulario_login.style.display = "none";

  if (window.innerWidth > 850) {
    contenedor_login_register.style.left = "410px";
    caja_trasera_login.style.opacity = "1";
    caja_trasera_register.style.opacity = "0";
  } else {
    contenedor_login_register.style.left = "0px";
  }
}


/* DOM */
const formRegister = document.getElementById("formRegister");
const formLogin = document.getElementById("formLogin");
const roleSelect = document.getElementById("roleSelect");
const regEmail = document.getElementById("regEmail");
const regPassword = document.getElementById("regPassword");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMsg = document.getElementById("loginMsg");
const registerMsg = document.getElementById("registerMsg");
const btnGoogle = document.getElementById("googleLoginBtn");
const btnRecuperar = document.getElementById("recuperarPasswordBtn");

function validatePassword(password) {
  const re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return re.test(password);
}

function setMsg(element, text, type = 'error') {
  element.className = 'msgbox ' + type;
  element.innerHTML = `<div class="inner">${text}</div>`;
}

function clearMsg(element) {
  element.className = 'msgbox';
  element.innerHTML = '';
}


// ASIGNAR NOMBRES A LOS ERRORES
function getAuthErrorMessage(error) {

  const code = error.code;

  const messages = {

    /* REGISTRO */
    "auth/email-already-in-use": "Este correo ya está registrado. Intenta iniciar sesión.",
    "auth/invalid-email": "El formato del correo electrónico no es válido.",
    "auth/weak-password": "La contraseña es demasiado débil.",
    "auth/missing-password": "Debes ingresar una contraseña.",
    "auth/missing-email": "Debes ingresar un correo electrónico.",

    /* LOGIN */
    "auth/invalid-credential": "Correo o contraseña incorrectos. Intenta iniciar sesión con Google.",
    "auth/user-not-found": "No existe una cuenta con este correo.",
    "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
    "auth/too-many-requests": "Demasiados intentos fallidos. Intenta más tarde.",
    "auth/network-request-failed": "Error de conexión. Verifica tu internet.",

    /* GOOGLE */
    "auth/popup-closed-by-user": "La ventana de Google fue cerrada antes de completar el inicio de sesión.",
    "auth/cancelled-popup-request": "Se canceló la solicitud de inicio de sesión.",
    "auth/account-exists-with-different-credential": "Ya existe una cuenta con este correo usando otro método de inicio de sesión.",

    /* RECUPERAR CONTRASEÑA */
    "auth/missing-email": "Debes ingresar un correo electrónico.",
    "auth/invalid-recipient-email": "El correo ingresado no es válido.",

    /* DEFAULT */
    default: "Ocurrió un error inesperado. Intenta nuevamente."
  };

  return messages[code] || messages.default;
}



/* ===============================
   REGISTRO
================================ */
formRegister.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg(registerMsg);

  if (!termsRegister.checked) {
    setMsg(registerMsg, "Debes aceptar los términos y condiciones.", "error");
    return;
  }


  const role = roleSelect.value;
  const email = regEmail.value.trim();
  const password = regPassword.value;

  if (!ALLOWED_ROLES.includes(role)) {
    setMsg(registerMsg, "Solo se permite el registro de Agricultor o Profesional.", "error");
    return;
  }

  if (!validatePassword(password)) {
    setMsg(registerMsg, "La contraseña debe tener mínimo 8 caracteres, incluir letras, números y al menos un símbolo.", "error");
    return;
  }

  try {
    const uc = await createUserWithEmailAndPassword(auth, email, password);
    const user = uc.user;
    await sendEmailVerification(user);

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      role: role,
      profileCompleted: false,
  
      estadoAprobacion: role === "profesional" ? "pendiente" : "aprobado",
      motivoRechazo: "",
      createdAt: serverTimestamp()
    });

    setMsg(registerMsg, "Registro correcto. Revisa tu correo para verificar la cuenta.", "success");

    regEmail.value = "";
    regPassword.value = "";
    roleSelect.value = "";

  } catch (err) {
    setMsg(registerMsg, getAuthErrorMessage(err), "error");
    console.error("Registro error:", err);
  }

});

/* ===============================
   LOGIN
================================ */
formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg(loginMsg);

  if (!termsLogin.checked) {
    setMsg(loginMsg, "Debes aceptar los términos y condiciones.", "error");
    return;
  }


  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    if (!user.emailVerified) {
      setMsg(loginMsg, "Debes verificar tu correo antes de ingresar.", "info");
      await signOut(auth);
      return;
    }

    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (!docSnap.exists()) {
      setMsg(loginMsg, "Usuario sin permisos.", "error");
      await signOut(auth);
      return;
    }

    const info = docSnap.data();
    if (!ALLOWED_ROLES.includes(info.role)) {
      setMsg(loginMsg, "Este usuario no tiene acceso a este panel.", "error");
      await signOut(auth);
      return;
    }

    if (!info.profileCompleted) {
      window.location.href = `completar-perfil.html?role=${info.role}&uid=${user.uid}`;
    } else {
      window.location.href = info.role === "agricultor"
        ? "panel-agricultor.html"
        : "panel-profesional.html";
    }

  } catch (err) {
    setMsg(loginMsg, getAuthErrorMessage(err), "error");
    console.error("Login error:", err);
  }

});


btnGoogle.addEventListener("click", async () => {
  clearMsg(loginMsg);

  if (!termsLogin.checked) {
    setMsg(loginMsg, "Debes aceptar los términos y condiciones.", "error");
    return;
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);



    if (!docSnap.exists()) {
      window.location.href = "completar-perfil.html?prefill=true";
      return;
    }



    const data = docSnap.data();
    if (!ALLOWED_ROLES.includes(data.role)) {
      setMsg(loginMsg, "Este usuario no tiene acceso a este panel.", "error");
      await signOut(auth);
      return;
    }

    if (!data.profileCompleted) {
      window.location.href = `completar-perfil.html?role=${data.role}&uid=${user.uid}&prefill=true`;
    } else {
      window.location.href = data.role === "agricultor"
        ? "panel-agricultor.html"
        : "panel-profesional.html";
    }

  } catch (err) {
    setMsg(loginMsg, getAuthErrorMessage(err), "error");
    console.error("Google login error:", err);
  }

});

/* RECUPERAR CONTRASEÑA */
btnRecuperar.addEventListener("click", async () => {
  clearMsg(loginMsg);
  const email = loginEmail.value.trim() || regEmail.value.trim();
  if (!email) {
    setMsg(loginMsg, "Ingresa tu correo.", "info");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    setMsg(loginMsg, "Correo de recuperación enviado.", "success");
  } catch (err) {
    setMsg(loginMsg, getAuthErrorMessage(err), "error");
    console.error("Reset password error:", err);
  }

});


/* ===============================
   MODAL TÉRMINOS
================================ */

function openModal() {
  termsModal.style.display = "flex";
}

function closeModal() {
  termsModal.style.display = "none";
}

openTermsLogin.addEventListener("click", (e) => {
  e.preventDefault();
  openModal();
});

openTermsRegister.addEventListener("click", (e) => {
  e.preventDefault();
  openModal();
});

closeTerms.addEventListener("click", closeModal);
acceptTermsModal.addEventListener("click", closeModal);

window.addEventListener("click", (e) => {
  if (e.target === termsModal) closeModal();
});

// MOSTRAR / OCULTAR CONTRASEÑA
document.querySelectorAll(".toggle-password").forEach(icon => {
  icon.addEventListener("click", () => {
    const inputId = icon.getAttribute("data-target");
    const input = document.getElementById(inputId);

    if (input.type === "password") {
      input.type = "text";
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    }
  });
});