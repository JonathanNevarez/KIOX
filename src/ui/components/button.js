import { el } from "../../utils/dom.js";

export function Button({ label, variant = "secondary", onClick, icon }) {
  const children = [];
  if (icon) children.push(el("i", { "data-lucide": icon }));
  if (label) children.push(label);
  return el(
    "button",
    {
      class: `btn ${variant}`,
      onClick
    },
    children
  );
}
