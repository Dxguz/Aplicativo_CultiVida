document.addEventListener("DOMContentLoaded", () => {
  const lista = document.getElementById("notiList");
  const usuarioCorreo = localStorage.getItem("usuarioCorreo"); 

  if (!usuarioCorreo || !lista) return;

  const notificaciones = JSON.parse(localStorage.getItem("notificaciones")) || [];
  const notisFiltradas = notificaciones.filter(n => n.correo === usuarioCorreo);

  notisFiltradas.forEach(n => {
    const item = document.createElement("li");
    item.className = "noti-item";
    item.setAttribute("data-type", n.tipo.toLowerCase());
    item.setAttribute("data-id", n.id);
    item.setAttribute("tabindex", "0");

    item.innerHTML = `
      <div class="noti-dot new"></div>
      <div class="noti-main">
        <div class="noti-title">${n.titulo}</div>
        <div class="noti-meta">${n.fecha} · ${n.tipo}</div>
        <div class="noti-body">${n.cuerpo}</div>
      </div>
      <div class="noti-actions">
        <button class="btn-small viewBtn">Ver</button>
        <button class="btn-small markBtn">Marcar</button>
      </div>
    `;

    lista.appendChild(item);

    item.querySelector(".viewBtn").addEventListener("click", () => {
      alert(`📄 Detalle de la respuesta:\n${n.detalle}`);
    });

    item.querySelector(".markBtn").addEventListener("click", () => {
      item.classList.add("noti-marked");
    });
  });
});
