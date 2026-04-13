/* ===============================
    CURSOS PARA MUJERES RURALES
    Visualización, inscripción y completación de cursos
================================ */
import { auth, db } from './firebase.js';
import {
    collection,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
    registrarEnCurso,
    desinscrbirseDelCurso,
    guardarProgresoUsuario,
    obtenerTodoProgresoUsuario
} from './cursos-firebase.js';

/* ===============================
    CONFIGURACIÓN GLOBAL DE ALERTAS
================================ */
// Configurar SweetAlert2 para que siempre esté encima del contenido
if (window.Swal) {
    Swal.mixin({
        position: 'top',
        allowOutsideClick: false,
        didOpen: (modal) => {
            modal.style.zIndex = '10001';
            const container = modal.closest('.swal2-container');
            if (container) {
                container.style.zIndex = '10001';
            }
        }
    });
}

// Variables globales
let courses = [];
let userProgress = {}; // localStorage fallback
let currentUser = null;
let unsubscribeCursos = null;
let currentCourseDetailId = null;  // Guardar el course ID del curso actual

console.log('🔶 cursos-mujeres.js cargado');
console.log('document.readyState:', document.readyState);
console.log('coursesGrid elemento existe:', !!document.getElementById('coursesGrid'));

// Exponer globalmente para debugging
window.courses = courses;
window.debugCoursos = () => {
    console.log('=== DEBUG CURSOS ===');
    console.log('Total cursos cargados:', window.courses?.length || 0);
    window.courses?.forEach(c => {
        console.log(`  📚 ${c.nombre} - Inscritas: ${c.inscritas}/${c.cupo}, Módulos: ${c.modulos?.length || 0}`);
    });
    console.log('Elemento #coursesGrid existe:', !!document.getElementById('coursesGrid'));
    console.log('Elemento #catalog-view existe:', !!document.getElementById('catalog-view'));
};
/* ===============================
    AUTENTICACIÓN E INICIALIZACIÓN
================================ */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = user;

    console.log('Usuario autenticado:', user.uid);

    // Cargar TODO el progreso desde Firestore
    const progresoFirestore = await obtenerTodoProgresoUsuario(user.uid);

    if (Object.keys(progresoFirestore).length > 0) {
        userProgress = progresoFirestore;
        console.log('Progreso restaurado desde Firestore:', userProgress);
        guardarProgresoLocal(); // cache local
    } else {
        console.log('No había progreso en Firestore, usando localStorage');
        cargarProgresoLocal();
    }

    inicializarListeners();
});

function cargarProgresoLocal() {
    try {
        const progresoGuardado = localStorage.getItem('progresoUsuario');
        userProgress = progresoGuardado ? JSON.parse(progresoGuardado) : {};
        console.log('📂 Progreso cargado desde localStorage:', Object.keys(userProgress).length, 'cursos');
    } catch (error) {
        console.warn('⚠️ No se pudo cargar progreso:', error.message);
        userProgress = {};
    }
}

function guardarProgresoLocal() {
    try {
        localStorage.setItem('progresoUsuario', JSON.stringify(userProgress));
        console.log('💾 Progreso guardado en localStorage');
    } catch (error) {
        console.warn('⚠️ No se pudo guardar progreso:', error.message);
    }
}

/* ===============================
    LISTENERS EN TIEMPO REAL
================================ */
function inicializarListeners() {
    console.log('🔄 Iniciando listeners de Firestore');

    // PRIMERO: Ver TODOS los cursos (debug)
    onSnapshot(
        collection(db, 'cursos_mujeres'),
        (snapshot) => {
            console.log('📊 DEBUG - TODOS los cursos (incluyendo eliminados):', snapshot.docs.length);
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`  - ${data.nombre} (eliminado: ${data.eliminado})`);
            });
        },
        (error) => {
            console.error('❌ Error al obtener todos los cursos:', error.message);
        }
    );

    // DESPUÉS: Listener para TODOS los cursos sin filtro (mejor rendimiento que actualizar)
    // Hacemos el filtrado en el cliente
    unsubscribeCursos = onSnapshot(
        collection(db, 'cursos_mujeres'),
        (snapshot) => {
            try {
                console.log('📸 Snapshot recibido. Documentos totales:', snapshot.docs.length);

                // Obtener todos y filtrar en el cliente
                const todosCursos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Filtrar: solo cursos que NO están eliminados (o que no tienen el campo)
                courses = todosCursos.filter(c => c.eliminado !== true);

                console.log(`✅ Cursos actualizados (${courses.length} activos de ${todosCursos.length} totales)`);
                courses.forEach(c => console.log(`  - ${c.nombre} (ID: ${c.id})`));

                renderCatalog();

            } catch (error) {
                console.error('❌ Error en listener de cursos:', error.message);
                console.error('Stack:', error.stack);
            }
        },
        (error) => {
            console.error('❌ Error de Firestore al escuchar cursos activos:', error.message);
            console.error('Código de error:', error.code);
            console.error('Stack:', error.stack);
        }
    );
}

