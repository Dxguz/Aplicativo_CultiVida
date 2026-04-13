/* ===============================
   CACHES
================================ */
const STATIC_CACHE = "cultivida-static-v12";
const VIDEO_CACHE = "cultivida-video-v2";

/* ===============================
   ARCHIVOS OFFLINE (SIN VIDEOS)
================================ */
const STATIC_FILES = [
    "./",
    "./index.html",
    "./offline.html",
    "./manifest.json",


    // HTML
    "./info-web.html",
    "./info-papa-re.html",
    "./info-maiz-re.html",
    "./info-arveja-re.html",
    "./enfermedades-p.html",
    "./enfermedades-m.html",
    "./enfermedades-a.html",
    "./climaticos-a.html",
    "./climaticos-m.html",
    "./climaticos-p.html",
    "./plagas-a.html",
    "./plagas-m.html",
    "./plagas-p.html",

    // CSS
    "./src/css/estilos.css",
    "./src/css/estilos-contactanos.css",
    "./src/css/estilos-info-web.css",
    "./src/css/estilos-cultivos.css",

    // JS
    "./src/js/main.js",
    "./src/js/scripts-info-web.js",
    "./src/js/jquery-3.7.1.min.js",
    "./src/js/offline-status.js",

    // IMÁGENES
    "./src/img/agricultura.png",
    "./src/img/agrosavia.jpg",
    "./src/img/c-mujer1.jpeg",
    "./src/img/c-mujer2.jpg",
    "./src/img/c-mujer3.jpeg",
    "./src/img/ChatBot_Cultivida.png",
    "./src/img/ChatBot_NO_Fondo.png",
    "./src/img/clima1-arv.jpg",
    "./src/img/Clima1-maiz.jpg",
    "./src/img/clima2-arv.jfif",
    "./src/img/clima2-maiz.jpg",
    "./src/img/Climaysuelo.jfif",
    "./src/img/ComunidadAlverja.jpg",
    "./src/img/conta.png",
    "./src/img/corteva.png",
    "./src/img/creatividad.png",
    "./src/img/cultivo1.png",
    "./src/img/cultivo2.png",
    "./src/img/cultivo3.jpg",
    "./src/img/curso1.png",
    "./src/img/curso2.png",
    "./src/img/curso3.png",
    "./src/img/default-event.png",
    "./src/img/enf-costra-negra.png",
    "./src/img/enf-gota-papa.jpg",
    "./src/img/ENF1_ARV.jpg",
    "./src/img/enf1-maiz.png",
    "./src/img/ENF2-ARV.jfif",
    "./src/img/enf2-maiz.jpg",
    "./src/img/envio.gif",
    "./src/img/epocaarverja.jpg",
    "./src/img/Evento1.jpg",
    "./src/img/Evento2.jpg",
    "./src/img/Evento3.jpg",
    "./src/img/fedepapa.png",
    "./src/img/fer_arverja.jpg",
    "./src/img/Fertilizacion-maiz.jpg",
    "./src/img/fondo.jpg",
    "./src/img/Fondolcons.jpg",
    "./src/img/FondoRegistro.png",
    "./src/img/FondoRol.png",
    "./src/img/herramientas-papa.png",
    "./src/img/icon-192.png",
    "./src/img/icon-512.png",
    "./src/img/ing1.png",
    "./src/img/ing2.jpg",
    "./src/img/ing3.jpg",
    "./src/img/LOGO_EOS.jfif",
    "./src/img/LogoFondo.jpg",
    "./src/img/LogoNoFondo.png",
    "./src/img/Maiz-malezas.png",
    "./src/img/Manual_Usuario.png",
    "./src/img/minagricultura.jpg",
    "./src/img/monitoreo.png",
    "./src/img/mujeres.png",
    "./src/img/p-clima-papa1.png",
    "./src/img/p-clima-papa2.png",
    "./src/img/Perfil1_Profesional.jpg",
    "./src/img/Perfil2_Profesional.jpg",
    "./src/img/Perfil3_Profesional.jpg",
    "./src/img/PersonaD.png",
    "./src/img/PersonaM.png",
    "./src/img/plaga_gusano_blanco.jpg",
    "./src/img/plaga-polilla_guatemalteca.jpg",
    "./src/img/plaga1-arv.jpg",
    "./src/img/plaga1-maiz.jpg",
    "./src/img/plaga2-arv.jpg",
    "./src/img/plaga2-maiz.jpeg",
    "./src/img/pp.jpg",
    "./src/img/region1.png",
    "./src/img/region2.png",
    "./src/img/region3.png",
    "./src/img/responsive.png",
    "./src/img/riego.png",
    "./src/img/Rotacion.png",
    "./src/img/SemillaCert.png",
    "./src/img/siembra-maiz1.jpg",
    "./src/img/Siembra-recomendaciones.jpg",
    "./src/img/siembraarverja.jpg",
    "./src/img/terrenoarveja.jpeg",
    "./src/img/Video_tutorial.png"
];

/* ===============================
   INSTALL
================================ */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(async cache => {
            for (const file of STATIC_FILES) {
                try {
                    await cache.add(file);
                } catch (e) {
                    console.warn("No se pudo cachear:", file);
                }
            }
        })
    );
    self.skipWaiting();
});

/* ===============================
   ACTIVATE
================================ */
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => ![STATIC_CACHE, VIDEO_CACHE].includes(k))
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

/* ===============================
   FETCH
================================ */
self.addEventListener("fetch", event => {

    const req = event.request;
    const url = req.url;

    // Ignorar WebSockets (Live Server)
    if (url.startsWith("ws://")) return;

    /* ===============================
       VIDEOS → network first
    ================================ */
    /* ===============================
   VIDEOS (offline estable)
================================ */
    if (req.destination === "video") {
        event.respondWith(
            caches.open(VIDEO_CACHE).then(async cache => {
                try {
                    const response = await fetch(req);

                    if (response.status === 200) {
                        cache.put(req, response.clone());
                    }

                    return response;
                } catch (err) {
                    const cached = await cache.match(req);
                    if (cached) return cached;

                    return new Response("Video no disponible offline", {
                        status: 404,
                        headers: { "Content-Type": "text/plain" }
                    });
                }
            })
        );
        return;
    }


    /* ===============================
       NAVEGACIÓN HTML (OFFLINE REAL)
    ================================ */
    if (req.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const networkResponse = await fetch(req);

                    if (networkResponse.status === 200) {
                        const cache = await caches.open(STATIC_CACHE);
                        cache.put(req, networkResponse.clone());
                    }

                    return networkResponse;

                } catch (error) {

                    const cachedResponse = await caches.match(req);
                    if (cachedResponse) return cachedResponse;

                    const offlineResponse = await caches.match("./offline.html");
                    if (offlineResponse) return offlineResponse;

                    return new Response("Página no disponible offline", {
                        status: 503,
                        headers: { "Content-Type": "text/plain" }
                    });
                }
            })()
        );
        return;
    }

    /* ===============================
   ESTÁTICOS (CSS, IMG, JS)
================================ */
    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;

            // No cachear requests externos
            if (!req.url.startsWith(self.location.origin)) {
                return fetch(req).catch(() => caches.match(req));
            }

            // No cachear Range requests (previene 206 error)
            if (req.headers.has("range")) {
                return fetch(req);
            }

            return fetch(req).then(res => {

                if (res.status === 200) {
                    return caches.open(STATIC_CACHE).then(cache => {
                        cache.put(req, res.clone());
                        return res;
                    });
                }

                return res;

            }).catch(() => {
                return new Response(null, { status: 204 });
            });

        })
    );

});
