import { DebtRepo } from "../db/repos/DebtRepo.js";
import { saleService } from "../services/saleService.js";
import { formatDateTime, formatMoney } from "../utils/format.js";
import { el, clear } from "../utils/dom.js";
import { showModal } from "../ui/components/modal.js";
import { toast } from "../ui/components/toast.js";
import { settingsService } from "../services/settingsService.js";
import { createIcons, icons } from "lucide";

export function debtsPage() {
  const repo = new DebtRepo();
  let debts = repo.listOpen();
  const wrapper = el("div", { class: "card" });

  function render() {
    clear(wrapper);
    if (!debts.length) {
      wrapper.appendChild(el("div", { class: "empty" }, "Sin deudas"));
      return;
    }
    const table = el("table", { class: "table" }, [
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, "Cliente"),
          el("th", { class: "col-hide-sm" }, "Teléfono"),
          el("th", {}, "Venta"),
          el("th", {}, "Monto"),
          el("th", {}, "Fecha"),
          el("th", {}, "Acción")
        ])
      ])
    ]);
    const tbody = el(
      "tbody",
      {},
      debts.map((debt) =>
        el("tr", {}, [
          el("td", { "data-label": "Cliente" }, debt.customerName),
          el("td", { "data-label": "Teléfono", class: "col-hide-sm" }, debt.customerPhone || "-"),
          el("td", { "data-label": "Venta" }, `#${debt.saleId}`),
          el(
            "td",
            { "data-label": "Monto" },
            formatMoney(debt.amount, settingsService.getCurrency())
          ),
          el("td", { "data-label": "Fecha" }, formatDateTime(debt.createdAt)),
          el("td", { "data-label": "Acción", class: "actions" }, [
            el(
              "button",
              {
                class: "btn ghost icon-btn info",
                onClick: () => openPayment(debt),
                title: "Registrar pago",
                "aria-label": "Registrar pago"
              },
              el("i", { "data-lucide": "wallet" })
            )
          ])
        ])
      )
    );
    table.appendChild(tbody);
    const scroll = el("div", { class: "table-scroll" }, table);
    wrapper.appendChild(scroll);
    createIcons({ icons });
  }

  function openPayment(debt) {
    const amount = el("input", {
      type: "number",
      min: "0",
      step: "0.01",
      value: debt.amount
    });
    const form = el("div", { class: "form" }, [
      el("div", {}, `Saldo actual: ${formatMoney(debt.amount, settingsService.getCurrency())}`),
      el("div", { class: "field" }, [el("label", {}, "Monto a pagar"), amount])
    ]);
    showModal({
      title: `Pago deuda #${debt.id}`,
      content: form,
      actions: [
        { label: "Cancelar", onClick: (close) => close() },
        {
          label: "Registrar",
          variant: "primary",
          onClick: async (close) => {
            try {
              const value = Number(amount.value);
              if (value <= 0) {
                toast.warn("Monto inválido");
                return;
              }
              await saleService.registerDebtPayment({
                debtId: debt.id,
                amount: value
              });
              debts = repo.listOpen();
              render();
              toast.success("Pago registrado");
              close();
            } catch (err) {
              toast.error("Error al registrar pago");
            }
          }
        }
      ]
    });
  }

  render();
  return wrapper;
}

debtsPage.title = "Deudas";