/* ===============================
    RENDERIZADO DE CATÁLOGO
================================ */
function renderCatalog() {
    console.log('🎨 Iniciando renderizado de catálogo');
    console.log('Total de cursos a renderizar:', courses.length);

    const coursesGrid = document.getElementById('coursesGrid');
    if (!coursesGrid) {
        console.warn('⚠️ No se encontró elemento #coursesGrid en el DOM');
        console.log('Elementos en página:', document.body.innerHTML.substring(0, 500));
        return;
    }

    coursesGrid.innerHTML = "";

    if (courses.length === 0) {
        console.warn('⚠️ No hay cursos disponibles');
        coursesGrid.innerHTML = `
            <p style="text-align:center; padding:40px; grid-column:1/-1; color:#999;">
                No hay cursos disponibles en este momento. Vuelve pronto.
            </p>
        `;
        return;
    }

    courses.forEach(course => {
        const isEnrolled = !!userProgress[course.id]?.enrolled;
        const completedModules = userProgress[course.id]?.completedModules || [];
        const totalModules = course.modulos?.length || 0;
        const progress = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;
        const espaciosDisponibles = Math.max(0, (course.cupo || 0) - (course.inscritas || 0));

        const card = document.createElement('div');
        card.className = 'course-card';
        card.innerHTML = `
            <img src="${course.imagen || 'https://via.placeholder.com/300x150'}" 
                 alt="${course.nombre}" 
                 class="course-img">
            <div class="course-body">
                <div class="course-badge">${course.categoria || 'Curso'}</div>
                <h3>${course.nombre}</h3>
                <p>${course.descripcion}</p>
                
                ${isEnrolled ? `
                    <div class="progress-bar-container" style="margin: 15px 0;">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <p style="font-size:0.9rem; color:#666;">
                        ${completedModules.length}/${totalModules} módulos completados (${progress}%)
                    </p>
                ` : `
                    <p style="font-size:0.9rem; color:#999;">
                        Cupos disponibles: <strong>${espaciosDisponibles}/${course.cupo}</strong>
                    </p>
                `}

                <div class="course-footer">
                    ${isEnrolled ?
                `<button class="btn-enroll" onclick="irAlCurso('${course.id}')">
                            ${progress === 100 ? 'Reconocimiento' : '📖 Continuar'}
                        </button>` :
                `<button class="btn-enroll" onclick="inscribirseEnCurso('${course.id}')" 
                                ${espaciosDisponibles === 0 ? 'disabled' : ''}>
                            ${espaciosDisponibles === 0 ? 'Sin cupo' : 'Inscribirse'}
                        </button>`
            }
                </div>
            </div>
        `;

        coursesGrid.appendChild(card);
    });

    console.log(`✅ ${courses.length} cursos renderizados`);
}

// Exponer renderCatalog globalmente
window.renderCatalog = renderCatalog;

