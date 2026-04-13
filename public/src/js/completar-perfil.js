import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { uploadToCloudinary } from './cloudinary-api.js';

/* =========================
   CONFIGURACIÓN
========================= */

const municipios = [
  "Carmen de Carupa", "Cucunubá", "Fúquene", "Guachetá", "Lenguazaque",
  "Simijaca", "Susa", "Sutatausa", "Tausa", "Ubaté"
];

let currentRole = '';
let profileCompleted = false;
let isFirstGoogleLogin = false;
let existingPhotoURL = null;


/* =========================
   ELEMENTOS DOM
========================= */

const roleSelect = document.getElementById('roleSelect');
const firstName = document.getElementById('firstName');
const lastName = document.getElementById('lastName');
const emailFixed = document.getElementById('emailFixed');
const telefono = document.getElementById('telefono');
const paisRow = document.getElementById('paisRow');
const paisSelect = document.getElementById('paisSelect');
const municipioRow = document.getElementById('municipioRow');
const municipioSelect = document.getElementById('municipioSelect');
const generoSelect = document.getElementById('generoSelect');
const cultivosRow = document.getElementById('cultivosRow');
const tituloRow = document.getElementById('tituloRow');
const soporteRow = document.getElementById('soporteRow');
const tituloProfesional = document.getElementById('tituloProfesional');
const descripcion = document.getElementById('descripcion');
const fotoFile = document.getElementById('fotoFile');
const avatarPreview = document.getElementById('avatarPreview');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const msg = document.getElementById('msg');
const profileForm = document.getElementById('profileForm');



/* PROFESIONAL */
const docTypeRow = document.getElementById('docTypeRow');
const docFileRow = document.getElementById('docFileRow');
const docPreviewRow = document.getElementById('docPreviewRow');
const tipoDocumento = document.getElementById('tipoDocumento');
const docFile = document.getElementById('docFile');
const docPreview = document.getElementById('docPreview');
const institucion = document.getElementById('institucion');
const expCantidad = document.getElementById('expCantidad');
const expUnidad = document.getElementById('expUnidad');
const especialidades = document.getElementById('especialidades');
const presencialCheck = document.getElementById('presencialCheck');
const numeroDocumentoRow = document.getElementById('numeroDocumentoRow');
const soporteFile = document.getElementById('soporteFile');
const soportePreview = document.getElementById('soportePreview');
const soportePreviewRow = document.getElementById('soportePreviewRow');
const urlParams = new URLSearchParams(window.location.search);
const reenviar = urlParams.get("reenviar") === "true";

/* =========================
   UTILIDADES
========================= */

