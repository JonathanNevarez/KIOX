import { el } from "../../utils/dom.js";

export function Input(attrs = {}) {
  return el("input", attrs);
}

export function Select(options = [], attrs = {}) {
  return el(
    "select",
    attrs,
    options.map((opt) => el("option", { value: opt.value }, opt.label))
  );
}

export function Textarea(attrs = {}) {
  return el("textarea", attrs);
}