/* ===============================
    INSCRIPCIÓN A CURSOS
================================ */
window.inscribirseEnCurso = async (courseId) => {
    try {
        console.log('📝 === INSCRIBIRSE EN CURSO ===');
        console.log('ID del curso:', courseId, 'Tipo:', typeof courseId);

        // Buscar curso
        const course = courses.find(c => String(c.id) === String(courseId));
        if (!course) {
            console.error('❌ Curso no encontrado');
            Swal.fire('Error', 'Curso no encontrado. Recarga la página.', 'error');
            return;
        }

        console.log('✅ Curso encontrado:', course.nombre);

        // Validar cupo
        const espaciosDisponibles = (course.cupo || 0) - (course.inscritas || 0);
        if (espaciosDisponibles <= 0) {
            Swal.fire('Sin cupo', 'Este curso ya no tiene cupo disponible', 'warning');
            return;
        }

        // Calcular total de módulos
        const totalModules = course.modulos?.length || 0;

        // Mostrar confirmación
        const confirmacion = await Swal.fire({
            title: `¿Inscribirse en "${course.nombre}"?`,
            html: `<div style="text-align: left;">
                <p><strong>Detalles del curso:</strong></p>
                <p>📚 Módulos: ${totalModules}</p>
                <p>👥 Cupos disponibles: ${espaciosDisponibles}/${course.cupo}</p>
                <p style="margin-top: 15px; color: #666;">Una vez inscrito, podrás acceder a todos los módulos y completar el curso.</p>
            </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '✅ Sí, inscribirse',
            confirmButtonColor: '#2e7d32',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacion.isConfirmed) {
            console.log('⚠️ Inscripción cancelada por usuario');
            return;
        }

        // Incrementar contador en Firestore
        console.log('⏳ Registrando inscripción en Firestore...');
        const exitoInscripcion = await registrarEnCurso(courseId, currentUser.uid);

        if (!exitoInscripcion) {
            Swal.fire('Sin cupo', 'No hay cupo disponible', 'warning');
            return;
        }

        // Guardar en localStorage
        userProgress[courseId] = {
            enrolled: true,
            completedModules: [],
            finalExam: false,
            enrolledDate: new Date().toISOString()
        };
        guardarProgresoLocal();

        // Intentar guardar en Firestore (backup)
        await guardarProgresoUsuario(currentUser.uid, courseId, userProgress[courseId]);

        await Swal.fire({
            title: '✅ ¡Inscrito!',
            html: `<div style="text-align: left;">
                <p>Te has inscrito en <strong>${course.nombre}</strong></p>
                <p>✓ Puedes acceder a todos los ${totalModules} módulos</p>
                <p>✓ Completa cada módulo para avanzar</p>
                <p>✓ Habrá un examen final al terminar</p>
            </div>`,
            icon: 'success',
            confirmButtonColor: '#2e7d32'
        });

        renderCatalog();

    } catch (error) {
        console.error('❌ Error inscribiendo:', error.message);
        await Swal.fire({
            title: '❌ Error en la inscripción',
            text: error.message,
            icon: 'error'
        });
    }
};

/* ===============================
    ABRIR CURSO
================================ */
window.irAlCurso = async (courseId) => {
    try {
        console.log('📖 Abriendo curso:', courseId);

        const course = courses.find(c => String(c.id) === String(courseId));
        if (!course) {
            Swal.fire('Error', 'Curso no encontrado', 'error');
            return;
        }

        // Asegurar que está inscrito
        if (!userProgress[courseId]) {
            userProgress[courseId] = {
                enrolled: true,
                completedModules: [],
                finalExam: false,
                enrolledDate: new Date().toISOString()
            };
            guardarProgresoLocal();
        }

        mostrarDetalleCurso(course);

    } catch (error) {
        console.error('❌ Error abriendo curso:', error);
        Swal.fire('Error', 'No se pudo abrir el curso', 'error');
    }
};

/* ===============================
    DETALLE DEL CURSO
================================ */
window.mostrarDetalleCurso = (course) => {
    currentCourseDetailId = course.id;  // Guardar el ID del curso actual
    const catalogView = document.getElementById('catalog-view');
    const detailView = document.getElementById('course-detail-view');

    if (!catalogView || !detailView) {
        console.warn('⚠️ No se encontraron elementos del detalle');
        return;
    }

    console.log('🔍 Mostrando detalle de:', course.nombre);

    catalogView.classList.add('hidden');
    detailView.classList.remove('hidden');

    // Llenar datos del curso
    const titleEl = document.getElementById('detail-title');
    const descEl = document.getElementById('detail-desc');
    const imgEl = document.getElementById('detail-img');

    if (titleEl) titleEl.innerText = course.nombre;
    if (descEl) descEl.innerText = course.descripcion;
    if (imgEl) imgEl.src = course.imagen || 'https://via.placeholder.com/800x300';

    renderModules(course);
    actualizarUI(course);
};

function renderModules(course) {
    const modulesList = document.getElementById('modules-list');
    if (!modulesList) return;

    modulesList.innerHTML = "";
    const modulos = course.modulos || [];
    const completedModules = userProgress[course.id]?.completedModules || [];

    modulos.forEach((modulo, index) => {
        const isCompleted = completedModules.includes(index);
        const isPreviousCompleted = index === 0 || completedModules.includes(index - 1);
        const isBlocked = !isPreviousCompleted && !isCompleted;

        const div = document.createElement('div');
        div.className = `module-item ${isCompleted ? 'completed' : ''} ${isBlocked ? 'blocked' : ''}`;

        let statusBadge = '';
        let buttonHTML = '';

        if (isCompleted) {
            statusBadge = '<span class="badge-completed">✓ Completado</span>';
            buttonHTML = `<button class="btn-modulo" onclick="verContenidoYEvaluar('${course.id}', ${index})">📖 Repasar</button>`;
        } else if (isBlocked) {
            statusBadge = '<span class="badge-blocked">🔒 Bloqueado</span>';
            buttonHTML = `<button class="btn-modulo" disabled style="opacity: 0.5; cursor: not-allowed;">Completa el módulo ${index} primero</button>`;
        } else {
            statusBadge = '<span class="badge-active">▶ Disponible</span>';
            buttonHTML = `<button class="btn-modulo" onclick="verContenidoYEvaluar('${course.id}', ${index})">▶ Comenzar</button>`;
        }

        div.innerHTML = `
            <div class="module-header">
                <h4>${index + 1}. ${modulo.titulo}</h4>
                ${statusBadge}
            </div>
            <p style="font-size: 0.9rem; color: #666; margin: 10px 0;">
                ${modulo.contenido || 'Sin descripción'}
            </p>
            ${buttonHTML}
        `;
        modulesList.appendChild(div);
    });

    // Mostrar examen final solo si TODOS los módulos están completados
    const allCompleted = modulos.length > 0 && modulos.length === completedModules.length;
    const examSection = document.getElementById('final-exam-section');
    if (examSection) {
        examSection.style.display = allCompleted ? 'block' : 'none';
    }

    console.log(`✅ ${modulos.length} módulos renderizados (${completedModules.length} completados)`);
}

/* ===============================
    CONTENIDO Y EVALUACIÓN DEL MÓDULO
================================ */
window.verContenidoYEvaluar = async (courseId, modIndex) => {
    try {
        console.log('📚 Abriendo módulo:', { courseId, modIndex });

        const course = courses.find(c => String(c.id) === String(courseId));
        if (!course) {
            Swal.fire('Error', 'Curso no encontrado', 'error');
            return;
        }

        const modulo = course.modulos?.[modIndex];
        if (!modulo) {
            Swal.fire('Error', 'Módulo no encontrado', 'error');
            return;
        }

        // Mostrar contenido
        await Swal.fire({
            title: modulo.titulo,
            html: `
                <div style="text-align:left; background:#f9f9f9; padding:15px; border-radius:8px; max-height:400px; overflow-y:auto;">
                    ${modulo.contenido.replace(/\n/g, '<br>')}
                </div>
            `,
            confirmButtonText: 'Comenzar Evaluación',
            confirmButtonColor: '#2e7d32'
        });

        // Evaluación
        await realizarEvaluacionModulo(courseId, modIndex, modulo);

    } catch (error) {
        console.error('❌ Error en módulo:', error);
        Swal.fire('Error', 'Hubo un error: ' + error.message, 'error');
    }
};

async function realizarEvaluacionModulo(courseId, modIndex, modulo) {
    if (!modulo.preguntas || modulo.preguntas.length === 0) {
        completarModulo(courseId, modIndex);
        return;
    }

    let aciertos = 0;
    const totalPreguntas = modulo.preguntas.length;

    for (let i = 0; i < totalPreguntas; i++) {
        const pregunta = modulo.preguntas[i];

        const { value: respuestaIdx } = await Swal.fire({
            title: `Pregunta ${i + 1}/${totalPreguntas}`,
            text: pregunta.texto,
            input: 'radio',
            inputOptions: Object.fromEntries(
                pregunta.opciones.map((opt, idx) => [idx, opt])
            ),
            allowOutsideClick: false,
            confirmButtonColor: '#2e7d32'
        });

        if (respuestaIdx !== undefined && pregunta.correctas.includes(Number(respuestaIdx))) {
            aciertos++;
        }
    }

    const porcentaje = Math.round((aciertos / totalPreguntas) * 100);
    console.log(`📊 Resultado: ${aciertos}/${totalPreguntas} (${porcentaje}%)`);

    if (porcentaje >= 80) {
        await Swal.fire({
            title: '✅ ¡Aprobado!',
            html: `
                <div>
                    <p>Obtuviste <strong>${porcentaje}%</strong> de aciertos</p>
                    <p style="color: #2e7d32; margin-top: 10px;">
                        ✓ El siguiente módulo está disponible
                    </p>
                </div>
            `,
            icon: 'success',
            confirmButtonColor: '#2e7d32'
        });
        completarModulo(courseId, modIndex);
    } else {
        await Swal.fire({
            title: '❌ Intenta de nuevo',
            html: `
                <div>
                    <p>Obtuviste <strong>${porcentaje}%</strong> de aciertos</p>
                    <p style="color: #d32f2f;">Se requiere <strong>80%</strong> para aprobar</p>
                </div>
            `,
            icon: 'error'
        });
    }
}

function completarModulo(courseId, modIndex) {
    console.log('✅ Completando módulo', modIndex, 'del curso', courseId);

    if (!userProgress[courseId]) {
        userProgress[courseId] = { enrolled: true, completedModules: [], finalExam: false };
    }

    if (!userProgress[courseId].completedModules.includes(modIndex)) {
        userProgress[courseId].completedModules.push(modIndex);
        guardarProgresoLocal();
        // Guardar en Firestore también
        guardarProgresoUsuario(currentUser.uid, courseId, userProgress[courseId]).catch(err =>
            console.error('❌ Error guardando en Firestore:', err)
        );
    }

    const course = courses.find(c => String(c.id) === String(courseId));
    if (course) {
        renderModules(course);
        actualizarUI(course);
    }
}

/* ===============================
    ACTUALIZAR UI Y EVALUACIÓN FINAL
================================ */
function actualizarUI(course) {
    const progreso = userProgress[course.id] || { completedModules: [], finalExam: false };
    const porcentaje = course.modulos?.length > 0
        ? Math.round((progreso.completedModules.length / course.modulos.length) * 100)
        : 0;

    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (progressFill) progressFill.style.width = porcentaje + '%';
    if (progressText) progressText.innerText = porcentaje + '%';

    const btnFinal = document.getElementById('btn-final-exam');
    const btnCert = document.getElementById('btn-certificado');
    const examSection = document.getElementById('final-exam-section');

    const todosCompletados = course.modulos?.length > 0 &&
        progreso.completedModules.length === course.modulos.length;

    if (examSection) {
        examSection.style.display = todosCompletados ? 'block' : 'none';
    }

    if (btnFinal) {
        if (progreso.finalExam) {
            btnFinal.style.display = 'none';
        } else {
            btnFinal.style.display = 'block';
            btnFinal.disabled = !todosCompletados;
            btnFinal.style.opacity = todosCompletados ? '1' : '0.5';
            btnFinal.style.cursor = todosCompletados ? 'pointer' : 'not-allowed';
            btnFinal.onclick = () => iniciarExamenFinal(course.id);
        }
    }

    if (btnCert) {
        // Mostrar siempre el botón si la evaluación final está completada
        if (progreso.finalExam) {
            btnCert.style.display = 'block';
            btnCert.classList.remove('hidden');
            btnCert.onclick = () => mostrarCertificado(course);
        } else {
            btnCert.style.display = 'none';
            btnCert.classList.add('hidden');
        }
    }
}

window.iniciarExamenFinal = async (courseId) => {
    try {
        console.log('🎓 Iniciando examen final:', courseId);

        const course = courses.find(c => String(c.id) === String(courseId));
        if (!course) {
            Swal.fire('Error', 'Curso no encontrado', 'error');
            return;
        }

        // Validar que todos los módulos estén completados
        const completedModules = userProgress[courseId]?.completedModules || [];
        const totalModulos = course.modulos?.length || 0;
        if (completedModules.length !== totalModulos) {
            await Swal.fire({
                title: '⚠️ Módulos Pendientes',
                text: `Debes completar todos los ${totalModulos} módulos antes de hacer el examen final`,
                icon: 'warning'
            });
            return;
        }

        const examen = course.evaluacionFinal;
        if (!examen?.preguntas || examen.preguntas.length === 0) {
            // Sin examen, aprobar directamente
            userProgress[courseId].finalExam = true;
            guardarProgresoLocal();
            await guardarProgresoUsuario(currentUser.uid, courseId, userProgress[courseId]);
            actualizarUI(course);
            mostrarCertificado(course);
            return;
        }

        // Mostrar advertencia
        await Swal.fire({
            title: '🎓 Evaluación Final',
            html: '<p>Esta evaluación es <strong>obligatoria</strong> para obtener tu reconocimiento</p><p>Debes obtener <strong>100%</strong> de aciertos para aprobar</p>',
            icon: 'info',
            confirmButtonText: 'Continuar',
            confirmButtonColor: '#2e7d32'
        });

        let aciertos = 0;
        const totalPreguntas = examen.preguntas.length;

        for (let i = 0; i < totalPreguntas; i++) {
            const p = examen.preguntas[i];

            const { value: respuestaIdx } = await Swal.fire({
                title: `EVALUACIÓN FINAL - Pregunta ${i + 1}/${totalPreguntas}`,
                text: p.texto,
                input: 'radio',
                inputOptions: Object.fromEntries(p.opciones.map((opt, idx) => [idx, opt])),
                allowOutsideClick: false,
                confirmButtonColor: '#2e7d32'
            });

            if (respuestaIdx !== undefined && p.correctas.includes(Number(respuestaIdx))) {
                aciertos++;
            }
        }

        // Se requiere 100% en examen final
        if (aciertos === totalPreguntas) {
            userProgress[courseId].finalExam = true;
            guardarProgresoLocal();
            await guardarProgresoUsuario(currentUser.uid, courseId, userProgress[courseId]);

            actualizarUI(course);
            await Swal.fire({
                title: '🎉 ¡Felicidades!',
                html: '<p>¡Obtuviste <strong>100%</strong> en la evaluación final!</p><p>Has completado el curso exitosamente y ganado tu reconocimiento</p>',
                icon: 'success',
                confirmButtonColor: '#2e7d32'
            });
            mostrarCertificado(course);
        } else {
            const porcentaje = Math.round((aciertos / totalPreguntas) * 100);
            await Swal.fire({
                title: '❌ Intenta de nuevo',
                html: `<p>Obtuviste <strong>${porcentaje}%</strong> de aciertos en la evaluación final</p><p>Se requiere <strong>100%</strong> para obtener tu reconocimiento</p>`,
                icon: 'error'
            });
        }

    } catch (error) {
        console.error('❌ Error en examen:', error);
        Swal.fire('Error', 'Hubo un error: ' + error.message, 'error');
    }
};

/* ===============================
    CERTIFICADO Y RECONOCIMIENTO
================================ */
/* ===============================
    RECONOCIMIENTO Y LOGROS
================================ */
window.mostrarCertificado = async (course) => {
    // Obtener nombre y apellido del usuario desde inputs ocultos o Firestore
    let firstName = document.getElementById('firstName')?.value || '';
    let lastName = document.getElementById('lastName')?.value || '';
    let nombreUsuario = firstName && lastName
        ? `${firstName} ${lastName}`
        : currentUser?.displayName || currentUser?.email?.split('@')[0] || "Mujer Rural Cultivida";

    // Si no está disponible en inputs ocultos, obtener de Firestore
    if (!firstName || !lastName) {
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                // Usar nombre completo si está disponible
                if (userData.nombre && userData.apellido) {
                    nombreUsuario = `${userData.nombre} ${userData.apellido}`;
                    firstName = userData.nombre;
                    lastName = userData.apellido;
                    // Actualizar inputs ocultos
                    const firstNameInput = document.getElementById('firstName');
                    const lastNameInput = document.getElementById('lastName');
                    if (firstNameInput) firstNameInput.value = firstName;
                    if (lastNameInput) lastNameInput.value = lastName;
                } else if (userData.displayName) {
                    nombreUsuario = userData.displayName;
                }
            }
        } catch (error) {
            console.warn('No se pudo obtener nombre de Firestore:', error);
        }
    }

    const cursoNombre = course?.nombre || "Curso Cultivida";
    const fechaFin = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const result = await Swal.fire({
        width: 'auto',
        background: '#f7f9f7',
        showCancelButton: true,
        confirmButtonText: '⬇ Descargar',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#2e7d32',
        html: `
    <div style="display:flex; justify-content:center; align-items:center; width:100%; margin:0 auto;">
    <div id="certificadoPDF" style="
    position: relative;
    width: 100%;
    max-width: 816px;
    aspect-ratio: 816 / 1056;
    padding: 60px;
    background: #ffffff;
    box-sizing: border-box;
    margin: auto;
    padding: 60px;
    background: #ffffff;
    box-sizing: border-box;
    margin: auto;
    border: 10px solid #2e7d32;
    box-shadow: 0 25px 60px rgba(0,0,0,0.15);
    text-align: center;
    font-family: 'Segoe UI', 'Poppins', sans-serif;
">

        <!-- SELLO OFICIAL -->
        <img src="sello-cultivida.png" alt="Sello Oficial Cultivida"
            style="
                position: absolute;
                bottom: 140px;
                right: 90px;
                width: 140px;
                opacity: 0.14;
                transform: rotate(-12deg);
                pointer-events: none;
            ">

        <!-- Esquinas decorativas -->
        ${['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => `
        <span style="
            position:absolute;
            ${pos.includes('top') ? 'top:14px;' : 'bottom:14px;'}
            ${pos.includes('left') ? 'left:14px;' : 'right:14px;'}
            width:36px;
            height:36px;
            border-${pos.includes('top') ? 'top' : 'bottom'}:3px solid #2e7d32;
            border-${pos.includes('left') ? 'left' : 'right'}:3px solid #2e7d32;
        "></span>`).join('')}

        <!-- Encabezado -->
        <div style="margin-bottom: 26px;">
            <h2 style="
                margin: 0;
                font-size: 2.2em;
                color: #1b5e20;
                letter-spacing: 2px;
                font-weight: 800;
            ">CULTIVIDA</h2>

            <p style="
                margin: 6px 0 0;
                color: #607d8b;
                font-size: 0.95em;
            ">Cursos de Aprendizaje para Mujeres Rurales</p>
        </div>

        <hr style="
            border: none;
            height: 2px;
            background: linear-gradient(to right, transparent, #2e7d32, transparent);
            margin: 26px 0;
        ">

        <!-- Título -->
        <h1 style="
            margin: 18px 0 6px;
            font-size: 2.8em;
            color: #2e7d32;
            letter-spacing: 1px;
        ">RECONOCIMIENTO</h1>

        <p style="
            margin: 0 0 28px;
            font-size: 1.1em;
            color: #555;
        ">Por Logros Académicos</p>

        <!-- Nombre -->
        <p style="font-style: italic; color: #555;">Se otorga a</p>

        <h2 style="
            margin: 14px 0 24px;
            font-size: 2.1em;
            color: #1b5e20;
            text-transform: uppercase;
            letter-spacing: 1px;
        ">${nombreUsuario}</h2>

        <!-- Descripción -->
        <div style="
            background: #f1f8f3;
            padding: 26px 28px;
            border-left: 5px solid #2e7d32;
            margin: 28px 0;
            text-align: left;
            border-radius: 6px;
        ">
            <p style="margin: 0 0 10px; font-weight: 600; color: #2e7d32;">
                Por haber completado exitosamente:
            </p>

            <h3 style="
                margin: 6px 0 12px;
                color: #1b5e20;
                font-size: 1.25em;
            ">${cursoNombre}</h3>

            <p style="margin: 0; color: #555; line-height: 1.6;">
                Cumpliendo satisfactoriamente todos los módulos y obteniendo una
                calificación sobresaliente en la evaluación final, demostrando
                compromiso, disciplina y excelencia académica.
            </p>
        </div>

        <!-- FIRMA DIGITAL -->
        <div style="
            margin-top: 40px;
            display: flex;
            justify-content: center;
        ">
            <div style="text-align: center;">
                <img src="src/img/LogoNoFondo.png" alt="Sello"
                    style="height: 55px; opacity: 0.85; margin-bottom: 6px;">
                <div style="border-top: 2px solid #2e7d32; width: 260px; margin: auto;"></div>
            
            </div>
        </div>

        <!-- Fecha -->
        <p style="margin-top: 28px; color: #777; font-size: 0.9em;">Expedido el</p>
        <p style="
            margin: 6px 0;
            font-size: 1.1em;
            font-weight: 600;
            color: #333;
        ">${fechaFin}</p>

        <!-- Pie -->
        <div style="
            margin-top: 30px;
            padding-top: 18px;
            border-top: 2px solid #2e7d32;
        ">
            <p style="
                margin: 0;
                font-weight: 700;
                color: #2e7d32;
            ">✔ Certificado Digital Oficial</p>

            <p style="
                margin: 6px 0 0;
                font-size: 0.8em;
                color: #777;
            ">
             culminación exitosa del curso
            </p>

            <p style="
                margin-top: 8px;
                font-size: 0.7em;
                color: #999;
            ">
                Código de validación: CV-${Date.now()}
            </p>
        </div>

        </div>
</div>
`
    });

    if (result.isConfirmed) {

        if (result.isConfirmed) {

            const certificado = document.getElementById("certificadoPDF");

            await html2canvas(certificado, {
                scale: 3,
                useCORS: true,
                width: 816,
                height: 1056,
                windowWidth: 816
            }).then(canvas => {

                const imgData = canvas.toDataURL("image/png");

                const { jsPDF } = window.jspdf;

                /* Crear PDF Letter Vertical */
                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: "letter"
                });

                pdf.addImage(imgData, "PNG", 0, 0, 216, 279);

                /* 8️⃣ Guardar */
                pdf.save(`Reconocimiento-${cursoNombre}.pdf`);
            });
        }
    }



    // Confirmación de reconocimiento
    // const result = await Swal.fire({
    //     title: '✅ ¡Reconocimiento Otorgado!',
    //     html: `<p>Felicidades <strong>${nombreUsuario}</strong></p><p>Tu reconocimiento ha sido generado exitosamente</p><p>🌱 CULTIVIDA reconoce tu esfuerzo y dedicación</p>`,
    //     icon: 'success',
    //     confirmButtonText: 'Volver al Catálogo',
    //     confirmButtonColor: '#278f0d'
    // });

    // // Volver al catálogo
    volverAlCatalogo();
};

// Alias para compatibilidad
window.mostrarFelicitacionFinal = window.mostrarCertificado;

/* ===============================
    NAVEGACIÓN
================================ */
window.volverAlCatalogo = () => {
    const catalogView = document.getElementById('catalog-view');
    const detailView = document.getElementById('course-detail-view');

    if (catalogView && detailView) {
        catalogView.classList.remove('hidden');
        detailView.classList.add('hidden');
    }
};

/**
 * Mostrar felicitación final cuando se abre desde HTML
 */
function mostrarFelicitacionFinalCourseDetail() {
    if (!currentCourseDetailId) {
        Swal.fire('Error', 'No hay curso abierto', 'error');
        return;
    }

    const course = courses.find(c => String(c.id) === String(currentCourseDetailId));
    if (course) {
        mostrarCertificado(course);
    }
}

// Exportar para uso desde HTML
window.mostrarFelicitacionFinalCourseDetail = mostrarFelicitacionFinalCourseDetail;

// Alias para compatibilidad
window.showCatalog = window.volverAlCatalogo;

/* ===== MANEJO DE NAVBAR ===== */
// Botón de cerrar sesión
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            sessionStorage.clear();
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Error cerrando sesión:', err);
        }
    });
}

// Botón de configurar perfil
const btnProfileConfig = document.getElementById('btnProfileConfig');
if (btnProfileConfig) {
    btnProfileConfig.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'p-m-edit.html';
    });
}
