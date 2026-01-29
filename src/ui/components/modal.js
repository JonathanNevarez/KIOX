import { el } from "../../utils/dom.js";

export function showModal({ title, content, actions = [] }) {
  const backdrop = el("div", { class: "modal-backdrop" });
  const modal = el("div", { class: "modal", role: "dialog", "aria-modal": "true" }, [
    el("div", { class: "modal-header" }, [
      el("h3", { class: "modal-title" }, title || "Detalle"),
      el(
        "button",
        {
          class: "btn ghost",
          onClick: () => close()
        },
        "Cerrar"
      )
    ]),
    content,
    el(
      "div",
      { class: "modal-actions" },
      actions.map((action) =>
        el(
          "button",
          {
            class: `btn ${action.variant || "secondary"}`,
            onClick: () => action.onClick?.(close)
          },
          action.label
        )
      )
    )
  ]);

  let onKeyDown = null;

  function close() {
    if (onKeyDown) document.removeEventListener("keydown", onKeyDown);
    backdrop.remove();
  }

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const focusables = () =>
    Array.from(
      modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );

  onKeyDown = (event) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const nodes = focusables();
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener("keydown", onKeyDown);
  focusables()[0]?.focus();
  return { close };
}
