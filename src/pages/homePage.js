import { reportService } from "../services/reportService.js";
import { formatMoney } from "../utils/format.js";
import { settingsService } from "../services/settingsService.js";
import { el } from "../utils/dom.js";

export function homePage() {
  const data = reportService.getDashboardMetrics();

  const currency = settingsService.getCurrency();
  const cards = el("div", { class: "grid grid-4" }, [
    card("Ventas hoy", data.salesToday),
    card("Cobrado hoy", formatMoney(data.totalPaid, currency)),
    card("Deuda pendiente", formatMoney(data.totalDebt, currency)),
    card("Total productos", data.totalProducts)
  ]);

  const lowStock = el("div", { class: "card" }, [
    el("h3", {}, "Productos con stock bajo (<= 5)"),
    data.lowStock.length
      ? createTable(data.lowStock)
      : el("div", { class: "empty" }, "Sin productos con stock bajo")
  ]);

  return el("div", { class: "grid" }, [cards, lowStock]);
}

homePage.title = "Inicio";

function card(label, value) {
  return el("div", { class: "card" }, [
    el("div", { class: "card-title" }, label),
    el("div", { class: "card-value" }, value)
  ]);
}

function createTable(rows) {
  const table = el("table", { class: "table" });
  table.appendChild(
    el("thead", {}, [
      el("tr", {}, [
        el("th", {}, "Producto"),
        el("th", {}, "Stock")
      ])
    ])
  );
  const tbody = el(
    "tbody",
    {},
    rows.map((row) =>
      el("tr", {}, [
        el("td", {}, row.name),
        el("td", {}, row.stock)
      ])
    )
  );
  table.appendChild(tbody);
  return table;
}
