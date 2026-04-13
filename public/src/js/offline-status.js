document.addEventListener("DOMContentLoaded", () => {

  let banner = document.getElementById("offline-alert");

  // Si no existe, lo creamos dinámicamente
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "offline-alert";
    banner.className = "offline-alert hidden";
    banner.textContent = "Estás navegando sin conexión";
    document.body.appendChild(banner);
  }

  function updateOnlineStatus() {
    if (navigator.onLine) {
      banner.classList.add("hidden");
      document.body.classList.remove("app-offline");
    } else {
      banner.classList.remove("hidden");
      document.body.classList.add("app-offline");
    }
  }

  updateOnlineStatus();

  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
});
