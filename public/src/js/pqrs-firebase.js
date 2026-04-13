import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Guarda una PQRS en Firestore
 */
export async function guardarPQRS(pqrsData) {
  try {
    const docRef = await addDoc(collection(db, "pqrs"), {
      ...pqrsData,
      createdAt: serverTimestamp()
    });

    return docRef.id;
  } catch (error) {
    console.error("Error guardando PQRS:", error);
    throw error;
  }
}

/**
 * Busca una PQRS por radicado y clave
 * @param {string} radicado - Número de radicado
 * @param {string} clave - Clave de seguridad
 * @returns {Promise<Object|null>} PQRS encontrada o null
 */
export async function buscarPQRSPorRadicado(radicado, clave) {
  try {
    const q = query(
      collection(db, "pqrs"),
      where("radicado", "==", radicado),
      where("clave", "==", clave)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    // Retorna el primer documento encontrado (debería ser único)
    return querySnapshot.docs[0].data();
  } catch (error) {
    console.error("Error buscando PQRS:", error);
    throw error;
  }
}

/**
 * Obtiene todas las PQRS asociadas a un email
 * @param {string} correo - Email del usuario
 * @returns {Promise<Array>} Array de PQRS encontradas
 */
export async function obtenerPQRSPorEmail(correo) {
  try {
    const q = query(
      collection(db, "pqrs"),
      where("correo", "==", correo)
    );

    const querySnapshot = await getDocs(q);
    const pqrs = [];

    querySnapshot.forEach(doc => {
      pqrs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Ordena por fecha descendente
    return pqrs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  } catch (error) {
    console.error("Error obteniendo PQRS por email:", error);
    throw error;
  }
}
