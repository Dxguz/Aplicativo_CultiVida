import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { uploadToCloudinary } from "./cloudinary-api.js";
import { crearNotificacionEvento } from "./notifications-admin.js";


document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formEvento");
  const msgEvento = document.getElementById("msgEvento");
  const imgInput = document.getElementById("imagen");
  const imgPreview = document.getElementById("eventImagePreview");
  const contenedor = document.getElementById("listaEventos");
  const filtroSelect = document.getElementById("filtroEventos");
  const btnLogout = document.getElementById("btnLogout");
  const defaultImg =
    "https://res.cloudinary.com/demo/image/upload/v1690000000/default-event.png";

  const btnCancelarEdicion = document.getElementById("btnCancelarEdicion");

  const chkTodos = document.getElementById("dest_todos");
  const chkAgricultor = document.getElementById("dest_agricultor");
  const chkProfesional = document.getElementById("dest_profesional");
  const chkMujer = document.getElementById("dest_mujer");

  const roles = [chkAgricultor, chkProfesional, chkMujer];

  chkTodos?.addEventListener("change", () => {
    const checked = chkTodos.checked;
    roles.forEach(r => r.checked = checked);
  });

  roles.forEach(chk => {
    chk?.addEventListener("change", () => {
      if (!chk.checked) chkTodos.checked = false;

      const allChecked = roles.every(r => r.checked);
      chkTodos.checked = allChecked;
    });
  });


  btnCancelarEdicion?.addEventListener("click", () => {
    form.reset();
    delete form.dataset.editingId;

    document.getElementById("eventImagePreview").src = defaultImg;

    const btnSubmit = form.querySelector("button[type='submit']");
    btnSubmit.textContent = "Guardar evento";

    mostrarMensaje("Edición cancelada.", "info");
  });


  // ==== MANEJO DE AUTENTICACIÓN ====
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "admin-login.html";
      return;
    }
    if (user.email !== "cultivida.01@gmail.com") {
      signOut(auth).finally(() => window.location.replace("index.html"));
    }
  });

  if (btnLogout) {
    btnLogout.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        sessionStorage.clear();
        localStorage.clear();
        window.location.replace("admin-login.html");
      } catch (err) {
        console.error("Error al cerrar sesión:", err);
        alert("Error al cerrar sesión. Intenta nuevamente.");
      }
    });
  }
  // =================================

  if (imgPreview) {
    imgPreview.src = defaultImg;
    imgPreview.onerror = () => {
      imgPreview.src =
        "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";
    };
  }

  imgInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && imgPreview) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        imgPreview.src = ev.target.result;
        imgPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else if (imgPreview) {
      imgPreview.src = defaultImg;
    }
  });

  function mostrarMensaje(texto, tipo = "info") {
    if (!msgEvento) return;
    msgEvento.textContent = texto;
    msgEvento.className =
      tipo === "exito"
        ? "alert alert-success"
        : tipo === "error"
          ? "alert alert-danger"
          : "alert alert-secondary";
  }


  function parseToLocalDateString(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") {
      const d = value.toDate();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const d = new Date(value);
    if (isNaN(d)) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function dateOnlyFromStringYYYYMMDD(s) {
    if (!s) return null;
    const parts = s.split("T")[0].split("-");
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  let currentFiltro = "todos";
  let eventoAEliminar = null;


  async function cargarEventos(filtro = "todos") {
    if (!contenedor) return;
    currentFiltro = filtro || "todos";
    contenedor.innerHTML = "<p class='cargando'>Cargando eventos...</p>";

    try {
      const snapshot = await getDocs(collection(db, "eventos"));
      const eventos = [];
      snapshot.forEach((d) => eventos.push({ id: d.id, ...d.data() }));

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const eventosNormalizados = eventos.map((e) => {
        const fechaStr = parseToLocalDateString(e.fecha) || e.fecha || null;
        const fechaDate = fechaStr
          ? dateOnlyFromStringYYYYMMDD(fechaStr)
          : null;
        return { ...e, _fechaStr: fechaStr, _fechaDate: fechaDate };
      });

      eventosNormalizados.sort((a, b) => {
        const A = a._fechaDate ? a._fechaDate.getTime() : 0;
        const B = b._fechaDate ? b._fechaDate.getTime() : 0;
        return A - B;
      });

      let filtrados = eventosNormalizados;
      if (filtro === "pasados") {
        filtrados = eventosNormalizados.filter(
          (e) => e._fechaDate && e._fechaDate < hoy
        );
      } else if (filtro === "hoy") {
        filtrados = eventosNormalizados.filter(
          (e) => e._fechaDate && e._fechaDate.getTime() === hoy.getTime()
        );
      } else if (filtro === "proximos") {
        filtrados = eventosNormalizados.filter(
          (e) => e._fechaDate && e._fechaDate > hoy
        );
      }

      mostrarEventos(filtrados, filtro);
    } catch (err) {
      console.error(err);
      mostrarMensaje("Error al cargar eventos.", "error");
      contenedor.innerHTML =
        "<p class='sin-eventos'>Error al cargar eventos.</p>";
    }
  }

  function mostrarEventos(eventos, filtro) {
    contenedor.innerHTML = "";
    if (!eventos || eventos.length === 0) {
      contenedor.innerHTML = `<p class='sin-eventos'>No hay eventos disponibles para este filtro.</p>`;
      return;
    }

    eventos.forEach((e) => {
      const card = document.createElement("div");
      card.className = "evento-card";
      const imgSrc = e.imagenUrl || defaultImg;
      card.innerHTML = `
  <div class="evento-img-wrapper">
    <img src="${imgSrc}" alt="Evento" class="evento-img"
      onerror="this.onerror=null;this.src='https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';">
  </div>

  <div class="evento-info">
    <h4 class="evento-titulo">${e.titulo || ""}</h4>

    <div class="evento-meta">
      <span>
        <i class="fa-solid fa-calendar-days"></i>
        ${e._fechaStr || e.fecha || ""}
      </span>

      <span>
        <i class="fa-solid fa-clock"></i>
        ${e.hora || ""}
      </span>

      <span>
        <i class="fa-solid fa-location-dot"></i>
        ${e.lugar || ""}
      </span>
    </div>

    <p class="evento-desc">${e.descripcion || ""}</p>

    <p class="evento-dest">
      <strong>Destinatarios:</strong> ${(e.destinatarios || []).join(", ")}
    </p>

    <div class="evento-acciones">
      <button class="btn-editar" data-id="${e.id}">
        <i class="fa-solid fa-pen"></i> Editar
      </button>

      <button class="btn-eliminar" data-id="${e.id}">
        <i class="fa-solid fa-trash"></i> Eliminar
      </button>
    </div>
  </div>
`;

      contenedor.appendChild(card);
    });

    document.querySelectorAll(".btn-eliminar").forEach((btn) =>
      btn.addEventListener("click", (ev) => {
        eventoAEliminar = ev.target.dataset.id;

        const modal = new bootstrap.Modal(
          document.getElementById("modalEliminarEvento")
        );
        modal.show();
      })
    );


    document.querySelectorAll(".btn-editar").forEach((btn) =>
      btn.addEventListener("click", async (ev) => {
        const id = ev.target.dataset.id;
        const eventoDoc = eventos.find((ev) => ev.id === id);
        if (eventoDoc) abrirModalEdicion(eventoDoc);
      })
    );
  }

  async function abrirModalEdicion(evento) {
    document.getElementById("titulo").value = evento.titulo || "";
    document.getElementById("fecha").value = parseToLocalDateString(evento.fecha) || "";
    document.getElementById("hora").value = evento.hora || "";
    document.getElementById("lugar").value = evento.lugar || "";
    document.getElementById("descripcion").value = evento.descripcion || "";

    document.getElementById("dest_todos").checked = evento.destinatarios?.includes("todos") || false;
    document.getElementById("dest_agricultor").checked = evento.destinatarios?.includes("agricultor") || false;
    document.getElementById("dest_profesional").checked = evento.destinatarios?.includes("profesional") || false;
    document.getElementById("dest_mujer").checked = evento.destinatarios?.includes("mujer_rural") || false;

    const imgPreview = document.getElementById("eventImagePreview");
    imgPreview.src = evento.imagenUrl || defaultImg;
    imgPreview.style.display = "block";

    const btnSubmit = form.querySelector("button[type='submit']");
    btnSubmit.textContent = "Guardar cambios";

    form.dataset.editingId = evento.id;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titulo = document.getElementById("titulo")?.value.trim();
    const fecha = document.getElementById("fecha")?.value;
    const hora = document.getElementById("hora")?.value;
    const lugar = document.getElementById("lugar")?.value.trim();
    const descripcion = document.getElementById("descripcion")?.value.trim();
    const file = document.getElementById("imagen").files[0];

    const destinatarios = [];
    if (document.getElementById("dest_todos")?.checked) destinatarios.push("todos");
    if (document.getElementById("dest_agricultor")?.checked) destinatarios.push("agricultor");
    if (document.getElementById("dest_profesional")?.checked) destinatarios.push("profesional");
    if (document.getElementById("dest_mujer")?.checked) destinatarios.push("mujer_rural");

    if (!titulo || !fecha || !hora || !lugar || !descripcion || destinatarios.length === 0) {
      mostrarMensaje("Debes completar todos los campos obligatorios.", "error");
      return;
    }

    const editingId = form.dataset.editingId;

    try {
      mostrarMensaje("Guardando datos...");
      let imageUrl = null;
      if (file) imageUrl = await uploadToCloudinary(file, "eventos");

      const eventoData = {
        titulo,
        fecha,
        hora,
        lugar,
        descripcion,
        destinatarios,
        ...(imageUrl ? { imagenUrl: imageUrl } : {}),
      };

      if (editingId) {
        await updateDoc(doc(db, "eventos", editingId), eventoData);
        mostrarMensaje("Evento actualizado correctamente.", "exito");
        delete form.dataset.editingId;
        form.reset();
        document.getElementById("eventImagePreview").src = defaultImg;
        const btnSubmit = form.querySelector("button[type='submit']");
        btnSubmit.textContent = "Crear evento";
      } else {
        mostrarMensaje("Subiendo imagen...");
        const imageUrl = await uploadToCloudinary(file, "eventos");
        await addDoc(collection(db, "eventos"), {
          titulo,
          fecha,
          hora,
          lugar,
          descripcion,
          destinatarios,
          imagenUrl: imageUrl,
          creadoEn: serverTimestamp(),
        });

        await crearNotificacionEvento({
          tituloEvento: titulo,
          destinatarios
        });

        mostrarMensaje("Evento creado con éxito.", "exito");

        // LIMPIEZA COMPLETA
        form.reset();
        imgPreview.src = defaultImg;

        const btnSubmit = form.querySelector("button[type='submit']");
        btnSubmit.textContent = "Guardar evento";
      }




      cargarEventos(currentFiltro);
    } catch (error) {
      console.error(error);
      mostrarMensaje("Error al guardar el evento.", "error");
    }
  });


  async function eliminarEvento(id) {
    try {
      await deleteDoc(doc(db, "eventos", id));
      mostrarMensaje("Evento eliminado correctamente.", "exito");
      cargarEventos(currentFiltro);
    } catch (error) {
      console.error(error);
      mostrarMensaje("No se pudo eliminar el evento.", "error");
    }
  }

  document
    .getElementById("confirmarEliminarEvento")
    ?.addEventListener("click", async () => {
      if (!eventoAEliminar) return;

      await eliminarEvento(eventoAEliminar);
      eventoAEliminar = null;

      const modalEl = document.getElementById("modalEliminarEvento");
      bootstrap.Modal.getInstance(modalEl).hide();
    });


  const btnFilterAll = document.getElementById("filterAll");
  const btnFilterPast = document.getElementById("filterPast");
  const btnFilterToday = document.getElementById("filterToday");
  const btnFilterUpcoming = document.getElementById("filterUpcoming");

  btnFilterAll?.addEventListener("click", () => cargarEventos("todos"));
  btnFilterPast?.addEventListener("click", () => cargarEventos("pasados"));
  btnFilterToday?.addEventListener("click", () => cargarEventos("hoy"));
  btnFilterUpcoming?.addEventListener("click", () => cargarEventos("proximos"));

  filtroSelect?.addEventListener("change", (e) => cargarEventos(e.target.value));

  cargarEventos();
});

