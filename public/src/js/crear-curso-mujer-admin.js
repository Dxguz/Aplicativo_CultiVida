/* ===============================
    VARIABLES Y CONFIGURACIÓN
================================ */
import {
    guardarCurso,
    actualizarCurso,
    obtenerTodosCursos,
    obtenerCursosActivos,
    eliminarCurso
} from "./cursos-firebase.js";
import { uploadToCloudinary } from "./cloudinary-api.js";

import { crearNotificacionNuevoCursoMujeres }
    from "./notifications-curso-mujeres.js";


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

const btnMostrarModal = document.getElementById("btnMostrarModal");
const modalCurso = document.getElementById("modalCurso");
const cerrarModal = document.querySelector(".cerrar-modal");

const formCurso = document.getElementById("formCrearCurso");
const contenedorModulos = document.getElementById("contenedorModulos");
const btnAgregarModulo = document.getElementById("btnAgregarModulo");
const mosaicoCursos = document.getElementById("mosaicoCursos");

let modulos = [];
let editCurso = null;

/* ===============================
    GESTIÓN DEL MODAL
================================ */
btnMostrarModal.addEventListener("click", () => {
    console.log('➕ Abriendo modal para crear NUEVO curso');
    limpiarFormulario();
    editCurso = {
        id: null,
        imagen: "https://via.placeholder.com/300x180?text=Curso+Rural",
        evaluacionFinal: { titulo: "Evaluación Final", contenido: "", preguntas: [] }
    };
    modulos = [];
    renderModulos();
    modalCurso.style.display = "block";
});

cerrarModal.onclick = () => {
    modalCurso.style.display = "none";
    limpiarFormulario();
};

window.onclick = (e) => {
    if (e.target === modalCurso) {
        modalCurso.style.display = "none";
        limpiarFormulario();
    }
};

/* ===============================
    RENDERIZADO DE MÓDULOS (ADMIN)
================================ */
function renderModulos() {
    contenedorModulos.innerHTML = "";
    modulos.forEach((_, i) => renderModulo(i));
    modulos.forEach((m, i) => {
        m.preguntas.forEach((_, pi) => renderPregunta(i, pi));
    });

    // Solo renderizar evaluación final si editCurso está inicializado
    if (editCurso && editCurso.evaluacionFinal) {
        renderEvaluacionFinal();
        (editCurso.evaluacionFinal.preguntas || []).forEach((_, pi) => renderPregunta("final", pi));
    }
}

function renderModulo(index) {
    const modulo = modulos[index];
    const div = document.createElement("div");
    div.classList.add("modulo-card");
    div.dataset.index = index;

    div.innerHTML = `
        <div class="modulo-header">
            <h4>Módulo ${index + 1}</h4>
            <button type="button" class="btn-eliminar-modulo" data-index="${index}">Eliminar</button>
        </div>
        <div class="grupo-form">
            <label>Título del módulo</label>
            <input type="text" data-field="titulo" data-index="${index}" value="${modulo.titulo || ''}" placeholder="Ej: Introducción">
        </div>
        <div class="grupo-form">
            <label>Contenido Teórico</label>
            <textarea rows="4" data-field="contenido" data-index="${index}" placeholder="Escribe aquí el material de estudio ...">${modulo.contenido || ''}</textarea>
        </div>
        <div class="contenedorPreguntas"></div>
        <button type="button" class="btn-agregar-pregunta" data-index="${index}">+ Añadir Pregunta de Evaluación</button>
    `;
    contenedorModulos.appendChild(div);
}

function renderEvaluacionFinal() {
    const ev = editCurso.evaluacionFinal;
    const div = document.createElement("div");
    div.classList.add("modulo-card", "final-card");
    div.dataset.index = "final";

    div.innerHTML = `
        <h4 style="color: #2e7d32;">🎓 Evaluación Final del Curso</h4>
        <div class="grupo-form">
            <label>Instrucciones</label>
            <textarea rows="2" data-field="contenido" data-index="final" placeholder="Instrucciones del examen...">${ev.contenido || ''}</textarea>
        </div>
        <div class="contenedorPreguntas"></div>
        <button type="button" class="btn-agregar-pregunta" data-index="final">+ Añadir Pregunta Final</button>
    `;
    contenedorModulos.appendChild(div);
}


