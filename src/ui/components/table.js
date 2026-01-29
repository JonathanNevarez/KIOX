import { el } from "../../utils/dom.js";

export function Table({ headers = [], rows = [] }) {
  const table = el("table", { class: "table" });
  const thead = el(
    "thead",
    {},
    el(
      "tr",
      {},
      headers.map((h) => el("th", {}, h))
    )
  );
  const tbody = el(
    "tbody",
    {},
    rows.map((row) =>
      el(
        "tr",
        {},
        row.map((cell) => el("td", {}, cell))
      )
    )
  );
  table.append(thead, tbody);
  return table;
}
