// ========================================
// COMUNIDAD DE AGRICULTORES - LOCALSTORAGE VERSION
// ========================================

document.addEventListener('DOMContentLoaded', () => {

  /* ======================
     STORAGE
  ====================== */
  const STORAGE_KEY = 'cultivida_community_posts';

  const datosViejos = localStorage.getItem('publicaciones');
  let publicaciones = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  
  if (datosViejos && publicaciones.length === 0) {
    publicaciones = JSON.parse(datosViejos);
    localStorage.removeItem('publicaciones');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(publicaciones));
  }

  function guardarDatos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(publicaciones));
  }

  /* ======================
     DOM ELEMENTS
  ====================== */
  const principalFeed = document.getElementById('principal-feed');
  const carouselPrincipal = document.getElementById('carouselPrincipal');
  const composerPublicar = document.getElementById('composer-publicar');
  const textoPublicar = document.getElementById('texto-publicar');
  const archivoPublicar = document.getElementById('archivo-publicar');
  const btnPublicar = document.querySelector('button[onclick="publicarDesdeBoton()"]');

  /* ======================
     MAIN FUNCTIONS
  ====================== */
  window.mostrarPrincipal = () => {
    if (principalFeed) principalFeed.style.display = 'block';
    if (carouselPrincipal) carouselPrincipal.style.display = 'block';
    renderPrincipalFeed();
  };

  window.toggleComposer = () => {
    if (composerPublicar) {
      composerPublicar.style.display = composerPublicar.style.display === 'none' ? 'block' : 'none';
    }
  };

  window.publicarDesdeBoton = () => {
    const texto = textoPublicar ? textoPublicar.value.trim() : '';
    const archivo = archivoPublicar ? archivoPublicar.files[0] : null;

    if (!texto && !archivo) {
      alert("Debes escribir algo o subir un archivo.");
      return;
    }

    const nuevaPublicacion = {
      id: Date.now(),
      autor: "Usuario Demo",
      fecha: new Date().toLocaleString(),
      texto: texto,
      archivo: "",
      tipo: "",
      reacciones: 0,
      comentarios: []
    };

    if (archivo) {
      const reader = new FileReader();
      reader.onload = function (e) {
        nuevaPublicacion.archivo = e.target.result;
        nuevaPublicacion.tipo = archivo.type.startsWith("image") ? "imagen" : "video";
        publicaciones.unshift(nuevaPublicacion);
        guardarDatos();
        renderPrincipalFeed();
      };
      reader.readAsDataURL(archivo);
    } else {
      publicaciones.unshift(nuevaPublicacion);
      guardarDatos();
      renderPrincipalFeed();
    }

    if (textoPublicar) textoPublicar.value = "";
    if (archivoPublicar) archivoPublicar.value = "";
    window.toggleComposer();
  };

  /* ======================
     RENDER FEED
  ====================== */
  function renderPrincipalFeed() {
    if (!principalFeed) return;

    principalFeed.querySelectorAll('.post').forEach(p => p.remove());

    publicaciones.forEach(pub => {
      const div = document.createElement('div');
      div.className = 'post';
      div.innerHTML = `
        <div class="post-header">
          <span class="post-author">${pub.autor}</span> |
          <span class="post-time">${pub.fecha}</span>
        </div>
        <div class="post-body">
          <p>${pub.texto}</p>
          ${pub.tipo === "imagen" ? `<img src="${pub.archivo}" class="post-image" style="max-width:100%; height:auto;">` : ""}
          ${pub.tipo === "video" ? `<video src="${pub.archivo}" controls class="post-video" style="max-width:100%; height:auto;"></video>` : ""}
        </div>
        <div class="post-actions">
          <button onclick="window.reaccionar(${pub.id})">👍 <span id="react-${pub.id}">${pub.reacciones}</span></button>
          <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton-${pub.id}" data-bs-toggle="dropdown" aria-expanded="false">
            ⚙️ Opciones
          </button>
          <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton-${pub.id}">
            <li><a class="dropdown-item" href="#" onclick="window.repost(${pub.id}); return false;">🔁 Repost</a></li>
            <li><a class="dropdown-item" href="#" onclick="window.reportar(${pub.id}); return false;">⚠️ Reportar</a></li>
            <li><a class="dropdown-item" href="#" onclick="window.descargar('${pub.archivo}','${pub.tipo}'); return false;">⬇️ Descargar</a></li>
            <li><a class="dropdown-item" href="#" onclick="window.eliminar(${pub.id}); return false;">🗑️ Eliminar</a></li>
          </ul>
        </div>

        <div class="comment-composer my-2">
          <textarea id="comentario-${pub.id}" placeholder="Comenta algo..."></textarea>
          <button onclick="window.comentar(${pub.id})">Enviar</button>
        </div>
        <div id="comentarios-${pub.id}" class="comments"></div>
      `;
      principalFeed.appendChild(div);
      renderComentarios(pub.id);
    });
  }

  /* ======================
     REACTIONS
  ====================== */
  window.reaccionar = (id) => {
    const pub = publicaciones.find(p => p.id === id);
    if (pub) {
      pub.reacciones++;
      guardarDatos();
      const reactEl = document.getElementById(`react-${id}`);
      if (reactEl) reactEl.textContent = pub.reacciones;
    }
  };

  /* ======================
     COMMENTS
  ====================== */
  window.comentar = (id) => {
    const pub = publicaciones.find(p => p.id === id);
    const textarea = document.getElementById(`comentario-${id}`);
    const texto = textarea ? textarea.value.trim() : '';

    if (!texto) {
      alert("Escribe un comentario");
      return;
    }

    if (!pub.comentarios) pub.comentarios = [];

    pub.comentarios.push({
      id: Date.now(),
      autor: "Usuario Demo",
      texto: texto,
      fecha: new Date().toLocaleString()
    });

    guardarDatos();
    if (textarea) textarea.value = '';
    renderComentarios(id);
  };

  function renderComentarios(pubId) {
    const pub = publicaciones.find(p => p.id === pubId);
    const container = document.getElementById(`comentarios-${pubId}`);

    if (!pub || !container) return;

    container.innerHTML = '';

    if (pub.comentarios && pub.comentarios.length > 0) {
      pub.comentarios.forEach(com => {
        const div = document.createElement('div');
        div.className = 'comment';
        div.style.cssText = 'padding: 10px; background: #f9f9f9; margin: 5px 0; border-radius: 4px;';
        div.innerHTML = `
          <strong>${com.autor}</strong> - <small>${com.fecha}</small>
          <p>${com.texto}</p>
          <button onclick="window.eliminarComentario(${pubId}, ${com.id})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">🗑️</button>
        `;
        container.appendChild(div);
      });
    }
  }

  window.eliminarComentario = (pubId, comId) => {
    const pub = publicaciones.find(p => p.id === pubId);
    if (pub && pub.comentarios) {
      pub.comentarios = pub.comentarios.filter(c => c.id !== comId);
      guardarDatos();
      renderComentarios(pubId);
    }
  };

  /* ======================
     REPOST
  ====================== */
  window.repost = (id) => {
    const pub = publicaciones.find(p => p.id === id);
    if (pub) {
      const repost = {
        id: Date.now(),
        autor: "Usuario Demo (Repost)",
        fecha: new Date().toLocaleString(),
        texto: `[REPOST] ${pub.texto}`,
        archivo: pub.archivo,
        tipo: pub.tipo,
        reacciones: 0,
        comentarios: []
      };
      publicaciones.unshift(repost);
      guardarDatos();
      renderPrincipalFeed();
      alert("Repost creado");
    }
  };

  /* ======================
     REPORT
  ====================== */
  window.reportar = (id) => {
    const motivo = prompt("Motivo del reporte:");
    if (motivo) {
      alert(`Publicación reportada por: ${motivo}`);
      // En un sistema real, esto se guardaría en una colección de reportes
    }
  };

  /* ======================
     DELETE
  ====================== */
  window.eliminar = (id) => {
    if (confirm("¿Eliminar esta publicación?")) {
      publicaciones = publicaciones.filter(p => p.id !== id);
      guardarDatos();
      renderPrincipalFeed();
      alert("Publicación eliminada");
    }
  };

  /* ======================
     DOWNLOAD
  ====================== */
  window.descargar = (archivo, tipo) => {
    if (!archivo) return;

    const link = document.createElement('a');
    link.href = archivo;
    link.download = `archivo.${tipo === 'imagen' ? 'jpg' : 'mp4'}`;
    link.click();
  };

  /* ======================
     INIT
  ====================== */
  window.mostrarPrincipal();
});