/* ===============================
    GESTIÓN DE PREGUNTAS (SÓLO ÚNICA RESPUESTA)
================================ */
function renderPregunta(mIdx, pIdx) {
    const target = mIdx === "final" ? editCurso.evaluacionFinal : modulos[mIdx];
    const pregunta = target.preguntas[pIdx];
    const moduloDiv = document.querySelector(`.modulo-card[data-index="${mIdx}"]`);
    const contPreguntas = moduloDiv.querySelector(".contenedorPreguntas");

    const div = document.createElement("div");
    div.classList.add("pregunta-card");
    div.innerHTML = `
        <div class="pregunta-header">
            <input type="text" placeholder="Escriba la pregunta aquí..." value="${pregunta.texto || ''}" oninput="actualizarTextoP('${mIdx}', ${pIdx}, this.value)">
            <button type="button" class="btn-eliminar-pregunta" onclick="borrarP('${mIdx}', ${pIdx})">✖</button>
        </div>
        <div class="tipo-respuesta">
            <small style="color: #666;">Tipo: Selección única (Radio)</small>
        </div>
        <div class="opciones-lista"></div>
        <button type="button" class="btn-agregar-opcion" onclick="agregarOpcion('${mIdx}', ${pIdx})">+ Añadir Opción</button>
    `;
    contPreguntas.appendChild(div);

    pregunta.opciones.forEach((textoOp, oIdx) => {
        const lista = div.querySelector(".opciones-lista");
        const esCorrecta = pregunta.correctas.includes(oIdx);
        const divOp = document.createElement("div");
        divOp.className = "opcion-item";
        divOp.innerHTML = `
            <input type="radio" 
                   name="correcta-${mIdx}-${pIdx}" 
                   ${esCorrecta ? 'checked' : ''} 
                   onchange="actualizarCorrecta('${mIdx}', ${pIdx}, ${oIdx}, this.checked)">
            <input type="text" value="${textoOp}" placeholder="Texto de la opción" oninput="actualizarTextoOp('${mIdx}', ${pIdx}, ${oIdx}, this.value)">
            <button type="button" onclick="quitarOp('${mIdx}', ${pIdx}, ${oIdx})">✕</button>
        `;
        lista.appendChild(divOp);
    });
}

/* ===============================
    FUNCIONES DE APOYO (CRUD INTERNO)
================================ */
window.actualizarTextoP = (m, p, val) => {
    const target = m === "final" ? editCurso.evaluacionFinal : modulos[m];
    target.preguntas[p].texto = val;
};

window.cambiarTipoP = (m, p, tipo) => {
    const target = m === "final" ? editCurso.evaluacionFinal : modulos[m];
    target.preguntas[p].tipo = tipo;
    target.preguntas[p].correctas = [];
    renderModulos();
};

window.actualizarTextoOp = (m, p, o, val) => {
    const target = m === "final" ? editCurso.evaluacionFinal : modulos[m];
    target.preguntas[p].opciones[o] = val;
};

window.actualizarCorrecta = (m, p, o, checked) => {
    const target = m === "final" ? editCurso.evaluacionFinal : modulos[m];
    const preg = target.preguntas[p];
    if (preg.tipo === "unica") {
        preg.correctas = checked ? [o] : [];
        renderModulos();
    } else {
        if (checked) { if (!preg.correctas.includes(o)) preg.correctas.push(o); }
        else { preg.correctas = preg.correctas.filter(i => i !== o); }
    }
};

window.agregarOpcion = (m, p) => {
    const target = m === "final" ? editCurso.evaluacionFinal : modulos[m];
    target.preguntas[p].opciones.push("");
    renderModulos();
};

window.quitarOp = (m, p, o) => {
    const target = m === "final" ? editCurso.evaluacionFinal : modulos[m];
    target.preguntas[p].opciones.splice(o, 1);
    target.preguntas[p].correctas = target.preguntas[p].correctas.filter(i => i !== o);
    renderModulos();
};

window.borrarP = (m, p) => {
    const target = m === "final" ? editCurso.evaluacionFinal : modulos[m];
    target.preguntas.splice(p, 1);
    renderModulos();
};

/* ===============================
    EVENTOS Y GUARDADO
================================ */
contenedorModulos.addEventListener("input", e => {
    const { field, index } = e.target.dataset;
    if (index !== undefined && field) {
        if (index === "final") editCurso.evaluacionFinal[field] = e.target.value;
        else modulos[index][field] = e.target.value;
    }
});

