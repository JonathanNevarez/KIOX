import { SaleRepo } from "../db/repos/SaleRepo.js";
import { SaleItemRepo } from "../db/repos/SaleItemRepo.js";
import { formatDateTime, formatMoney } from "../utils/format.js";
import { el, clear } from "../utils/dom.js";
import { showModal } from "../ui/components/modal.js";
import { settingsService } from "../services/settingsService.js";

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
          el("th", {}, "ID"),
          el("th", {}, "Fecha"),
          el("th", {}, "Cliente"),
          el("th", {}, "Total"),
          el("th", {}, "Pagado"),
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
          el("td", {}, sale.id),
          el("td", {}, formatDateTime(sale.createdAt)),
          el("td", {}, sale.customerName || "Mostrador"),
          el("td", {}, formatMoney(sale.total, settingsService.getCurrency())),
          el("td", {}, formatMoney(sale.paid, settingsService.getCurrency())),
          el("td", {}, formatMoney(balance, settingsService.getCurrency())),
          el("td", {}, statusBadge(sale.status)),
          el(
            "td",
            {},
            el(
              "button",
              { class: "btn ghost", onClick: () => openDetail(sale) },
              "Ver"
            )
          )
        ]);
      })
    );
    table.appendChild(tbody);
    wrapper.appendChild(table);
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
