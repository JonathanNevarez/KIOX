import { el } from "../../utils/dom.js";
import { OfflineIndicator } from "./offlineIndicator.js";

export function Header({ onToggleSidebar, onNewSale }) {
  return el("header", { class: "header" }, [
    el("div", {}, [
      el(
        "button",
        {
          class: "btn ghost mobile-toggle",
          onClick: onToggleSidebar
        },
        [el("i", { "data-lucide": "menu" })]
      ),
      el("h1", { id: "page-title" }, "Inicio")
    ]),
    el("div", { class: "header-actions" }, [
      OfflineIndicator(),
      el(
        "button",
        {
          class: "btn secondary",
          onClick: onNewSale
        },
        [el("i", { "data-lucide": "plus" }), "Nueva Venta"]
      )
    ])
  ]);
}
