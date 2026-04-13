import { marcarLeida, eliminarNotificacion, marcarTodasLeidas, eliminarTodas } from "./notifications-service.js";
import { aplicarFiltros } from "./notifications-filters.js";

let NOTIS = [];

function getHiddenIds() {
    const key = `noti_hidden_${window.NOTI_USER.uid}`;
    return JSON.parse(localStorage.getItem(key) || "[]");
}

function hideNotification(id) {
    const key = `noti_hidden_${window.NOTI_USER.uid}`;
    const hidden = getHiddenIds();
    if (!hidden.includes(id)) {
        hidden.push(id);
        localStorage.setItem(key, JSON.stringify(hidden));
    }
}


export function initUI() {
    const list = document.getElementById("notiList");
    const empty = document.getElementById("notiEmpty");

    const btnMarkAll = document.getElementById("markAllRead");
    const btnClearAll = document.getElementById("clearAll");

    // EVENTO GLOBAL DESDE FIRESTORE
    window.addEventListener("notificaciones:update", e => {
        NOTIS = e.detail;
        render();
    });

    // MARCAR TODAS COMO LEÍDAS
    btnMarkAll?.addEventListener("click", () => {
        marcarTodasLeidas(NOTIS);
    });

    // ELIMINAR TODAS
    btnClearAll?.addEventListener("click", async () => {
        await eliminarTodas(NOTIS);

        // vaciar inmediatamente en memoria
        NOTIS = [];

        render();
    });


    function render() {
        const hiddenIds = getHiddenIds();
        const visibles = aplicarFiltros(
            NOTIS.filter(n => !hiddenIds.includes(n.id))
        );

        list.innerHTML = "";

        if (!visibles.length) {
            empty.hidden = false;
            return;
        }

        empty.hidden = true;

        visibles.forEach(n => {
            const li = document.createElement("li");
            li.className = `noti-item ${n.leido ? "" : "unread"}`;
            li.dataset.id = n.id;

            const icon = getIconByType(n.tipo);

            const fecha = n.creadoEn?.seconds
                ? new Date(n.creadoEn.seconds * 1000).toLocaleString()
                : "";

            li.innerHTML = `
        <div class="noti-icon">${icon}</div>

        <div class="noti-main">
          <div class="noti-title">${n.titulo}</div>
          <div class="noti-body">${n.cuerpo}</div>

${n.postPreview ? `
  <div class="noti-preview">
    “${n.postPreview}${n.postPreview.length >= 50 ? '…' : ''}”
  </div>
` : ''}

<div class="noti-meta">${fecha}</div>

        </div>

        <div class="noti-actions">
          <button class="btn-small markBtn" ${n.leido ? "disabled" : ""}>
            ${n.leido ? "<i class=\"fa-solid fa-check-double\"></i>" : "<i class=\"fa-solid fa-check\"></i>"}
          </button>
          <button class="btn-small deleteBtn">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;

            li.querySelector(".markBtn").onclick = () => marcarLeida(n.id);
            li.querySelector(".deleteBtn").onclick = async () => {
                await eliminarNotificacion(n.id);

                // quitar inmediatamente de memoria
                NOTIS = NOTIS.filter(x => x.id !== n.id);

                render();
            };

            list.appendChild(li);
        });
    }
}

// ICONO POR TIPO
function getIconByType(tipo) {
    switch (tipo) {
        case "evento":
            return `<i class="fa-solid fa-calendar-days"></i>`;
        case "advertencia-chat":
            return `<i class="fa-solid fa-triangle-exclamation"></i>`;
        case "reporte-chat-procesado":
            return `<i class="fa-solid fa-clipboard-check"></i>`;
        case "reporte-post":
            return `<i class="fa-solid fa-comments"></i>`;
        case "like-post":
            return `<i class="fa-brands fa-gratipay"></i>`;
        case "comentario-post":
            return `<i class="fa-solid fa-comment-dots"></i>`;
        case "repost-post":
            return `<i class="fa-solid fa-share"></i>`;
        case "curso-mujeres":
            return `<i class="fa-solid fa-chalkboard-user"></i>`;
        case "pqrs":
            return `<i class="fa-solid fa-envelope-open-text"></i>`;
        case "post-moderacion":
            return `<i class="fa-solid fa-comment-slash"></i>`;
        default:
            return `<i class="fa-regular fa-bell"></i>`;
    }
}
