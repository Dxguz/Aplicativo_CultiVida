import { auth, db } from './firebase.js';
import {
  collection, addDoc, onSnapshot, query, orderBy, doc,
  updateDoc, arrayUnion, arrayRemove, increment,
  serverTimestamp, deleteDoc, getDoc

}
  from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { uploadToCloudinary } from './cloudinary-api.js';
import { crearNotificacionSocial } from "./notifications-social.js";

const COLLECTION_NAME = 'ComunidadMujeres';

let currentUserData = null;

// ========================================
// LISTA DE PALABRAS PROHIBIDAS (CENSURA)
// ========================================
const BAD_WORDS = [
  'putazo', 'mierda', 'pendejo', 'idiota', 'imbecil', 'estúpido',
  'tonto', 'cobarde', 'bastardo', 'cabrón', 'malparido', 'desgraciado',
  'condenado', 'hijo de puta', 'maldito', 'jodido', 'carajo',
  'puta', 'puto', 'puta madre', 'qlo', 'culiao', 'ctm'
];

// ========================================
// FUNCIÓN CENSURA
// ========================================
function censor(text) {
  let censored = text;
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const replacement = '*'.repeat(word.length);
    censored = censored.replace(regex, replacement);
  });
  return censored;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log('No hay usuario autenticado');
    return window.location.href = 'login-registro.html';
  }
  console.log('Usuario autenticado:', user.uid);
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (snap.exists()) {
    const d = snap.data();
    console.log('Datos del usuario:', d);

    // Verificar que solo mujeres rurales accedan
    if (d.role !== 'mujer_rural') {
      console.log('Rol no permitido:', d.role);
      Swal.fire('Acceso Denegado', 'Solo mujeres rurales pueden acceder a esta comunidad.', 'error');
      return window.location.href = 'index.html';
    }

    currentUserData = {
      uid: user.uid,
      fullName: `${d.firstName} ${d.lastName}`,
      photoURL: d.photoURL || "src/img/default-user.png",
      role: d.role || 'mujer_rural'
    };
    console.log('currentUserData:', currentUserData);
    // Mostrar nombre de la usuaria logueada
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting) {
      userGreeting.textContent = `Bienvenida, ${currentUserData.fullName}`;
    }
    initFeed();
    setupPublishLogic();
    setupPreviewLogic();
  } else {
    console.log('Documento de usuario no existe');
  }
});

function setupPublishLogic() {
  const publishBtn = document.getElementById('publishBtn');
  if (!publishBtn) return;

  publishBtn.onclick = async () => {
    const text = document.getElementById('postModalContent')?.value.trim();
    const file = document.getElementById('postModalMedia')?.files[0];

    if (!text && !file) return Swal.fire("Escribe algo o sube una foto");

    publishBtn.disabled = true;
    publishBtn.innerHTML = "Publicando...";

    try {
      let mediaUrl = null;
      if (file) mediaUrl = await uploadToCloudinary(file, `comunidad/${currentUserData.uid}`);

      const censoredText = censor(text);
      await addDoc(collection(db, COLLECTION_NAME), {
        text: censoredText,
        originalText: text,
        mediaUrl,
        authorName: currentUserData.fullName,
        authorId: currentUserData.uid,
        authorPhoto: currentUserData.photoURL,
        authorRole: currentUserData.role,
        timestamp: serverTimestamp(),
        likes: [],
        likesCount: 0,
        comments: [],
        reports: []
      });
      document.getElementById('postModal').style.display = 'none';
      document.getElementById('postModalContent').value = '';
      document.getElementById('postModalMedia').value = '';
      document.getElementById('previewContainer').innerHTML = '';
      showToast("¡Publicado!");
    } catch (e) {
      console.error(e);
    } finally {
      publishBtn.disabled = false;
      publishBtn.innerHTML = "Publicar";
    }
  };
}


function initFeed() {
  const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
  onSnapshot(q, (snap) => {
    console.log('Feed actualizado:', snap.size, 'posts');
    const feed = document.getElementById('feed');
    if (!feed) {
      console.error('Elemento feed no encontrado');
      return;
    }
    feed.innerHTML = '';
    if (snap.empty) {
      feed.innerHTML = '<div class="alert alert-info text-center">No hay publicaciones aún. ¡Sé la primera en publicar!</div>';
      console.log('Feed vacío');
      return;
    }
    snap.forEach(d => {
      const data = d.data();
      console.log('Post:', d.id, data);
      renderPost({ id: d.id, ...data }, feed);
    });
  }, (error) => {
    console.error('Error en onSnapshot:', error);
  });
}

