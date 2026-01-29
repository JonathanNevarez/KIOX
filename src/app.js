import { initDb } from "./db/sqlite/index.js";
import { applyMigrations } from "./db/migrations/index.js";
import { seedDevData } from "./db/seed.js";
import { store } from "./state/store.js";
import { createLayout } from "./ui/layout.js";
import { startRouter } from "./router.js";
import { settingsService } from "./services/settingsService.js";
import { toast } from "./ui/components/toast.js";

export async function initApp() {
  const db = await initDb();
  await applyMigrations(db);
  await settingsService.ensureDefaults();

  if (import.meta.env.DEV) {
    await seedDevData();
  }

  const root = document.getElementById("app");
  if (!root) return;
  root.innerHTML = "";
  root.appendChild(createLayout());

  startRouter();

  window.addEventListener("online", () => {
    store.setState({ connectivity: "online" });
    toast.success("Con conexión");
  });
  window.addEventListener("offline", () => {
    store.setState({ connectivity: "offline" });
    toast.warn("Sin conexión");
  });
}