function showMsg(text, type = 'error') {
  msg.innerHTML = `<div class="alert ${type}">${text}</div>`;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

function validarPesoArchivo(file, inputElement, nombre = "archivo") {
  if (!file) return true;

  if (file.size > MAX_FILE_SIZE) {
    alert(`El ${nombre} no puede superar los 3MB.`);
    inputElement.value = "";
    return false;
  }

  return true;
}


function fillMunicipios() {
  municipioSelect.innerHTML = '<option value="" disabled selected>Seleccionar</option>';
  municipios.forEach(m => {
    const o = document.createElement('option');
    o.value = m;
    o.textContent = m;
    municipioSelect.appendChild(o);
  });
}

function fillRoles() {
  roleSelect.innerHTML = '';
  [
    { v: 'agricultor', t: 'Agricultor' },
    { v: 'profesional', t: 'Profesional Agrónomo' },
    //{ v: 'mujer_rural', t: 'Mujer Rural' }
  ].forEach(r => {
    const o = document.createElement('option');
    o.value = r.v;
    o.textContent = r.t;
    roleSelect.appendChild(o);
  });
}

function setupByRole(role) {
  municipioRow.style.display = role !== 'profesional' ? 'block' : 'none';
  cultivosRow.style.display = role === 'agricultor' ? 'block' : 'none';
  paisRow.style.display = role === 'mujer_rural' ? 'block' : 'none';

  const prof = role === 'profesional' ? 'block' : 'none';
  tituloRow.style.display = prof;
  soporteRow.style.display = prof;
  docTypeRow.style.display = prof;
  numeroDocumentoRow.style.display = prof;
  docFileRow.style.display = prof;
  docPreviewRow.style.display = prof;
  institucion.parentElement.style.display = prof;
  document.getElementById('experienciaRow').style.display = prof;
  document.getElementById('especialidadesRow').style.display = prof;
  document.getElementById('modalidadRow').style.display = prof;

  toggleRequiredByRole(role);
}

function toggleRequiredByRole(role) {
  const profesionalFields = [tipoDocumento, institucion, expCantidad];

  profesionalFields.forEach(el => {
    if (!el) return;

    if (role === 'profesional') {
      el.required = true;
      el.disabled = false;
    } else {
      el.required = false;
      el.disabled = true;
    }
  });

  if (docFile) {
    docFile.disabled = role !== 'profesional';
  }
}


/* =========================
   PREVIEW DOCUMENTO
========================= */

docFile.addEventListener('change', () => {
  docPreview.innerHTML = '';
  const file = docFile.files[0];
  if (!file) return;

  if (!validarPesoArchivo(file, docFile, "documento de identidad")) {
    docPreview.innerHTML = '';
    return;
  }

  if (file.type.includes('image')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = '120px';
    docPreview.appendChild(img);
  } else {
    docPreview.textContent = file.name;
  }
});


soporteFile.addEventListener('change', () => {
  soportePreview.innerHTML = '';
  const file = soporteFile.files[0];
  if (!file) return;

  if (!validarPesoArchivo(file, soporteFile, "soporte del título")) {
    soportePreviewRow.style.display = 'none';
    return;
  }

  soportePreviewRow.style.display = 'block';

  if (file.type.includes('image')) {
    soportePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" style="max-width:120px">`;
  } else {
    soportePreview.innerHTML = `<span>${file.name}</span>`;
  }
});



/* =========================
   INIT
========================= */

fillMunicipios();
fillRoles();

/* >>> FIX: mujer rural – mostrar/ocultar municipio según país */
paisSelect.addEventListener('change', () => {
  if (paisSelect.value === 'Colombia') {
    municipioRow.style.display = 'block';
  } else {
    municipioRow.style.display = 'none';
    municipioSelect.value = '';
  }
});

/* =========================
   AUTH & CARGA
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login-registro.html';
    return;
  }

  emailFixed.value = user.email || '';

  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    isFirstGoogleLogin = true;
    roleSelect.disabled = false;

    // Seleccionar agricultor por defecto
    roleSelect.value = 'agricultor';
    currentRole = 'agricultor';

    // Inicializar UI correctamente
    setupByRole(currentRole);

    roleSelect.addEventListener('change', () => {
      currentRole = roleSelect.value;
      setupByRole(currentRole);
    });

    // >>> PRECARGA GOOGLE
    if (user.displayName) {
      const parts = user.displayName.split(' ');
      firstName.value = parts[0] || '';
      lastName.value = parts.slice(1).join(' ') || '';
    }

    if (user.photoURL) {
      avatarPreview.innerHTML = `<img src="${user.photoURL}" alt="avatar">`;
    }


    return;
  }

  const d = snap.data();
  currentRole = d.role;
  profileCompleted = !!d.profileCompleted;

  localStorage.setItem(
    'cm_user_name',
    `${d.firstName} ${d.lastName}`
  );

  localStorage.setItem(
    'cm_user_uid',
    user.uid
  );
  localStorage.setItem(
    'cm_user_role',
    d.role
  );



  roleSelect.value = currentRole;
  roleSelect.disabled = true; //Cambio A
  setupByRole(currentRole);

  firstName.value = d.firstName || '';
  lastName.value = d.lastName || '';
  telefono.value = d.telefono || '';
  generoSelect.value = d.genero || '';
  descripcion.value = d.descripcion || '';

  /* >>> FIX: agricultor – restaurar cultivos */
  if (currentRole === 'agricultor' && Array.isArray(d.cultivos)) {
    document.querySelectorAll('.cultivo').forEach(cb => {
      cb.checked = d.cultivos.includes(cb.value);
    });
    municipioSelect.value = d.municipio || '';
  }

  /* >>> FIX: mujer rural – restaurar país y municipio */
  if (currentRole === 'mujer_rural') {
    paisSelect.value = d.pais || '';
    if (d.pais === 'Colombia') {
      municipioRow.style.display = 'block';
      municipioSelect.value = d.municipio || '';
    } else {
      municipioRow.style.display = 'none';
    }
  }

  if (d.photoURL) {
    avatarPreview.innerHTML = `<img src="${d.photoURL}" alt="avatar">`;
    existingPhotoURL = d.photoURL;
  }

  if (currentRole === 'profesional') {
    tipoDocumento.value = d.tipoDocumento || '';
    numeroDocumento.value = d.numeroDocumento || '';
    institucion.value = d.institucion || '';
    tituloProfesional.value = d.tituloName || '';
    expCantidad.value = d.experiencia?.cantidad || '';
    expUnidad.value = d.experiencia?.unidad || 'años';
    especialidades.value = d.especialidades || '';
    presencialCheck.checked = !!d.modalidadPresencial;

    // Preview documento identidad
    if (d.documentoURL) {
      docPreview.innerHTML = d.documentoURL.includes('.pdf')
        ? `<a href="${d.documentoURL}" target="_blank">Ver documento PDF</a>`
        : `<img src="${d.documentoURL}" style="max-width:120px">`;
    }

    // Preview soporte título
    const soportePreview = document.getElementById('soportePreview');
    if (d.soporteTituloURL) {
      soportePreviewRow.style.display = 'block';
      soportePreview.innerHTML = d.soporteTituloURL.includes('.pdf')
        ? `<a href="${d.soporteTituloURL}" target="_blank">Ver soporte PDF</a>`
        : `<img src="${d.soporteTituloURL}" style="max-width:120px">`;
    }

    // BLOQUEAR NÚMERO DE DOCUMENTO SI YA EXISTE
    if (d.numeroDocumento) {
      const numDocInput = document.getElementById('numeroDocumento');
      numDocInput.value = d.numeroDocumento;
      numDocInput.disabled = true;

      // Mensaje informativo
      const help = document.createElement('small');
      help.style.color = '#666';
      help.textContent = 'Este número de documento no puede modificarse.';
      numeroDocumentoRow.appendChild(help);
    }


  }

});

