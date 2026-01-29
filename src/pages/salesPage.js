import { SaleRepo } from "../db/repos/SaleRepo.js";
import { SaleItemRepo } from "../db/repos/SaleItemRepo.js";
import { formatDateTime, formatMoney } from "../utils/format.js";
import { el, clear } from "../utils/dom.js";
import { showModal } from "../ui/components/modal.js";
import { settingsService } from "../services/settingsService.js";
import { createIcons, icons } from "lucide";

export function salesPage() {
  const saleRepo = new SaleRepo();
  const itemRepo = new SaleItemRepo();
  let sales = saleRepo.list();

  const wrapper = el("div", { class: "card" });

  function render() {
    clear(wrapper);
    if (!sales.length) {
      wrapper.appendChild(el("div", { class: "empty" }, "Sin ventas"));
      return;
    }
    const table = el("table", { class: "table" }, [
      el("thead", {}, [
        el("tr", {}, [
          el("th", { class: "col-hide-sm" }, "ID"),
          el("th", {}, "Fecha"),
          el("th", {}, "Cliente"),
          el("th", {}, "Total"),
          el("th", { class: "col-hide-sm" }, "Pagado"),
          el("th", {}, "Saldo"),
          el("th", {}, "Estado"),
          el("th", {}, "Detalle")
        ])
      ])
    ]);
    const tbody = el(
      "tbody",
      {},
      sales.map((sale) => {
        const balance = Math.max(sale.total - sale.paid, 0);
        return el("tr", {}, [
          el("td", { "data-label": "ID", class: "col-hide-sm" }, sale.id),
          el("td", { "data-label": "Fecha" }, formatDateTime(sale.createdAt)),
          el("td", { "data-label": "Cliente" }, sale.customerName || "Mostrador"),
          el(
            "td",
            { "data-label": "Total" },
            formatMoney(sale.total, settingsService.getCurrency())
          ),
          el(
            "td",
            { "data-label": "Pagado", class: "col-hide-sm" },
            formatMoney(sale.paid, settingsService.getCurrency())
          ),
          el(
            "td",
            { "data-label": "Saldo" },
            formatMoney(balance, settingsService.getCurrency())
          ),
          el("td", { "data-label": "Estado" }, statusBadge(sale.status)),
          el("td", { "data-label": "Detalle", class: "actions" }, [
            el(
              "button",
              {
                class: "btn ghost icon-btn info",
                onClick: () => openDetail(sale),
                title: "Ver detalle",
                "aria-label": "Ver detalle"
              },
              el("i", { "data-lucide": "eye" })
            )
          ])
        ]);
      })
    );
    table.appendChild(tbody);
    wrapper.appendChild(table);
    createIcons({ icons });
  }

  function statusBadge(status) {
    if (status === "Pagado") return badge(status, "success");
    if (status === "Parcial") return badge(status, "warning");
    return badge("Crédito", "danger");
  }

  function badge(text, variant) {
    return el("span", { class: `badge ${variant}` }, text);
  }

  function openDetail(sale) {
    const items = itemRepo.listBySaleId(sale.id);
    const content = el("div", { class: "form" }, [
      el("div", {}, `Método: ${sale.paymentMethod}`),
      el("div", {}, `Cliente: ${sale.customerName || "Mostrador"}`),
      el("div", {}, `Notas: ${sale.notes || "-"}`),
      el("div", {}, "Items:")
    ]);
    const table = el("table", { class: "table" }, [
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, "Producto"),
          el("th", {}, "Qty"),
          el("th", {}, "Total")
        ])
      ])
    ]);
    const tbody = el(
      "tbody",
      {},
      items.map((item) =>
        el("tr", {}, [
          el("td", {}, item.productName),
          el("td", {}, item.qty),
          el("td", {}, formatMoney(item.total, settingsService.getCurrency()))
        ])
      )
    );
    table.appendChild(tbody);
    content.appendChild(table);
    content.appendChild(
      el(
        "div",
        {},
        `Saldo pendiente: ${formatMoney(
          Math.max(sale.total - sale.paid, 0),
          settingsService.getCurrency()
        )}`
      )
    );
    showModal({
      title: `Venta #${sale.id}`,
      content,
      actions: [{ label: "Cerrar", onClick: (close) => close() }]
    });
  }

  render();
  return wrapper;
}

salesPage.title = "Historial Ventas";
