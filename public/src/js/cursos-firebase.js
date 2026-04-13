import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  increment
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * @param {Object} cursoData 
 * @returns {Promise<string>} 
 */
export async function guardarCurso(cursoData) {
  try {
    const { id, ...datosLimpios } = cursoData;

    const modulosValidos = Array.isArray(datosLimpios.modulos) ? datosLimpios.modulos : [];
    const evaluacionValida = typeof datosLimpios.evaluacionFinal === 'object' && datosLimpios.evaluacionFinal !== null
      ? datosLimpios.evaluacionFinal
      : { titulo: "Evaluación Final", contenido: "", preguntas: [] };

    let datosSanitizados = {
      nombre: String(datosLimpios.nombre || ''),
      descripcion: String(datosLimpios.descripcion || ''),
      cupo: parseInt(datosLimpios.cupo) || 0,
      imagen: String(datosLimpios.imagen || ''),
      inscritas: 0,
      categoria: datosLimpios.categoria || 'General',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      eliminado: false
    };

    try {
      datosSanitizados.modulos = JSON.parse(JSON.stringify(modulosValidos));
      datosSanitizados.evaluacionFinal = JSON.parse(JSON.stringify(evaluacionValida));
    } catch (e) {
      console.warn("⚠️ Error serializando modulos/evaluacion, usando valores por defecto");
      datosSanitizados.modulos = modulosValidos;
      datosSanitizados.evaluacionFinal = evaluacionValida;
    }

    const docRef = await addDoc(collection(db, "cursos_mujeres"), datosSanitizados);

    console.log(`✅ Curso guardado con ID Firestore: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error guardando curso:", error.message);
    throw error;
  }
}

/**
 * @returns {Promise<Array>}
 */
export async function obtenerTodosCursos() {
  try {
    const querySnapshot = await getDocs(collection(db, "cursos_mujeres"));
    const cursos = [];

    querySnapshot.forEach(doc => {
      cursos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Se cargaron ${cursos.length} cursos desde Firebase`);
    return cursos;
  } catch (error) {
    console.error("❌ Error obteniendo cursos:", error.message);
    throw error;
  }
}

/**
 * @returns {Promise<Array>}
 */
export async function obtenerCursosActivos() {
  try {
    const todoCursos = await obtenerTodosCursos();
    const activos = todoCursos.filter(c => !c.eliminado);
    console.log(`✅ Se cargaron ${activos.length} cursos ACTIVOS`);
    return activos;
  } catch (error) {
    console.error("❌ Error obteniendo cursos activos:", error.message);
    throw error;
  }
}

/**
 * @param {string} cursoId
 * @returns {Promise<Object>}
 */