contenedorModulos.addEventListener("click", e => {
    if (e.target.classList.contains("btn-agregar-pregunta")) {
        const idx = e.target.dataset.index;
        const target = idx === "final" ? editCurso.evaluacionFinal : modulos[idx];
        target.preguntas.push({ texto: "", tipo: "unica", opciones: [""], correctas: [] });
        renderModulos();
    }
    if (e.target.classList.contains("btn-eliminar-modulo")) {
        modulos.splice(e.target.dataset.index, 1);
        renderModulos();
    }
});

btnAgregarModulo.onclick = () => {
    modulos.push({ titulo: "", contenido: "", preguntas: [] });
    renderModulos();
};

formCurso.onsubmit = async (e) => {
    e.preventDefault();

    console.log('📝 === SUBMIT DEL FORMULARIO ===');

    // 1. Captura de datos
    const nombre = document.getElementById("nombreCurso").value.trim();
    const descripcion = document.getElementById("descripcionCurso").value.trim();
    const cupoInput = document.getElementById("cupoCurso").value;
    const imgFile = document.getElementById("imagenCurso").files[0];

    console.log('📋 Datos capturados:', { nombre, descripcion, cupo: cupoInput, tieneImagen: !!imgFile });

    // 2. Validar campos obligatorios
    if (!nombre || nombre.length < 3) {
        Swal.fire("Error", "El nombre debe tener al menos 3 caracteres", "error");
        return;
    }

    if (!descripcion || descripcion.length < 10) {
        Swal.fire("Error", "La descripción debe tener al menos 10 caracteres", "error");
        return;
    }

    if (!cupoInput || parseInt(cupoInput) <= 0) {
        Swal.fire("Error", "El cupo debe ser mayor a 0", "error");
        return;
    }

    if (modulos.length === 0) {
        Swal.fire("Error", "Debes agregar al menos un módulo", "error");
        return;
    }

    // Validar que cada módulo tenga título
    const modulosSinTitulo = modulos.filter(m => !m.titulo || m.titulo.trim() === '');
    if (modulosSinTitulo.length > 0) {
        Swal.fire("Error", `${modulosSinTitulo.length} módulo(s) no tienen título`, "error");
        return;
    }

    // Validar que cada módulo tenga al menos una pregunta
    const modulosSinPreguntas = modulos.filter(m => !m.preguntas || m.preguntas.length === 0);
    if (modulosSinPreguntas.length > 0) {
        Swal.fire("Error", `${modulosSinPreguntas.length} módulo(s) no tienen preguntas`, "error");
        return;
    }

    console.log('✅ Validación completada exitosamente');

    // 3. Limpiar módulos: remover campos vacíos y asegurar que tienen estructura correcta
    const modulosLimpios = modulos.map(mod => ({
        titulo: String(mod.titulo || '').trim(),
        contenido: String(mod.contenido || '').trim(),
        preguntas: (mod.preguntas || []).map(p => ({
            texto: String(p.texto || '').trim(),
            tipo: String(p.tipo || 'unica'),
            opciones: (p.opciones || []).map(o => String(o || '').trim()).filter(o => o),
            correctas: (p.correctas || []).map(c => parseInt(c) || 0)
        }))
    })).filter(m => m.titulo); // Solo módulos con título

    if (modulosLimpios.length === 0) {
        Swal.fire("Error", "Todos los módulos deben tener un título", "error");
        return;
    }

    // 3b. Limpiar evaluación final
    const evaluacionLimpia = {
        titulo: "Evaluación Final",
        contenido: String(editCurso?.evaluacionFinal?.contenido || '').trim(),
        preguntas: (editCurso?.evaluacionFinal?.preguntas || []).map(p => ({
            texto: String(p.texto || '').trim(),
            tipo: String(p.tipo || 'unica'),
            opciones: (p.opciones || []).map(o => String(o || '').trim()).filter(o => o),
            correctas: (p.correctas || []).map(c => parseInt(c) || 0)
        }))
    };

    // 4. Crear objeto curso SIN ID (Firestore lo crea)
    const cursoData = {
        nombre: nombre,
        descripcion: descripcion,
        cupo: parseInt(cupoInput),
        imagen: editCurso?.imagen || "https://via.placeholder.com/300x180?text=Curso+Rural",
        modulos: modulosLimpios || [],
        evaluacionFinal: evaluacionLimpia || { titulo: "Evaluación Final", contenido: "", preguntas: [] },
        categoria: 'General'
        // NO incluir 'id', 'inscritas', 'createdAt' - Firestore los maneja
    };

    console.log('📦 Objeto curso preparado:', {
        nombre: cursoData.nombre,
        descripcion: cursoData.descripcion.substring(0, 50),
        cupo: cursoData.cupo,
        modulosCount: cursoData.modulos.length,
        tieneImagen: !!cursoData.imagen
    });

    // 5. Procesar imagen si existe
    try {
        if (imgFile) {
            console.log('🖼️ Procesando imagen...');
            console.log('Subiendo a Cloudinary con folder: cursos_mujeres');
            cursoData.imagen = await cargarImagenAsync(imgFile);
            console.log('✅ Imagen subida a URL:', cursoData.imagen);
        }

        console.log('⏳ Iniciando guardado de curso...');
        await finalizarGuardado(cursoData);

    } catch (error) {
        console.error('❌ Error en guardarCurso:', error);
        console.error('Stack:', error.stack);
        Swal.fire("Error", "No se pudo guardar: " + error.message, "error");
    }
};

