import { createIcons, icons } from "lucide";
import { store } from "../state/store.js";
import { el, clear } from "../utils/dom.js";
import { ToastContainer } from "./components/toast.js";
import { Sidebar } from "./components/sidebar.js";
import { Header } from "./components/header.js";
import { settingsService } from "../services/settingsService.js";

let contentRoot = null;
let sidebarRoot = null;
let backdropRoot = null;

const navItems = [
  { id: "home", label: "Inicio", icon: "home" },
  { id: "pos", label: "Nueva Venta", icon: "shopping-cart" },
  { id: "products", label: "Productos", icon: "package" },
  { id: "inventory", label: "Inventario", icon: "archive" },
  { id: "sales", label: "Historial Ventas", icon: "receipt" },
  { id: "debts", label: "Deudas", icon: "credit-card" },
  { id: "categories", label: "Categorías", icon: "tags" },
  { id: "settings", label: "Settings", icon: "settings" }
];

export function createLayout() {
  const layout = el("div", { class: "layout", "data-theme": "light" }, []);

  sidebarRoot = Sidebar({
    navItems,
    current: store.getState().currentPage
  });
  backdropRoot = el("div", {
    class: "sidebar-backdrop",
    onClick: () => closeSidebar()
  });

  const header = Header({
    onToggleSidebar: () => toggleSidebar(),
    onNewSale: () => (window.location.hash = "#/pos")
  });

  contentRoot = el("main", { class: "content" }, [
    header,
    el("section", { id: "page-root" }, "")
  ]);

  layout.appendChild(sidebarRoot);
  layout.appendChild(backdropRoot);
  layout.appendChild(contentRoot);
  layout.appendChild(ToastContainer());

  applyTheme();
  renderNavActive();
  createIcons({ icons });
  store.subscribe(() => {
    renderNavActive();
    updateConnectivity();
    createIcons({ icons });
  });

  return layout;
}

export function renderPage(pageFn) {
  const root = document.getElementById("page-root");
  if (!root) return;
  clear(root);
  const node = pageFn();
  if (node) root.appendChild(node);
  const title = document.getElementById("page-title");
  if (title) title.textContent = pageFn.title || "KIOX";
  createIcons({ icons });
}

function renderNavActive() {
  const route = store.getState().currentPage;
  const links = sidebarRoot?.querySelectorAll("a[data-route]") || [];
  links.forEach((link) => {
    const isActive = link.getAttribute("data-route") === route;
    link.classList.toggle("active", isActive);
  });
  const title = document.getElementById("page-title");
  const item = navItems.find((n) => n.id === route);
  if (title && item) title.textContent = item.label;
  closeSidebar();
}

function updateConnectivity() {
  const indicator = document.getElementById("connectivity");
  if (!indicator) return;
  indicator.textContent =
    store.getState().connectivity === "online"
      ? "Con conexión"
      : "Sin conexión";
}

function applyTheme() {
  const theme = settingsService.getTheme();
  document.documentElement.setAttribute("data-theme", theme);
}

function toggleSidebar() {
  if (!sidebarRoot || !backdropRoot) return;
  const isOpen = sidebarRoot.classList.toggle("open");
  backdropRoot.classList.toggle("open", isOpen);
}

function closeSidebar() {
  if (!sidebarRoot || !backdropRoot) return;
  sidebarRoot.classList.remove("open");
  backdropRoot.classList.remove("open");
}
