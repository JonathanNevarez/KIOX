import { el } from "../../utils/dom.js";

export function StatusPill(text, variant = "success") {
  return el("span", { class: `badge ${variant}` }, text);
}
