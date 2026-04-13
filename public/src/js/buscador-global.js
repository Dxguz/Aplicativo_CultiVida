document.addEventListener("DOMContentLoaded", () => {

    const input = document.getElementById("buscadorInput");
    const boton = document.getElementById("btnNavbarSearch");
    const form = document.querySelector("form");

    if (!input || !boton || !form) return;

    /* ===============================
       EVITAR RECARGA (ENTER)
    ================================ */
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        ejecutarBusqueda();
    });

    /* ===============================
       CLICK BOTÓN
    ================================ */
    boton.addEventListener("click", ejecutarBusqueda);

    /* ===============================
       FUNCIÓN PRINCIPAL
    ================================ */
    function ejecutarBusqueda() {

        const texto = input.value.trim();

        // Limpiar resaltados anteriores
        limpiarResaltados();

        if (texto === "") return;

        resaltarTexto(texto);
    }

    /* ===============================
       RESALTAR TEXTO
    ================================ */
    function resaltarTexto(texto) {

        const regex = new RegExp(`(${escapeRegex(texto)})`, "gi");

        // Elementos donde se buscará (ajustado a tu HTML)
        const elementos = document.querySelectorAll(
            "p, li, td, th, h1, h2, h3, h4, h5, h6, .video-title, .card-body"
        );

        elementos.forEach(el => {

            // Evita sobreescribir si ya tiene HTML complejo
            if (el.children.length === 0) {
                el.innerHTML = el.innerHTML.replace(regex, "<mark>$1</mark>");
            } else {
                recorrerNodos(el, regex);
            }

        });
    }

    /* ===============================
       RECORRER NODOS (SEGURO)
    ================================ */
    function recorrerNodos(nodo, regex) {

        nodo.childNodes.forEach(child => {

            if (child.nodeType === 3) { // texto puro
                const textoOriginal = child.nodeValue;

                if (regex.test(textoOriginal)) {
                    const span = document.createElement("span");
                    span.innerHTML = textoOriginal.replace(regex, "<mark>$1</mark>");
                    child.replaceWith(span);
                }
            }

        });
    }

    /* ===============================
       LIMPIAR RESALTADOS
    ================================ */
    function limpiarResaltados() {

        const marks = document.querySelectorAll("mark");

        marks.forEach(mark => {
            const texto = document.createTextNode(mark.textContent);
            mark.replaceWith(texto);
        });

    }

    /* ===============================
       ESCAPAR TEXTO (ANTI-ERRORES)
    ================================ */
    function escapeRegex(texto) {
        return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

});