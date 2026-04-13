import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function openOrCreateChat(uidA, uidB) {

  const q = query(
    collection(db, "chats"),
    where("participantes", "array-contains", uidA)
  );

  const snap = await getDocs(q);

  for (const docSnap of snap.docs) {
    const chat = docSnap.data();

    if (chat.participantes.includes(uidB)) {

      const chatRef = doc(db, "chats", docSnap.id);

      const updates = {
        actualizadoEn: serverTimestamp()
      };


      if (chat.eliminadoPara?.[uidA] === true) {
        updates[`eliminadoPara.${uidA}`] = false;
        updates[`borradoHasta.${uidA}`] = serverTimestamp();
      }

      if (chat.estadoAsesoria === "finalizada") {
        updates.estadoAsesoria = "activa";
        updates.inicioAsesoriaActual = serverTimestamp();
      }

      await updateDoc(chatRef, updates);

      return docSnap.id;
    }
  }

  // Si no existe ningún chat previo → crear uno nuevo
  const newChatRef = await addDoc(collection(db, "chats"), {
    participantes: [uidA, uidB],
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
    ultimoMensaje: "",
    estadoAsesoria: "activa",
    inicioAsesoriaActual: serverTimestamp(),
    eliminadoPara: {}
  });

  return newChatRef.id;
}