/**
 * Carga imagen a Cloudinary
 */
async function cargarImagenAsync(file) {
    try {
        console.log('📤 Subiendo imagen a Cloudinary...');
        const url = await uploadToCloudinary(file, "cursos_mujeres");
        console.log('✅ Imagen subida:', url);
        return url;
    } catch (error) {
        console.error('❌ Error subiendo imagen:', error);
        throw error;
    }
}

/**
 * ✅ GUARDAR O ACTUALIZAR CURSO
 */
async function finalizarGuardado(cursoData) {
    try {
        console.log('💾 === FINALIZANDO GUARDADO ===');
        console.log('Datos a guardar:', JSON.stringify(cursoData, null, 2));

        if (editCurso && editCurso.id) {
            // Validar que el ID sea un string válido
            if (typeof editCurso.id !== 'string') {
                console.error('❌ ID inválido (no es string):', editCurso.id, typeof editCurso.id);
                throw new Error('El ID del curso debe ser un string válido');
            }
            if (editCurso.id.trim() === '') {
                throw new Error('El ID del curso no puede estar vacío');
            }

            // ACTUALIZAR CURSO EXISTENTE
            console.log('🔄 ACTUALIZANDO curso con ID:', editCurso.id, 'Tipo:', typeof editCurso.id);
            console.log('Datos de actualización:', cursoData);

            // Actualizar solo los campos que cambiaron
            await actualizarCurso(editCurso.id, cursoData);

            console.log(' Curso actualizado exitosamente');
            await Swal.fire({
                title: " ¡Actualizado!",
                text: "El curso se actualizó correctamente",
                icon: "success",
                confirmButtonColor: "#2e7d32"
            });
        } else {
            // CREAR NUEVO CURSO
            console.log('✨ CREANDO nuevo curso');
            console.log('Datos de creación:', cursoData);

            const nuevoId = await guardarCurso(cursoData);
            console.log(' Curso creado con ID:', nuevoId);

            // 🔔 Notificar a mujeres por nuevo curso (Cambio 1)
            await crearNotificacionNuevoCursoMujeres({
                cursoId: nuevoId,
                cursoNombre: cursoData.nombre
            }); // Fin cambio 1


            await Swal.fire({
                title: " ¡Curso Creado!",

                icon: "success",
                confirmButtonColor: "#2e7d32"
            });
        }

        // Cerrar modal y actualizar lista
        modalCurso.style.display = "none";
        limpiarFormulario();
        await renderCursos();
        console.log(' Lista de cursos actualizada');

    } catch (error) {
        console.error("❌ Error guardando curso:", error);
        console.error("Stack trace:", error.stack);
        await Swal.fire({
            title: "❌ Error",
            text: "No se pudo guardar: " + error.message,
            icon: "error"
        });
    }
}

/* ===============================
    MOSAICO (ADMIN VE SUS CURSOS)
================================ */
/**
 * ✅ RENDERIZAR CURSOS CREADOS POR ADMIN
 */