/* =========================
   GUARDAR
========================= */

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.innerHTML = '';

  /* =========================
   VALIDACIONES ESTRICTAS
========================= */

  // SOLO letras (con espacios)
  const regexTexto = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;

  // SOLO números (teléfono)
  const regexNumero = /^[0-9]+$/;


  // Validar nombres
  if (!regexTexto.test(firstName.value.trim())) {
    showMsg('El nombre solo debe contener letras');
    return;
  }

  if (!regexTexto.test(lastName.value.trim())) {
    showMsg('El apellido solo debe contener letras');
    return;
  }

  // Validar teléfono
  if (!regexNumero.test(telefono.value.trim())) {
    showMsg('El teléfono solo debe contener números');
    return;
  }

  const user = auth.currentUser;
  if (!user) return; //if (!user || !currentRole) return; // Revisar si elimino esto: || !currentRole

  // BLOQUEO: rol obligatorio solo en primer guardado (Verificar cambio)
  if (!profileCompleted && !currentRole) {
    showMsg('Debes seleccionar un tipo de usuario.');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar';
    return;
  }
  //



  if (currentRole === 'agricultor') {

    if (
      !firstName.value.trim() ||
      !lastName.value.trim() ||
      !telefono.value.trim() ||
      !generoSelect.value ||
      !municipioSelect.value
    ) {
      showMsg('Todos los campos son obligatorios (excepto descripción y foto)');
      return;
    }

    const cultivos = [...document.querySelectorAll('.cultivo:checked')];
    if (cultivos.length === 0) {
      showMsg('Selecciona al menos un cultivo');
      return;
    }
  }



  if (currentRole === 'profesional') {

    if (
      !firstName.value.trim() ||
      !lastName.value.trim() ||
      !telefono.value.trim() ||
      !generoSelect.value ||
      !tipoDocumento.value ||
      !numeroDocumento.value.trim() ||
      !institucion.value.trim() ||
      !tituloProfesional.value.trim() ||
      !expCantidad.value
    ) {
      showMsg('Todos los campos son obligatorios (excepto descripción, especialidades y foto)');
      return;
    }

    // DOCUMENTO OBLIGATORIO
    if (!profileCompleted && !docFile.files[0]) {
      showMsg('Debes subir el documento de identidad');
      return;
    }

    // SOPORTE OBLIGATORIO
    if (!profileCompleted && !soporteFile.files[0]) {
      showMsg('Debes subir el soporte del título');
      return;
    }
  }


  if (currentRole === 'agricultor') {
    const cultivos = [...document.querySelectorAll('.cultivo:checked')];
    if (cultivos.length === 0) {
      showMsg('Selecciona al menos un cultivo');
      return;
    }
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  try {
    const data = {
      uid: user.uid,
      email: user.email,
      role: currentRole,
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      telefono: telefono.value.trim(),
      genero: generoSelect.value,
      descripcion: descripcion.value.trim() || null,
      profileCompleted: true,
      updatedAt: serverTimestamp()
    };

    // =========================
    // DETECTAR CAMPOS MODIFICADOS (SOLO PROFESIONAL YA APROBADO / SUSPENDIDO)
    // =========================
    let camposModificados = [];

    if (currentRole === "profesional" && profileCompleted) {
      const refOld = doc(db, "users", user.uid);
      const snapOld = await getDoc(refOld);
      const old = snapOld.data() || {};

      const comparar = (campo, nuevo) => {
        if (old[campo] !== nuevo) {
          camposModificados.push(campo);
        }
      };

      comparar("telefono", telefono.value.trim());
      comparar("descripcion", descripcion.value.trim());
      comparar("institucion", institucion.value.trim());
      comparar("especialidades", especialidades.value.trim());
      comparar("tituloName", tituloProfesional.value.trim());

      if (docFile?.files[0]) camposModificados.push("documentoURL");
      if (soporteFile?.files[0]) camposModificados.push("soporteTituloURL");

      if (camposModificados.length > 0) {
        data.camposModificados = camposModificados;
        data.requiereRevision = true;
      }
    }


    // // Garantía de estado para profesionales (nunca queda indefinido)
    // if (currentRole === "profesional" && !("estadoAprobacion" in data)) {
    //   data.estadoAprobacion = "pendiente";
    // }


    // Marcar cambios para revisión si el profesional ya existe
    if (currentRole === "profesional" && profileCompleted) {
      data.requiereRevision = true;
    }


    /* >>> FIX: agricultor */
    if (currentRole === 'agricultor') {
      data.municipio = municipioSelect.value;
      data.cultivos = [...document.querySelectorAll('.cultivo:checked')].map(c => c.value);
    }

    /* >>> FIX: mujer rural */
    if (currentRole === 'mujer_rural') {
      data.pais = paisSelect.value || null;
      data.municipio = paisSelect.value === 'Colombia'
        ? municipioSelect.value || null
        : null;
    }

    /* >>> FIX: profesional – guardar TODOS los campos */
    if (currentRole === 'profesional') {
      data.tipoDocumento = tipoDocumento.value;
      // Número de documento SOLO la primera vez
      if (!profileCompleted) {
        data.numeroDocumento = numeroDocumento.value.trim();
      }

      data.institucion = institucion.value.trim();
      data.tituloName = tituloProfesional.value.trim();
      data.experiencia = {
        cantidad: Number(expCantidad.value),
        unidad: expUnidad.value
      };
      data.especialidades = especialidades.value.trim() || null;
      data.modalidadVirtual = true;
      data.modalidadPresencial = presencialCheck.checked;

      // Documento de identidad
      if (docFile && docFile.files[0]) {
        data.documentoURL = await uploadToCloudinary(
          docFile.files[0],
          `CultiVida/docs/${user.uid}`
        );
      }

      // Soporte del título
      const soporteFile = document.getElementById('soporteFile');
      if (soporteFile && soporteFile.files[0]) {
        data.soporteTituloURL = await uploadToCloudinary(
          soporteFile.files[0],
          `CultiVida/titulos/${user.uid}`
        );
      }
    }

    if (currentRole === "profesional" && !profileCompleted) {
      data.estadoAprobacion = "pendiente";
      data.suspendido = false;
      data.motivoRechazo = "";
      data.motivoSuspension = "";
      data.ocultoAdmin = false;
      data.requiereRevision = false;
    }

    // REENVÍO TRAS RECHAZO
    if (currentRole === "profesional" && reenviar) {
      data.estadoAprobacion = "pendiente";
      data.motivoRechazo = "";
      data.requiereRevision = true;
    }


    if (fotoFile.files[0]) {
      if (!validarPesoArchivo(fotoFile.files[0], fotoFile, "foto de perfil")) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar';
        return;
      }

      data.photoURL = await uploadToCloudinary(
        fotoFile.files[0],
        `CultiVida/profiles/${user.uid}`
      );
    }


    const ref = doc(db, 'users', user.uid);

    // Inicio del cambio (Lo comentado es versión anterior)

    // isFirstGoogleLogin
    // //   ? await setDoc(ref, { ...data, createdAt: serverTimestamp() })
    //   : await updateDoc(ref, data);


    // =====================
    // FOTO DE PERFIL (LÓGICA FINAL)
    // =====================
    if (fotoFile.files[0]) {
      // Usuario sube nueva foto
      if (!validarPesoArchivo(fotoFile.files[0], fotoFile, "foto de perfil")) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Guardar";
        return;
      }

      data.photoURL = await uploadToCloudinary(
        fotoFile.files[0],
        `CultiVida/profiles/${user.uid}`
      );

    } else if (existingPhotoURL) {
      // Mantener la foto que ya tenía
      data.photoURL = existingPhotoURL;

    } else if (user.photoURL) {
      // Fallback Google (primer guardado real)
      data.photoURL = user.photoURL;
    }


    isFirstGoogleLogin
      ? await setDoc(ref, { ...data, createdAt: serverTimestamp() })
      : await updateDoc(ref, data);

    window.location.href =
      currentRole === 'profesional' ? 'panel-profesional.html'
        : currentRole === 'agricultor' ? 'panel-agricultor.html'
          : 'panel-mujeres.html';

    // Fin del cambio


  } catch (err) {
    console.error(err);
    showMsg('Error guardando el perfil');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar';
  }


});

/* =========================
   CANCELAR
========================= */

// cancelBtn.addEventListener('click', () => {
//   window.location.href =
//     currentRole === 'profesional' ? 'panel-profesional.html'
//       : currentRole === 'agricultor' ? 'panel-agricultor.html'
//         : 'panel-mujeres.html';
// });

cancelBtn.addEventListener('click', () => {

  // PRIMER REGISTRO → volver al inicio
  if (!profileCompleted) {
    window.location.href = 'index.html';
    return;
  }

  // PERFIL YA EXISTENTE → volver a su panel
  if (currentRole === 'profesional') {
    window.location.href = 'panel-profesional.html';
  } else if (currentRole === 'agricultor') {
    window.location.href = 'panel-agricultor.html';
  } else {
    window.location.href = 'index.html';
  }

});

