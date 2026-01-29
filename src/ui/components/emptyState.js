import { el } from "../../utils/dom.js";

export function EmptyState(message) {
  return el("div", { class: "empty" }, message || "Sin datos");
}