function renderPost(p, container) {
  const isOwner = p.authorId === currentUserData.uid;
  const isLiked = p.likes?.includes(currentUserData.uid);
  const postEl = document.createElement('div');
  postEl.className = 'post shadow-sm p-3 mb-4 bg-white rounded position-relative';

  let mediaHTML = p.isRepost ? `
        <div class="repost-box p-3 mb-2 bg-light border-start border-4 border-success rounded">
            <small class="text-success fw-bold">🔄 Compartido de ${p.originalAuthor}</small>
            <p class="small mb-2">${p.originalText}</p>
            ${p.originalMedia ? `<img src="${p.originalMedia}" class="w-100 rounded">` : ''}
        </div>` : (p.mediaUrl ? `<img src="${p.mediaUrl}" class="w-100 rounded mb-3">` : '');

  const roleDisplay = p.authorRole === 'profesional' ? '👨‍⚕️ Profesional' : '👩‍🌾 Mujer Rural';

  postEl.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="d-flex align-items-center gap-2">
                <div class="user-avatar-wrapper"
     style="width:40px;height:40px;border-radius:50%;overflow:hidden;">

  <img src="${p.authorPhoto || ''}" 
       class="user-avatar w-100 h-100"
       style="object-fit:cover;"
       onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'fallback-icon d-flex align-items-center justify-content-center w-100 h-100\\'><i class=\\'fas fa-user\\'></i></div>';">
</div>
                <div>
                    <strong style="font-size:0.9rem">${p.authorName}</strong><br>
                    <small class="text-muted" style="font-size:0.7rem">${p.timestamp?.toDate().toLocaleString() || 'Ahora'}</small>
                </div>
            </div>
            <div class="menu">
                <button class="btn btn-sm" onclick="togglePostMenu('${p.id}')">⋮</button>
                <div id="menu-${p.id}" class="post-menu d-none">
                    ${isOwner ? `
                        <button onclick="handleEdit('${p.id}', '${p.text}')">Editar</button>
                        <button onclick="handleDelete('${p.id}')" class="text-danger"> Eliminar</button>
                    ` : `<button onclick="handleReport('${p.id}')">🚩 Reportar</button>`}
                </div>
            </div>
        </div>
        <p class="post-text">${p.text}</p>
        ${mediaHTML}
        <div class="d-flex gap-4 border-top pt-2">
        <button class="btn btn-sm like-btn ${isLiked ? 'active text-danger fw-bold' : ''}"
        onclick="toggleLikeAnimated(this, '${p.id}')">
        ❤️ ${p.likesCount || 0}</button>

        <button class="btn btn-sm" onclick="toggleComments('${p.id}')">💬 ${p.comments?.length || 0}</button>
            <button class="btn btn-sm" onclick="handleRepost('${p.id}', '${p.authorName}', '${p.text}', '${p.mediaUrl || (p.isRepost ? p.originalMedia : '')}')">🔄 Repost</button>
        </div>
        <div class="comments-thread mt-3" id="thread-${p.id}" style="display:none;">
            <button class="btn btn-sm btn-success w-100 mb-3" onclick="handleComment('${p.id}')">💬 Comentar</button>
            <div class="comments-list">
                ${(p.comments || []).map(c => `
                    <div class="comment-item mb-3 p-2 bg-light rounded">
                        <div class="comment-header mb-1">
                            <small><b>${c.userName}</b></small>
                            ${c.timestamp ? `<small class="text-muted d-block" style="font-size: 0.7rem;">${new Date(c.timestamp).toLocaleString()}</small>` : ''}
                        </div>
                        <p class="comment-text small mb-2">${c.text}</p>
                        <button class="btn btn-sm btn-link p-0 text-success small" onclick="handleReply('${p.id}', ${c.id}, '${c.userName}')">↩️ Responder</button>
                        ${(c.replies || []).length > 0 ? `
                            <div class="replies-list ms-3 mt-2 border-start border-success ps-2">
                                ${(c.replies || []).map(r => `
                                    <div class="reply-item small mb-2">
                                        <small><b>${r.userName}</b></small>
                                        <p class="mb-0">${r.text}</p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
  container.appendChild(postEl);
}

window.toggleLikeAnimated = async (btn, id) => {
  const uid = currentUserData.uid;
  const alreadyLiked = btn.classList.contains('active');
  let count = parseInt(btn.textContent.replace('❤️', '').trim()) || 0;
  if (!alreadyLiked) {
    btn.classList.add('active', 'text-danger', 'fw-bold');
    createLikeBurst(btn);
    btn.innerHTML = `❤️ ${count + 1}`;
  } else {
    btn.classList.remove('active', 'text-danger', 'fw-bold');
    btn.innerHTML = `❤️ ${count - 1}`;
  }
  await window.toggleLike(id);
};



function createLikeBurst(btn) {
  const burst = document.createElement('div');
  burst.className = 'like-burst';

  for (let i = 0; i < 6; i++) {
    const p = document.createElement('span');
    p.style.setProperty('--x', `${(Math.random() - .5) * 60}px`);
    p.style.setProperty('--y', `${(Math.random() - .5) * 60}px`);
    burst.appendChild(p);
  }

  btn.appendChild(burst);
  setTimeout(() => burst.remove(), 600);
}


// --- TODAS LAS FUNCIONES DE VENTANA (WINDOW) ---
window.togglePostMenu = (id) => {
  document.querySelectorAll('.post-menu').forEach(m => m.id !== `menu-${id}` && m.classList.add('d-none'));
  document.getElementById(`menu-${id}`).classList.toggle('d-none');
};

window.toggleLike = async (postId) => {
  const uid = currentUserData.uid;
  const postRef = doc(db, COLLECTION_NAME, postId);

  const snap = await getDoc(postRef);
  const likes = snap.data().likes || [];

  if (likes.includes(uid)) {
    // ❌ quitar like
    await updateDoc(postRef, {
      likes: arrayRemove(uid),
      likesCount: increment(-1)
    });
  } else {
    // ❤️ agregar like
    await updateDoc(postRef, {
      likes: arrayUnion(uid),
      likesCount: increment(1)
    });


    await crearNotificacionSocial({
      tipo: "like",
      actorId: uid,
      actorName: currentUserData.fullName,
      postId: postId,
      postText: snap.data().text,
      postOwnerId: snap.data().authorId,
      comunidad: "mujeres"
    });
  }
};

window.handleRepost = (id, auth, txt, img) => {
  openCustomModal(`Repost de ${auth}`, "Añade un comentario...", async (newTxt) => {
    if (!newTxt) return;
    const censoredComment = censor(newTxt);
    await addDoc(collection(db, COLLECTION_NAME), {
      text: censoredComment, isRepost: true, originalAuthor: auth, originalText: txt, originalMedia: img,
      authorName: currentUserData.fullName, authorId: currentUserData.uid, authorPhoto: currentUserData.photoURL, authorRole: currentUserData.role,
      timestamp: serverTimestamp(), likes: [], comments: [], reports: []
    });


    await crearNotificacionSocial({
      tipo: "repost",
      actorId: currentUserData.uid,
      actorName: currentUserData.fullName,
      postId: id,
      postText: txt,
      postOwnerId: (await getDoc(doc(db, COLLECTION_NAME, id))).data().authorId,
      comunidad: "mujeres"
    });
  });
};

window.handleComment = (id) => {
  openCustomModal("Comentar", "Escribe tu comentario...", async (t) => {
    if (!t) return;
    try {
      const censoredComment = censor(t);
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        comments: arrayUnion({
          id: Date.now(),
          userId: auth.currentUser.uid,
          userName: currentUserData.fullName,
          userRole: currentUserData.role,
          userPhoto: currentUserData.photoURL,
          text: censoredComment,
          replies: [],
          timestamp: new Date().toISOString()
        })
      });

      // 🔔 CREAR NOTIFICACIÓN SOCIAL COMENTARIOS (Cambio 2)
      await crearNotificacionSocial({
        tipo: "comment",
        actorId: auth.currentUser.uid,
        actorName: currentUserData.fullName,
        postId: id,
        postText: (await getDoc(doc(db, COLLECTION_NAME, id))).data().text,
        postOwnerId: (await getDoc(doc(db, COLLECTION_NAME, id))).data().authorId,
        comunidad: "mujeres"
      }); //Final cambio 2

      showToast("💬 Comentario agregado");
    } catch (e) {
      console.error("Error al comentar:", e);
      Swal.fire('Error', 'No se pudo guardar el comentario: ' + e.message, 'error');
    }
  });
};

window.handleReply = async (pId, cId, to) => {
  openCustomModal(`Responder a ${to}`, "Escribe tu respuesta...", async (t) => {
    if (!t) return;
    try {
      const censoredReply = censor(t);
      const ref = doc(db, COLLECTION_NAME, pId);
      const p = (await getDoc(ref)).data();

      const updated = p.comments.map(c => {
        if (c.id === cId) {
          c.replies = c.replies || [];
          c.replies.push({
            userId: auth.currentUser.uid,
            userName: currentUserData.fullName,
            userRole: currentUserData.role,
            userPhoto: currentUserData.photoURL,
            text: censoredReply,
            timestamp: new Date().toISOString()
          });
        }
        return c;
      });

      await updateDoc(ref, { comments: updated });
      showToast("✅ Respuesta agregada");
    } catch (e) {
      console.error("Error al responder:", e);
      Swal.fire('Error', 'No se pudo guardar la respuesta: ' + e.message, 'error');
    }
  });
};

window.handleEdit = (id, txt) => {
  openCustomModal("Editar", "Cambia tu mensaje...", async (n) => {
    if (n) {
      const censoredText = censor(n);
      await updateDoc(doc(db, COLLECTION_NAME, id), { text: censoredText, originalText: n });
    }
  });
  document.getElementById('modalInput').value = txt;
};

window.handleDelete = (id) => {
  openCustomModal("Eliminar", "¿Estás segura?", async () => {
    try {
      const postRef = doc(db, COLLECTION_NAME, id);
      const postSnap = await getDoc(postRef);
      const postData = postSnap.data();

      await deleteDoc(postRef);

      await createNotification(
        'post_deleted',
        `Tu publicación "${postData.text?.substring(0, 50)}..." ha sido eliminada`,
        postData.authorId
      );

      showToast("Publicación eliminada");
    } catch (e) {
      console.error("Error al eliminar:", e);
    }
  }, true);
};

window.toggleComments = (id) => {
  const t = document.getElementById(`thread-${id}`);
  t.style.display = t.style.display === 'none' ? 'block' : 'none';
};

window.openCustomModal = (title, placeholder, onConfirm, isConfirmOnly = false) => {
  const m = document.getElementById('customModal');
  document.getElementById('modalTitle').textContent = title;
  const input = document.getElementById('modalInput');
  input.style.display = isConfirmOnly ? 'none' : 'block';
  input.placeholder = placeholder;
  input.value = '';
  m.style.display = 'flex';
  document.getElementById('modalConfirmBtn').onclick = () => { onConfirm(input.value); m.style.display = 'none'; };
};
// Función para reportar un post
window.handleReport = (id) => {
  openCustomModal("Reportar", "¿Por qué deseas reportar esta publicación?", async (motivo) => {
    if (!motivo) return;
    try {
      const ref = doc(db, COLLECTION_NAME, id);

      console.log('📢 Reportando post ID:', id, 'Motivo:', motivo);

      await updateDoc(ref, {
        reports: arrayUnion({
          userId: currentUserData.uid,
          userName: currentUserData.fullName,
          reason: motivo,
          date: new Date().toISOString()
        })
      });

      console.log('✅ Reporte enviado correctamente');
      showToast("Reporte enviado a revisión");
    } catch (e) {
      console.error("❌ Error al reportar:", e);
      console.error("Detalles:", e.message, e.code);
      Swal.fire('Error', 'No se pudo enviar el reporte: ' + e.message, 'error');
    }
  });
};

function setupPreviewLogic() {
  document.getElementById('postModalMedia')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('previewContainer').innerHTML =
          `<img src="${ev.target.result}" style="max-width:100%;max-height:150px;border-radius:8px">`;
      };
      reader.readAsDataURL(file);
    }
  });
}

function showToast(m) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    timer: 2000,
    title: m,
    showConfirmButton: false
  });
}