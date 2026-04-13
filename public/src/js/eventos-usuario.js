import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.getElementById("eventosContainer");
  const msgEventos = document.getElementById("msgEventos");
  const template = document.getElementById("templateEventoUsuario");
  const btnAll = document.getElementById("filterAll");
  const btnPast = document.getElementById("filterPast");
  const btnToday = document.getElementById("filterToday");
  const btnUpcoming = document.getElementById("filterUpcoming");
  const btnCerrarSesion = document.querySelector(
    "#navbarDropdown + .dropdown-menu a.dropdown-item[href='#!']:last-child"
  );
  const main = document.querySelector("main");
  const userRole = main?.dataset.role || "todos";

  let eventos = [];
  let filtroActual = "todos";
  let userId = null;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    userId = user.uid;
    await cargarEventos();
  });

  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch {
        alert("No se pudo cerrar la sesión.");
      }
    });
  }

  async function cargarEventos() {
    try {
      contenedor.innerHTML = `<p class="text-center text-muted">Cargando eventos...</p>`;
      msgEventos.style.display = "none";
      const snapshot = await getDocs(collection(db, "eventos"));
      const todos = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
      eventos = todos.filter(
        (e) =>
          e.destinatarios?.includes("todos") ||
          e.destinatarios?.includes(userRole)
      );
      aplicarFiltro(filtroActual);
    } catch {
      contenedor.innerHTML = `<p class="text-center text-danger">Error al cargar los eventos.</p>`;
    }
  }

  function aplicarFiltro(tipo) {
    filtroActual = tipo;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let filtrados = eventos.map((e) => ({ ...e, fechaDate: new Date(e.fecha) }));
    if (tipo === "pasados") filtrados = filtrados.filter((e) => e.fechaDate < hoy);
    else if (tipo === "hoy") filtrados = filtrados.filter((e) => e.fechaDate.toDateString() === hoy.toDateString());
    else if (tipo === "proximos") filtrados = filtrados.filter((e) => e.fechaDate > hoy);
    mostrarEventos(filtrados);
  }

  function mostrarEventos(lista) {
    contenedor.innerHTML = "";
    msgEventos.style.display = "none";
    if (lista.length === 0) {
      msgEventos.style.display = "block";
      return;
    }
    lista.forEach((evento) => {
      const clone = template.content.cloneNode(true);
      const titulo = clone.querySelector(".evt-titulo");
      const meta = clone.querySelector(".evt-meta");
      const descripcion = clone.querySelector(".evt-descripcion");
      const img = clone.querySelector("img");
      const btnInteresa = clone.querySelector(".btn-interesa");
      const btnNoInteresa = clone.querySelector(".btn-no-interesa");

      titulo.textContent = evento.titulo;
      descripcion.textContent = evento.descripcion;
      img.src = evento.imagenUrl || "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";

      const fecha = new Date(evento.fecha);
      const opcionesFecha = { year: "numeric", month: "long", day: "numeric" };
      meta.textContent = `${fecha.toLocaleDateString("es-ES", opcionesFecha)} - ${evento.hora} | ${evento.lugar}`;

      const interesados = evento.interesados || [];
      const noInteresados = evento.noInteresados || [];
      if (interesados.includes(userId)) btnInteresa.classList.add("active");
      if (noInteresados.includes(userId)) btnNoInteresa.classList.add("active");

      btnInteresa.addEventListener("click", async () => {
        await marcarInteres(evento.id, userId, true);
        btnInteresa.classList.add("active");
        btnNoInteresa.classList.remove("active");
      });

      btnNoInteresa.addEventListener("click", async () => {
        await marcarInteres(evento.id, userId, false);
        btnNoInteresa.classList.add("active");
        btnInteresa.classList.remove("active");
      });

      contenedor.appendChild(clone);
    });
  }

  async function marcarInteres(eventoId, userId, interesa) {
    try {
      const ref = doc(db, "eventos", eventoId);
      if (interesa) {
        await updateDoc(ref, {
          interesados: arrayUnion(userId),
          noInteresados: arrayRemove(userId),
        });
      } else {
        await updateDoc(ref, {
          noInteresados: arrayUnion(userId),
          interesados: arrayRemove(userId),
        });
      }
    } catch {}
  }

  btnAll?.addEventListener("click", () => {
    setActive(btnAll);
    aplicarFiltro("todos");
  });
  btnPast?.addEventListener("click", () => {
    setActive(btnPast);
    aplicarFiltro("pasados");
  });
  btnToday?.addEventListener("click", () => {
    setActive(btnToday);
    aplicarFiltro("hoy");
  });
  btnUpcoming?.addEventListener("click", () => {
    setActive(btnUpcoming);
    aplicarFiltro("proximos");
  });

  function setActive(btn) {
    [btnAll, btnPast, btnToday, btnUpcoming].forEach((b) => b?.classList.remove("active"));
    btn?.classList.add("active");
  }
});
