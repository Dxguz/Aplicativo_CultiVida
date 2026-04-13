/**
 * CultiVida - Asesor Agrónomo Virtual
 */

const API_KEY = "AIzaSyCwBAV7tJDywI-ObpiLbVWhHr1MC3XBtjE";
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// Variables de estado global
let selectedFiles = [];
let totalImagesSent = 0; // Mejora 3: Contador total
let userContext = { municipio: "", cultivo: "" };

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("agriForm");
  const paisSelect = document.getElementById("pais");
  const formContainer = document.getElementById("formulario-container");
  const chatContainer = document.getElementById("chat-container");
  const chatBox = document.getElementById("chatBox");
  const userMessageInput = document.getElementById("userMessage");
  const sendMessageBtn = document.getElementById("sendMessage");
  const imageInput = document.getElementById("imageInput");
  const imagePreviewContainer = document.getElementById("imagePreviewContainer");

  // 1. MUNICIPIOS
  paisSelect.addEventListener("change", () => {
    const existente = document.getElementById("municipio-group");
    if (existente) existente.remove();
    if (paisSelect.value === "colombia") {
      const municipios = ["Ubaté", "Cucunubá", "Susa", "Lenguazaque", "Fúquene", "Guachetá", "Simijaca", "Tausa", "Carmen de Carupa", "Sutatausa"];
      const div = document.createElement("div");
      div.className = "form-group";
      div.id = "municipio-group";
      div.innerHTML = `<label>Municipio:</label><select id="municipio" required>
                <option value="" disabled selected>Selecciona un municipio</option>
                ${municipios.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>`;
      paisSelect.parentElement.insertAdjacentElement("afterend", div);
    }
  });

  // GESTIÓN DE IMÁGENES (Límite estricto de 3 total)
  imageInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);

    // Verificar el límite global (imágenes enviadas + seleccionadas ahora)
    if (totalImagesSent + selectedFiles.length + files.length > 3) {
      const restantes = 3 - totalImagesSent;
      alert(`Límite total alcanzado. Solo puedes enviar 3 fotos por sesión. Te quedan ${restantes} disponibles.`);
      imageInput.value = "";
      return;
    }

    selectedFiles = [...selectedFiles, ...files];
    renderPreviews();
  });

  function renderPreviews() {
    imagePreviewContainer.innerHTML = "";
    selectedFiles.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement("div");
        div.style = "position:relative; display:inline-block; margin-right:10px; margin-bottom:10px;";
        div.innerHTML = `
                    <img src="${e.target.result}" style="width:60px; height:60px; border-radius:8px; object-fit:cover; border:2px solid #28a745;">
                    <button style="position:absolute; top:-8px; right:-8px; background:#dc3545; color:white; border-radius:50%; border:none; width:22px; height:22px; cursor:pointer;">&times;</button>
                `;
        div.querySelector("button").onclick = () => { selectedFiles.splice(i, 1); renderPreviews(); };
        imagePreviewContainer.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  // 3. ANIMACIÓN Y COMUNICACIÓN
  function showTypingIndicator() {
    const div = document.createElement("div");
    div.className = "chat-message bot-message typing-indicator";
    div.id = "typing-bubble";
    div.innerHTML = `<span></span><span></span><span></span>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function removeTypingIndicator() {
    const bubble = document.getElementById("typing-bubble");
    if (bubble) bubble.remove();
  }

  async function callGemini(parts) {
    showTypingIndicator();
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: parts }] })
      });

      if (response.status === 429) {
        removeTypingIndicator();
        return "💡 **CultiVida ha alcanzado su límite de consultas gratuitas por hoy.** Estamos trabajando para ampliar nuestra capacidad. Por favor, intenta de nuevo mañana o contacta con soporte.";
      }

      const data = await response.json();
      removeTypingIndicator();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      removeTypingIndicator();
      return "⚠️ Error de conexión. Revisa tu internet.";
    }
  }

  // INICIO (FORMULARIO)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    userContext.municipio = document.getElementById("municipio").value;
    userContext.cultivo = document.getElementById("cultivo").value;
    const descripcion = document.getElementById("descripcion").value;

    formContainer.style.display = "none";
    chatContainer.style.display = "flex";

    // Prompt Maestro - PARA EVITAR DESVÍOS
    const promptMaestro = `
            Instrucción Estricta: Eres CultiVida. TU ÚNICO TEMA ES LA AGRICULTURA.
            - Solo respondes sobre ${userContext.cultivo} en ${userContext.municipio}.
            - Si el usuario pregunta de cocina, recetas, política, chistes o cualquier tema NO agrícola, debes responder textualmente: "Lo siento, como asesor de CultiVida mi conocimiento se limita estrictamente al cultivo de ${userContext.cultivo} en la región."
            - PROHIBIDO: No intentes adaptar temas ajenos al agro (como hiciste con la lasaña). Si no es agricultura pura, niégate.
            - Formato: Máximo 3 párrafos cortos, usa viñetas.
            Contexto actual: Agricultor en ${userContext.municipio} con problema en ${userContext.cultivo}: ${descripcion}.
        `;

    const respuesta = await callGemini([{ text: promptMaestro }]);
    addBotMessage(respuesta);
  });

  // MENSAJERÍA CONTINUA
  async function handleSendMessage() {
    const text = userMessageInput.value.trim();
    if (!text && selectedFiles.length === 0) return;

    // Actualizar contador de imágenes
    totalImagesSent += selectedFiles.length;
    if (totalImagesSent >= 3) {
      imageInput.disabled = true; // Desactivar botón de fotos
    }

    // Actualizar contador de imágenes
    totalImagesSent += selectedFiles.length;
    if (totalImagesSent >= 3) {
      imageInput.disabled = true;
      // Cambio visual:
      const cameraIcon = document.querySelector('label[for="imageInput"]');
      cameraIcon.style.color = "#ccc";
      cameraIcon.style.cursor = "not-allowed";
    }

    addUserMessage(text, selectedFiles);
    const currentFiles = [...selectedFiles];
    userMessageInput.value = "";
    selectedFiles = [];
    imagePreviewContainer.innerHTML = "";

    const promptSeguridad = `
            Recordatorio: Sigues siendo CultiVida. 
            Usuario pregunta: "${text || "Analiza estas fotos"}".
            Si la pregunta no es sobre el cultivo de ${userContext.cultivo}, niégate amablemente sin dar consejos de otro tipo.
            Si es sobre el cultivo, responde técnico y resumido.
        `;

    const parts = [{ text: promptSeguridad }];
    for (const file of currentFiles) {
      const b64 = await fileToBase64(file);
      parts.push({ inline_data: { mime_type: file.type, data: b64 } });
    }

    const respuesta = await callGemini(parts);
    addBotMessage(respuesta);
  }

  // EVENTOS Y AUXILIARES
  sendMessageBtn.addEventListener("click", handleSendMessage);
  userMessageInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSendMessage(); });

  function addBotMessage(text) {
    const div = document.createElement("div");
    div.className = "chat-message bot-message";
    div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function addUserMessage(text, files) {
    const div = document.createElement("div");
    div.className = "chat-message user-message";
    if (text) div.innerHTML = `<div>${text}</div>`;
    files.forEach(f => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(f);
      img.style = "max-width:180px; display:block; margin-top:10px; border-radius:8px;";
      div.appendChild(img);
    });
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
    });
  }


  // LÓGICA DE REINICIO (Boton Nuevo Caso)
  const resetBtn = document.getElementById("resetChat");
  resetBtn.addEventListener("click", () => {
    // Volver al formulario
    chatContainer.style.display = "none";
    formContainer.style.display = "block";

    // Limpiar chat y estados
    chatBox.innerHTML = "";
    form.reset(); // Limpia el formulario

    // No reiniciar totalImagesSent aquí para mantener el límite global
    const municipioGroup = document.getElementById("municipio-group");
    if (municipioGroup) municipioGroup.remove();
  });

  document.getElementById("resetChat").addEventListener("click", () => {
    location.reload(); // Esta es la forma más limpia de reiniciar todo el estado del chat
  });
});