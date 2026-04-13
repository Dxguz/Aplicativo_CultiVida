if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("Service Worker registrado correctamente");
      })
      .catch(error => {
        console.error("Error al registrar el Service Worker:", error);
      });
  });
}




// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", () => {

//     // ❌ NO registrar SW en desarrollo local
//     if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
//       console.log("Service Worker deshabilitado en desarrollo");
//       return;
//     }

//     navigator.serviceWorker
//       .register("/sw.js")
//       .then(() => console.log("Service Worker registrado correctamente"))
//       .catch(err => console.error("Error SW:", err));
//   });
// }

