import { auth, db } from './firebase.js';
import {
    collection, onSnapshot, query, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { verifyAndSetupAdmin, diagnosticPost } from './verify-admin-setup.js';
import { crearNotificacionModeracion } from "./notifications-moderacion.js";


// Inicializar Cloud Functions
const functions = getFunctions();
const adminDeletePostFn = httpsCallable(functions, 'adminDeletePost');
const adminClearReportsFn = httpsCallable(functions, 'adminClearReports');
const setupAdminUserFn = httpsCallable(functions, 'setupAdminUser');

// ========================================
// CONFIGURACIÓN DE COLECCIONES
// ========================================
const COLLECTIONS = {
    mujeres: 'ComunidadMujeres',
    agricultores: 'ComunidadAgricultoresAgronomos',  // Agricultores y Profesionales comparten colección
    agronomos: 'ComunidadAgricultoresAgronomos'      // Mismo que agricultores
};

let currentCommunity = 'mujeres';
let unsubscribe = null;
let currentAdminUser = null;

// Función para verificar si el usuario es admin
async function verifyAdminStatus(user) {
    try {
        // Obtener token de id para verificar custom claims
        const idTokenResult = await user.getIdTokenResult(true);
        const isAdmin = idTokenResult.claims.admin === true;

        // También verificar en la colección users
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const isAdminInDB = userDoc.exists() && userDoc.data().role === 'admin';

        console.log(`✅ Verificación de admin - Email: ${user.email}`);
        console.log(`   - Custom Claims (admin): ${isAdmin}`);
        console.log(`   - DB role: ${isAdminInDB ? 'admin' : 'no-admin'}`);

        return isAdmin || isAdminInDB;
    } catch (e) {
        console.error("❌ Error verificando admin status:", e);
        return false;
    }
}

// 2. CAMBIO DE COMUNIDAD Y UI
window.switchCommunity = (community) => {
    currentCommunity = community;

    // Actualizar Título de la sección
    const titleMap = {
        mujeres: 'Mujeres Rurales',
        agricultores: 'Agricultores',
        agronomos: 'Agrónomos'
    };
    const titleEl = document.getElementById('current-section-title');
    if (titleEl) titleEl.textContent = `Moderación: ${titleMap[community]}`;

    // Switch Visual de Módulos (Tabs)
    document.querySelectorAll('.community-module').forEach(mod => mod.style.display = 'none');
    document.querySelectorAll('.community-card').forEach(card => card.classList.remove('active'));

    const activeModule = document.getElementById(`module-${community}`);
    const activeCard = document.querySelector(`[data-community="${community}"]`);

    if (activeModule) activeModule.style.display = 'block';
    if (activeCard) activeCard.classList.add('active');

    // Reiniciar escucha de Firebase para la nueva comunidad
    startListening(community);
};

// 3. ESCUCHA ACTIVA DE FIREBASE
function startListening(community) {
    if (unsubscribe) unsubscribe();

    const collectionName = COLLECTIONS[community];
    const q = query(collection(db, collectionName));

    unsubscribe = onSnapshot(q, (snapshot) => {
        const posts = [];
        snapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        renderPosts(posts);
    }, (error) => {
        console.error("Error en Firebase:", error);
    });
}

// 4. RENDERIZADO DINÁMICO DE POSTS Y REPORTES
function renderPosts(posts) {
    const suffixMap = { mujeres: 'mujer', agricultores: 'agri', agronomos: 'agro' };
    const suffix = suffixMap[currentCommunity];

    const reportsContainer = document.getElementById(`tab-reports-${currentCommunity}`);
    const feedContainer = document.getElementById(`tab-posts-${currentCommunity}`);

    if (!reportsContainer || !feedContainer) return;

    reportsContainer.innerHTML = '';
    feedContainer.innerHTML = '';

    let reportCount = 0;

    // Si es agronomos, filtrar solo posts de profesionales
    // Si es agricultores, mostrar todos (ambos roles)
    let filteredPosts = posts;
    if (currentCommunity === 'agronomos') {
        filteredPosts = posts.filter(p => p.authorRole === 'profesional');
    } else if (currentCommunity === 'agricultores') {
        // Mostrar todos los posts (agricultores y profesionales)
        filteredPosts = posts;
    }

    console.log(`[${currentCommunity}] Posts totales: ${filteredPosts.length}`);
    console.log(`[${currentCommunity}] Posts con reportes:`, filteredPosts.filter(p => p.reports?.length).length);
    filteredPosts.forEach(p => {
        console.log(`Post ID: ${p.id}, Reportes:`, p.reports?.length || 0, p.reports);
    });

    filteredPosts.forEach(p => {
        // Un post se considera reportado si el array 'reports' existe y tiene elementos
        const isReported = p.reports && Array.isArray(p.reports) && p.reports.length > 0;
        if (isReported) reportCount++;

        // Mapear los motivos de reporte para mostrarlos al admin
        const reportReasonsHTML = isReported
            ? p.reports.map(r => `<div class="report-reason small fw-bold mt-1">• ${r.reason}</div>`).join('')
            : '';

        // Indicador de rol del autor
        const roleIcon = p.authorRole === 'profesional' ? '👨‍🌾' : '🌾';

        const cardHtml = `
            <div class="card mb-3 shadow-sm ${isReported ? 'border-danger' : 'border-0'}">
                <div class="card-body p-3">
                    ${isReported ? `
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-danger">${p.reports.length} REPORTES</span>
                        </div>
                        <div class="bg-light p-2 mb-2 rounded border-start border-danger border-3 report-reasons-container">
                            <small class="text-muted d-block">Motivos informados:</small>
                            ${reportReasonsHTML}
                        </div>
                    ` : ''}
                    
                    <div class="d-flex align-items-center mb-2">
                        <img src="${p.authorPhoto || 'src/img/default-user.png'}" 
                             class="rounded-circle me-2" 
                             style="width:30px;height:30px;object-fit:cover;">
                        <div>
                            <h6 class="mb-0 small">${roleIcon} ${p.authorName || 'Usuario'}</h6>
                            ${currentCommunity === 'agricultores' ? `<small class="text-muted">${p.authorRole === 'profesional' ? 'Profesional' : 'Agricultor'}</small>` : ''}
                        </div>
                    </div>

                    <p class="small mb-1">${p.text || 'Sin contenido'}</p>
                    
                    ${(p.mediaUrl || p.originalMedia) ? `
                        <img src="${p.mediaUrl || p.originalMedia}" 
                             class="img-fluid rounded my-2" 
                             style="max-height:200px; width:100%; object-fit:cover;">
                    ` : ''}

                    <div class="d-flex justify-content-end gap-2 mt-2">
                        ${isReported ? `
                            <button onclick="processAction('${p.id}', 'ignore')" class="btn btn-sm btn-outline-secondary">
                                Ignorar Reportes
                            </button>
                        ` : ''}
                        <button onclick="processAction('${p.id}', 'delete')" class="btn btn-sm btn-danger">
                            Eliminar Publicación
                        </button>
                    </div>
                </div>
            </div>`;

        if (isReported) {
            reportsContainer.innerHTML += cardHtml;
        } else {
            feedContainer.innerHTML += cardHtml;
        }
    });

    // 5. ACTUALIZACIÓN DE ESTADÍSTICAS Y BARRA DE SALUD
    updateStats(filteredPosts.length, reportCount, suffix);
}

function updateStats(total, reports, suffix) {
    const postCounter = document.getElementById(`total-posts-${suffix}`);
    const reportCounter = document.getElementById(`total-reports-${suffix}`);
    const healthBar = document.getElementById(`health-bar-${suffix}`);

    if (postCounter) postCounter.textContent = total;
    if (reportCounter) reportCounter.textContent = reports;

    if (healthBar) {
        // Cálculo de salud: Cada reporte resta un 15%, mínimo 0.
        const health = total > 0 ? Math.max(0, 100 - (reports * 15)) : 100;
        healthBar.style.width = `${health}%`;
        healthBar.textContent = `${health}% Salud`;

        // Cambiar color según el estado
        healthBar.className = `progress-bar ${health < 50 ? 'bg-danger' : (health < 80 ? 'bg-warning' : 'bg-success')}`;
    }
}

// 6. ACCIONES DEL ADMINISTRADOR
window.processAction = async (postId, action) => {
    const postRef = doc(db, COLLECTIONS[currentCommunity], postId);
    const collection_name = COLLECTIONS[currentCommunity];

    console.log('🔧 Acción del admin:', action);
    console.log('   Post ID:', postId);
    console.log('   Colección:', collection_name);
    console.log('   Usuario actual:', currentAdminUser?.email);

    try {
        if (action === 'delete') {
            const confirmDelete = await Swal.fire({
                title: '¿Estás seguro?',
                text: `Esta acción eliminará permanentemente el post de la comunidad ${currentCommunity === 'mujeres' ? 'de Mujeres Rurales' : 'de Agricultores/Profesionales'}.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });

            if (confirmDelete.isConfirmed) {
                console.log('⏳ Eliminando post...');

                // Mostrar loading
                Swal.fire({
                    title: 'Eliminando...',
                    icon: 'info',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const snap = await getDoc(postRef);

                    if (!snap.exists()) {
                        throw new Error("El post no existe");
                    }

                    //Notificación de eliminación por moderación (Cambio 1)
                    const post = snap.data();

                    // Determinar motivo real
                    const motivo =
                        post.reports && Array.isArray(post.reports) && post.reports.length > 0
                            ? "reporte"
                            : "admin";

                    // Crear notificación de moderación
                    await crearNotificacionModeracion({
                        postText: post.text,
                        postOwnerId: post.authorId,
                        motivo,
                        comunidad: currentCommunity === 'mujeres' ? 'mujeres' : 'agro_prof'
                    });

                    // Eliminar el post
                    await deleteDoc(postRef);

                    console.log('✅ Post eliminado y notificación enviada');
                     // Fin cambio 1


                    Swal.fire({
                        title: 'Eliminado',
                        text: 'El post ha sido removido de la comunidad.',
                        icon: 'success',
                        timer: 2000,
                        timerProgressBar: true
                    });

                    // Reiniciar la escucha para actualizar el panel
                    startListening(currentCommunity);
                } catch (deleteError) {
                    console.error("❌ Error en deleteDoc:", deleteError);
                    console.error("   Código:", deleteError.code);
                    console.error("   Mensaje:", deleteError.message);

                    // Si el error es por permisos, dar más información
                    if (deleteError.code === 'permission-denied') {
                        Swal.fire({
                            title: 'Permiso Denegado',
                            html: `<p>No tienes permisos para eliminar este post.</p>
                                   <p style="font-size: 0.9rem; color: #666;">
                                   Verifica que tu cuenta esté marcada como admin en Firebase.
                                   </p>`,
                            icon: 'error'
                        });
                    } else {
                        Swal.fire('Error', `Error al eliminar: ${deleteError.message}`, 'error');
                    }
                }
            }
        }
        else if (action === 'ignore') {
            // "Ignorar" simplemente limpia el array de reportes en Firebase
            console.log('⏳ Limpiando reportes...');

            Swal.fire({
                title: 'Limpiando reportes...',
                icon: 'info',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                await updateDoc(postRef, { reports: [] });
                console.log('✅ Reportes limpiados');

                Swal.fire({
                    title: 'Reportes limpiados',
                    text: 'El post vuelve a estar en estado normal.',
                    icon: 'success',
                    timer: 2000,
                    timerProgressBar: true
                });

                // Reiniciar la escucha para actualizar el panel
                startListening(currentCommunity);
            } catch (updateError) {
                console.error("❌ Error en updateDoc:", updateError);
                console.error("   Código:", updateError.code);
                console.error("   Mensaje:", updateError.message);

                if (updateError.code === 'permission-denied') {
                    Swal.fire({
                        title: 'Permiso Denegado',
                        html: `<p>No tienes permisos para modificar este post.</p>
                               <p style="font-size: 0.9rem; color: #666;">
                               Verifica que tu cuenta esté marcada como admin en Firebase.
                               </p>`,
                        icon: 'error'
                    });
                } else {
                    Swal.fire('Error', `Error al limpiar reportes: ${updateError.message}`, 'error');
                }
            }
        }
    } catch (e) {
        console.error("❌ Error general en processAction:", e);
        console.error("Detalles del error:", e.message, e.code);
        Swal.fire('Error', `No se pudo completar la acción: ${e.message}`, 'error');
    }
};

// 6. Función para obtener usuarios de la comunidad
window.getCommunityUsers = async (community) => {
    const { value: message } = await Swal.fire({
        title: `📢 Notificar a toda la comunidad`,
        input: 'textarea',
        inputPlaceholder: 'Escribe el mensaje para toda la comunidad...',
        inputAttributes: {
            'aria-label': 'Mensaje para la comunidad'
        },
        showCancelButton: true,
        confirmButtonText: 'Enviar a todos',
        cancelButtonText: 'Cancelar'
    });

    if (message) {
        try {
            // Obtener todos los usuarios de la comunidad (de las publicaciones)
            const collectionName = community === 'mujeres' ? 'ComunidadMujeres' : 'ComunidadAgricultoresAgronomos';
            const q = query(collection(db, collectionName));
            const snapshot = await (await import('./comunidad-agri-prof.js')).getDocs?.(q) || { docs: [] };

            // Extraer usuarios únicos
            const uniqueUsers = new Set();
            snapshot.forEach(doc => {
                if (doc.data().authorId) {
                    uniqueUsers.add(doc.data().authorId);
                }
            });

            // Enviar notificación a cada usuario
            for (const userId of uniqueUsers) {
                await addDoc(collection(db, 'notificaciones_agri_prof'), {
                    type: 'broadcast',
                    message: message,
                    community: 'agricultores_profesionales',
                    userId: userId,
                    timestamp: serverTimestamp(),
                    read: false
                });
            }

            Swal.fire('Enviado', `Notificación enviada a ${uniqueUsers.size} usuarios`, 'success');
        } catch (e) {
            console.error('Error al enviar notificación masiva:', e);
            Swal.fire('Error', 'No se pudo enviar la notificación', 'error');
        }
    }
};

// 7. INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que sea admin
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.warn('⚠️ No hay usuario autenticado, redirigiendo a login...');
            return window.location.href = 'admin-login.html';
        }

        currentAdminUser = user;
        console.log('✅ Usuario autenticado:', user.email);

        // Primero, intentar configurar correctamente el admin
        console.log('🔧 Configurando permisos de admin...');
        const setupSuccess = await verifyAndSetupAdmin(user.email);

        // Ahora verificar estatus de admin
        const isAdmin = await verifyAdminStatus(user);
        if (!isAdmin) {
            console.error('❌ Este usuario NO es admin después de configuración');
            Swal.fire({
                title: 'Acceso Denegado',
                html: `<p>Tu cuenta no tiene permisos de administrador.</p>
                       <p style="font-size: 0.9rem; color: #666;">
                       Email: ${user.email}
                       </p>
                       <p style="font-size: 0.9rem; color: #666;">
                       Si crees que es un error, contacta al equipo técnico.
                       </p>`,
                icon: 'error',
                willClose: () => {
                    window.location.href = 'index.html';
                }
            });
            return;
        }

        console.log('✅ Estatus de admin verificado correctamente');
        console.log('📋 Iniciando control de comunidades...');

        // Por defecto inicia en la sección de mujeres
        window.switchCommunity('mujeres');
    });
});

// ========================================
// FUNCIONES DE DEBUGGING (Disponibles en consola)
// ========================================
window.debugPost = diagnosticPost;
window.debugPostInCurrentCollection = async (postId) => {
    const collectionName = COLLECTIONS[currentCommunity];
    console.log(`🔍 Diagnosticando post en colección: ${collectionName}`);
    return await diagnosticPost(collectionName, postId);
};
window.showCurrentAdminStatus = async () => {
    if (!currentAdminUser) {
        console.log('❌ No hay usuario admin cargado');
        return;
    }
    console.log('👤 Usuario actual:', currentAdminUser.email);
    console.log('🔐 Verificando permisos...');
    const isAdmin = await verifyAdminStatus(currentAdminUser);
    console.log(`✅ Es admin: ${isAdmin}`);
};