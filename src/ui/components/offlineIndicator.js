import { store } from "../../state/store.js";
import { el } from "../../utils/dom.js";

export function OfflineIndicator() {
  const node = el(
    "div",
    { class: "offline", id: "connectivity" },
    store.getState().connectivity === "online"
      ? "Con conexión"
      : "Sin conexión"
  );
  return node;
}