export async function obtenerCurso(cursoId) {
  try {
    cursoId = String(cursoId);
    const docSnap = await getDoc(doc(db, "cursos_mujeres", cursoId));

    if (!docSnap.exists()) {
      console.warn(`⚠️ Curso ${cursoId} no existe`);
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } catch (error) {
    console.error("❌ Error obteniendo curso:", error.message);
    throw error;
  }
}

/**
 * @param {string} cursoId - ID del curso
 * @param {Object} datosActualizados -
 * @returns {Promise<void>}
 */
export async function actualizarCurso(cursoId, datosActualizados) {
  try {
    cursoId = String(cursoId);
    const docSnap = await getDoc(doc(db, "cursos_mujeres", cursoId));
    if (!docSnap.exists()) {
      throw new Error(`Documento ${cursoId} no existe en Firestore`);
    }

    const { id, createdAt, ...datosPuros } = datosActualizados;

    const datosSanitizados = {
      nombre: datosPuros.nombre ? String(datosPuros.nombre) : undefined,
      descripcion: datosPuros.descripcion ? String(datosPuros.descripcion) : undefined,
      cupo: datosPuros.cupo ? parseInt(datosPuros.cupo) : undefined,
      imagen: datosPuros.imagen ? String(datosPuros.imagen) : undefined,
      categoria: datosPuros.categoria ? String(datosPuros.categoria) : undefined,
      updatedAt: serverTimestamp()
    };

    if (datosPuros.modulos) {
      try {
        datosSanitizados.modulos = JSON.parse(JSON.stringify(datosPuros.modulos));
      } catch (e) {
        console.warn("⚠️ Error serializando modulos en actualizarCurso");
        datosSanitizados.modulos = datosPuros.modulos;
      }
    }

    if (datosPuros.evaluacionFinal) {
      try {
        datosSanitizados.evaluacionFinal = JSON.parse(JSON.stringify(datosPuros.evaluacionFinal));
      } catch (e) {
        console.warn("⚠️ Error serializando evaluacionFinal en actualizarCurso");
        datosSanitizados.evaluacionFinal = datosPuros.evaluacionFinal;
      }
    }

    Object.keys(datosSanitizados).forEach(key =>
      datosSanitizados[key] === undefined && delete datosSanitizados[key]
    );

    const cursoRef = doc(db, "cursos_mujeres", cursoId);
    await updateDoc(cursoRef, datosSanitizados);

    console.log(`✅ Curso ${cursoId} actualizado`);
  } catch (error) {
    console.error("❌ Error actualizando curso:", error.message);
    throw error;
  }
}

/**
 * @param {string} cursoId
 * @returns {Promise<void>}
 */
export async function eliminarCursoDefinitivo(cursoId) {
  try {
    cursoId = String(cursoId);
    const docSnap = await getDoc(doc(db, "cursos_mujeres", cursoId));
    if (!docSnap.exists()) {
      throw new Error(`Documento ${cursoId} no existe`);
    }

    await deleteDoc(doc(db, "cursos_mujeres", cursoId));
    console.log(`✅ Curso ${cursoId} ELIMINADO DEFINITIVAMENTE`);
  } catch (error) {
    console.error("❌ Error eliminando curso:", error.message);
    throw error;
  }
}

/**
 * @param {string} cursoId
 * @returns {Promise<void>}
 */
export async function eliminarCurso(cursoId) {
  try {
    cursoId = String(cursoId);
    const docSnap = await getDoc(doc(db, "cursos_mujeres", cursoId));
    if (!docSnap.exists()) {
      throw new Error(`Documento ${cursoId} no existe en Firestore`);
    }

    const cursoRef = doc(db, "cursos_mujeres", cursoId);
    await updateDoc(cursoRef, {
      eliminado: true,
      eliminadoEn: serverTimestamp()
    });

    console.log(`✅ Curso ${cursoId} marcado como eliminado (soft delete)`);
  } catch (error) {
    console.error("❌ Error al hacer soft delete:", error.message);
    throw error;
  }
}

/**
 * @param {string} cursoId
 * @param {string} usuarioId
 * @returns {Promise<boolean>} 
 */
export async function registrarEnCurso(cursoId, usuarioId) {
  try {
    cursoId = String(cursoId);
    const docSnap = await getDoc(doc(db, "cursos_mujeres", cursoId));
    if (!docSnap.exists()) {
      throw new Error("Curso no encontrado");
    }

    const cursoActual = docSnap.data();
    const inscritas = cursoActual.inscritas || 0;
    const cupo = Number.isInteger(cursoActual.cupo) ? cursoActual.cupo : Infinity;


    if (inscritas >= cupo) {
      console.warn(`⚠️ No hay cupo disponible. Inscritas: ${inscritas}, Cupo: ${cupo}`);
      return false;
    }

    const cursoRef = doc(db, "cursos_mujeres", cursoId);
    await updateDoc(cursoRef, {
      inscritas: increment(1),
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Usuario ${usuarioId} inscrito. Inscritas: ${inscritas + 1}/${cupo}`);
    return true;
  } catch (error) {
    console.error("❌ Error registrando usuario:", error.message);
    throw error;
  }
}

/**
 * @param {string} cursoId
 * @param {string} usuarioId
 * @returns {Promise<void>}
 */
export async function desinscrbirseDelCurso(cursoId, usuarioId) {
  try {
    cursoId = String(cursoId);
    const docSnap = await getDoc(doc(db, "cursos_mujeres", cursoId));
    if (!docSnap.exists()) {
      throw new Error("Curso no encontrado");
    }

    const inscritas = docSnap.data().inscritas || 0;
    if (inscritas > 0) {
      const cursoRef = doc(db, "cursos_mujeres", cursoId);
      await updateDoc(cursoRef, {
        inscritas: increment(-1),
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Usuario ${usuarioId} desinscrito. Inscritas: ${inscritas - 1}`);
    }
  } catch (error) {
    console.error("❌ Error desinscribiendo usuario:", error.message);
    throw error;
  }
}

/**
 * @param {string} usuarioId
 * @param {string} cursoId
 * @param {Object} progreso
 * @returns {Promise<void>}
 */
export async function guardarProgresoUsuario(usuarioId, cursoId, progreso) {
  try {
    if (!usuarioId || !cursoId) {
      console.warn('⚠️ IDs inválidos para guardar progreso');
      return;
    }

    usuarioId = String(usuarioId);
    cursoId = String(cursoId);

    const progresoData = {
      cursoId,
      completedModules: progreso?.completedModules || [],
      finalExam: progreso?.finalExam || false,
      enrolled: progreso?.enrolled || true,
      enrolledDate: progreso?.enrolledDate || serverTimestamp(),
      lastUpdated: serverTimestamp()
    };

    const progresoRef = doc(db, "usuarios", usuarioId, "progresCursos", cursoId);

    await setDoc(progresoRef, progresoData, { merge: true });

    console.log(`✅ Progreso guardado para usuario ${usuarioId} en curso ${cursoId}`);
  } catch (error) {
    console.warn("⚠️ No se pudo guardar progreso (continuando con localStorage):", error.message);
  }
}

/**
 * @param {string} usuarioId
 * @param {string} cursoId
 * @returns {Promise<Object|null>}
 */
export async function obtenerProgresoUsuario(usuarioId, cursoId) {
  try {
    const docSnap = await getDoc(doc(db, "usuarios", usuarioId, "progresCursos", cursoId));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.warn("⚠️ No se pudo obtener progreso desde Firestore:", error.message);
    return null;
  }
}

/**
 * Obtener TODO el progreso del usuario
 */
export async function obtenerTodoProgresoUsuario(usuarioId) {
  try {
    const snapshot = await getDocs(
      collection(db, "usuarios", usuarioId, "progresCursos")
    );

    const progreso = {};

    snapshot.forEach(docSnap => {
      progreso[docSnap.id] = docSnap.data();
    });

    console.log(`✅ Progreso cargado desde Firestore: ${snapshot.size} cursos`);
    return progreso;

  } catch (error) {
    console.warn("⚠️ Error obteniendo progreso completo:", error.message);
    return {};
  }
}

/** 
 * @returns {Promise<number>} Cantidad de cursos reparados
 */
export async function migrarCursosEliminados() {
  try {
    console.log('🔧 Iniciando migración de cursos...');
    const querySnapshot = await getDocs(collection(db, "cursos_mujeres"));

    let reparados = 0;

    for (const docSnapshot of querySnapshot.docs) {
      const datos = docSnapshot.data();

      if (datos.eliminado === undefined || datos.eliminado === true) {
        console.log(`  🔄 Reparando: ${datos.nombre} (ID: ${docSnapshot.id})`);

        await updateDoc(doc(db, "cursos_mujeres", docSnapshot.id), {
          eliminado: false,
          updatedAt: serverTimestamp()
        });

        reparados++;
      }
    }

    console.log(`✅ Migración completa: ${reparados} cursos reparados`);
    return reparados;
  } catch (error) {
    console.error("❌ Error en migración:", error.message);
    throw error;
  }
}
