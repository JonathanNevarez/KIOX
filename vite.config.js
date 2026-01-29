import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      srcDir: "src",
      filename: "sw.js",
      strategies: "injectManifest",
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["offline.html", "icons/icon-192.svg", "icons/icon-512.svg"],
      devOptions: { enabled: true }
    })
  ],
  build: {
    sourcemap: true
  }
});
