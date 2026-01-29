import { el } from "../../utils/dom.js";

export function Sidebar({ navItems, current }) {
  return el("aside", { class: "sidebar", id: "sidebar" }, [
    el("div", { class: "brand" }, "KIOX"),
    el(
      "nav",
      { class: "nav" },
      navItems.map((item) =>
        el(
          "a",
          {
            href: `#/${item.id}`,
            "data-route": item.id,
            class: item.id === current ? "active" : ""
          },
          [
            el("i", { "data-lucide": item.icon }),
            el("span", {}, item.label)
          ]
        )
      )
    ),
    el("div", { class: "sidebar-footer" }, "Offline-first POS")
  ]);
}
