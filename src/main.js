import "./styles.css";
import { initApp } from "./app.js";
import { registerServiceWorker } from "./pwa/registerSW.js";

initApp().catch((err) => {
  console.error("KIOX init error", err);
  const root = document.getElementById("app");
  if (root) {
    root.innerHTML =
      '<div class="fatal">Error al iniciar la aplicación. Revisa la consola.</div>';
  }
});

registerServiceWorker();