async function renderCursos() {
    console.log('📊 Recargando lista de cursos...');
    mosaicoCursos.innerHTML = "";

    try {
        const cursos = await obtenerTodosCursos();
        const cursosVisibles = cursos.filter(c => !c.eliminado);

        if (cursosVisibles.length === 0) {
            mosaicoCursos.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">No hay cursos creados aún. ¡Crea uno nuevo!</p>';
            return;
        }

        cursosVisibles.forEach((curso) => {
            const card = document.createElement("div");
            card.className = "card-curso";
            card.innerHTML = `
                <img src="${curso.imagen || 'https://via.placeholder.com/300x150'}" alt="${curso.nombre}" style="width:100%; height:150px; object-fit:cover; border-radius:10px 10px 0 0;">
                <div class="card-info">
                    <h3>${curso.nombre}</h3>
                    <p><strong>Cupo:</strong> ${curso.inscritas}/${curso.cupo}</p>
                    <p><strong>Módulos:</strong> ${curso.modulos?.length || 0}</p>
                    <div class="botones" style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-editar" onclick="editarCurso(String('${curso.id}'))">✏️ Editar</button>
                        <button class="btn-eliminar" onclick="eliminarCursoConfirm(String('${curso.id}'))">🗑️ Eliminar</button>
                    </div>
                </div>
            `;
            mosaicoCursos.appendChild(card);
        });

        console.log(`✅ Se mostraron ${cursosVisibles.length} cursos`);
    } catch (error) {
        console.error("❌ Error cargando cursos:", error);
        Swal.fire("Error", "No se pudieron cargar los cursos: " + error.message, "error");
    }
}

/**
 * ✅ EDITAR CURSO EXISTENTE
 */
window.editarCurso = async (cursoId) => {
    try {
        cursoId = String(cursoId);
        console.log('✏️ === EDITANDO CURSO ===');
        console.log('ID buscado:', cursoId);

        const cursos = await obtenerTodosCursos();
        const cursoEncontrado = cursos.find(c => String(c.id) === String(cursoId));

        if (!cursoEncontrado) {
            console.error('❌ Curso no encontrado');
            Swal.fire("Error", "Curso no encontrado", "error");
            return;
        }

        console.log('✅ Curso encontrado:', cursoEncontrado.nombre);

        editCurso = {
            id: String(cursoEncontrado.id),  // CONVERTIR A STRING SIEMPRE
            imagen: cursoEncontrado.imagen,
            evaluacionFinal: cursoEncontrado.evaluacionFinal || { titulo: "Evaluación Final", contenido: "", preguntas: [] }
        };

        modulos = JSON.parse(JSON.stringify(cursoEncontrado.modulos || []));

        document.getElementById("nombreCurso").value = cursoEncontrado.nombre || "";
        document.getElementById("descripcionCurso").value = cursoEncontrado.descripcion || "";
        document.getElementById("cupoCurso").value = cursoEncontrado.cupo || "";

        console.log('📝 Formulario llenado. Módulos:', modulos.length);

        modalCurso.style.display = "block";
        renderModulos();

    } catch (error) {
        console.error("❌ Error editando curso:", error);
        Swal.fire("Error", "No se pudo editar: " + error.message, "error");
    }
};

/**
 * ✅ ELIMINAR CURSO CON CONFIRMACIÓN
 */
window.eliminarCursoConfirm = async (cursoId) => {
    try {
        cursoId = String(cursoId);
        console.log('🗑️ === ELIMINANDO CURSO ===');

        const cursos = await obtenerTodosCursos();
        const curso = cursos.find(c => String(c.id) === String(cursoId));

        if (!curso) {
            Swal.fire("Error", "Curso no encontrado", "error");
            return;
        }

        const resultado = await Swal.fire({
            title: "⚠️ ¿Eliminar este curso?",
            text: `"${curso.nombre}" ya no será visible para las mujeres`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc3545"
        });

        if (!resultado.isConfirmed) return;

        await eliminarCurso(cursoId);
        console.log('✅ Curso eliminado correctamente');
        await renderCursos();

        Swal.fire("✅ Eliminado", "El curso ha sido eliminado", "success");

    } catch (error) {
        console.error("❌ Error eliminando:", error);
        Swal.fire("Error", "No se pudo eliminar: " + error.message, "error");
    }
};

// Alias para compatibilidad con HTML
window.eliminarCurso = window.eliminarCursoConfirm;


function limpiarFormulario() {
    console.log('🧹 Limpiando formulario');
    formCurso.reset();
    modulos = [];
    editCurso = {
        id: null,
        imagen: "https://via.placeholder.com/300x180?text=Curso+Rural",
        evaluacionFinal: { titulo: "Evaluación Final", contenido: "", preguntas: [] }
    };
    document.getElementById("nombreCurso").value = "";
    document.getElementById("descripcionCurso").value = "";
    document.getElementById("cupoCurso").value = "";
    document.getElementById("imagenCurso").value = "";
}

// Cargar cursos al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Página de admin cargada');
    renderCursos();
});