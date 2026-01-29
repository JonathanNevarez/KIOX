import { el } from "../../utils/dom.js";

let container = null;

export function ToastContainer() {
  if (!container) {
    container = el("div", { class: "toast-container", id: "toasts" });
  }
  return container;
}

function show(message, variant = "success") {
  if (!container) ToastContainer();
  const toast = el("div", { class: `toast ${variant}` }, message);
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

export const toast = {
  success: (msg) => show(msg, "success"),
  warn: (msg) => show(msg, "warn"),
  error: (msg) => show(msg, "error")
};
