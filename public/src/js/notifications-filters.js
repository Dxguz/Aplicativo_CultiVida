import { db } from "./firebase.js";

export function aplicarFiltros(notis) {
  window.__LAST_NOTIS = notis;

  const filter = document.getElementById("notiFilter").value;
  const counter = document.getElementById("unreadCount");

  let visibles = notis;

  if (filter === "unread") {
    visibles = notis.filter(n => !n.leido);
  } else if (filter === "read") {
    visibles = notis.filter(n => n.leido);
  }

  counter.textContent = notis.filter(n => !n.leido).length;
  return visibles;
}


document.getElementById("notiFilter")?.addEventListener("change", () => {
  window.dispatchEvent(
    new CustomEvent("notificaciones:update", {
      detail: window.__LAST_NOTIS || []
    })
  );
});

