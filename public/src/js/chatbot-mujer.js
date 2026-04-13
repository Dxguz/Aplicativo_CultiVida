/**
 * CultiVida - Panel Mujeres Rurales
 * Especialidad: Cultivo de Maíz (Ubaté & Puebla)
 */

// CONFIGURACIÓN DE MULTI-LLAVES
const API_KEYS = [
    "AIzaSyCwBAV7tJDywI-ObpiLbVWhHr1MC3XBtjE", 
    "SEGUNDA_API_KEY", 
    "TERCERA_API_KEY"
];

let currentKeyIndex = 0;
let totalImagesSent = 0;
let userContext = { pais: "", municipio: "", cultivo: "Maíz" };

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("agriForm");
    const paisSelect = document.getElementById("pais");
    const formContainer = document.getElementById("formulario-container");
    const chatContainer = document.getElementById("chat-container");
    const chatBox = document.getElementById("chatBox");
    const userMessageInput = document.getElementById("userMessage");
    const sendMessageBtn = document.getElementById("sendMessage");
    const resetBtn = document.getElementById("resetChat");

    // LÓGICA DE LUGARES
    paisSelect.addEventListener("change", () => {
        const existente = document.getElementById("municipio-group");
        if (existente) existente.remove();

        if (paisSelect.value === "colombia") {
            const municipios = ["Ubaté", "Cucunubá", "Susa", "Lenguazaque", "Fúquene", "Guachetá", "Simijaca", "Tausa", "Carmen de Carupa", "Sutatausa"];
            const div = document.createElement("div");
            div.className = "form-group";
            div.id = "municipio-group";
            div.innerHTML = `<label>Municipio de la Provincia:</label>
                <select id="municipio" required>
                    <option value="" disabled selected>Selecciona municipio</option>
                    ${municipios.map(m => `<option value="${m}">${m}</option>`).join('')}
                </select>`;
            paisSelect.parentElement.insertAdjacentElement("afterend", div);
        }
    });

    // COMUNICACIÓN CON ROTACIÓN
    async function callGemini(parts) {
        showTypingIndicator();
        try {
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEYS[currentKeyIndex]}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: parts }] })
            });

            if (response.status === 429 && currentKeyIndex < API_KEYS.length - 1) {
                currentKeyIndex++;
                removeTypingIndicator();
                return await callGemini(parts);
            }

            const data = await response.json();
            removeTypingIndicator();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            removeTypingIndicator();
            return "⚠️ Error de conexión.";
        }
    }

    // INICIO (PROMPT CONTEXTUALIZADO)
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        userContext.pais = paisSelect.value;
        userContext.municipio = document.getElementById("municipio")?.value || "Puebla, México";
        const descripcion = document.getElementById("descripcion").value;

        formContainer.style.display = "none";
        chatContainer.style.display = "flex";

        // Definición de contexto geográfico para la IA
        let geocontexto = userContext.pais === "colombia" 
            ? `Provincia de Ubaté (clima frío andino, Maíz porvo/criollo)` 
            : `Puebla, México (clima templado/semi-árido, variedades locales de México)`;

        const promptMaestro = `Eres CultiVida, chatbot experto en CULTIVO DE MAÍZ. 
        Contexto: Agricultora en ${geocontexto}, ubicación específica: ${userContext.municipio}.
        REGLA DE ORO: Solo hablas de Maíz. Si preguntan de otros cultivos o temas ajenos, niégate.
        Considera factores locales de ${userContext.pais} para el diagnóstico.
        Problema inicial: ${descripcion}`;

        const respuesta = await callGemini([{ text: promptMaestro }]);
        addBotMessage(respuesta);
    });

    // 5. MENSAJERÍA
    async function handleSendMessage() {
        const text = userMessageInput.value.trim();
        if (!text) return;

        addUserMessage(text);
        userMessageInput.value = "";

        const prompt = `Pregunta de la agricultora de Maíz en ${userContext.municipio}: ${text}. Responde técnico y breve.`;
        const respuesta = await callGemini([{ text: prompt }]);
        addBotMessage(respuesta);
    }

    // REINICIO (Sin reload para no perder llaves)
    resetBtn.addEventListener("click", () => {
        chatBox.innerHTML = "";
        form.reset();
        chatContainer.style.display = "none";
        formContainer.style.display = "block";
        const m = document.getElementById("municipio-group");
        if (m) m.remove();
    });

    // AUXILIARES VISUALES
    function showTypingIndicator() {
        const d = document.createElement("div");
        d.className = "chat-message bot-message"; d.id = "typing";
        d.innerHTML = "<span>...</span>";
        chatBox.appendChild(d);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removeTypingIndicator() {
        const t = document.getElementById("typing");
        if (t) t.remove();
    }

    function addBotMessage(text) {
        const div = document.createElement("div");
        div.className = "chat-message bot-message";
        div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addUserMessage(text) {
        const div = document.createElement("div");
        div.className = "chat-message user-message";
        div.innerHTML = `<div>${text}</div>`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    sendMessageBtn.addEventListener("click", handleSendMessage);
    userMessageInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSendMessage(); });
});