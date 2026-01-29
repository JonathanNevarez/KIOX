import { ProductRepo } from "../db/repos/ProductRepo.js";
import { inventoryService } from "../services/inventoryService.js";
import { el, clear } from "../utils/dom.js";
import { showModal } from "../ui/components/modal.js";
import { toast } from "../ui/components/toast.js";

export function inventoryPage() {
  const repo = new ProductRepo();
  let products = repo.list();
  const wrapper = el("div", { class: "grid" });

  wrapper.appendChild(
    el(
      "button",
      { class: "btn primary", onClick: () => openMovement() },
      "Nuevo movimiento"
    )
  );

  const card = el("div", { class: "card" });
  wrapper.appendChild(card);

  function render() {
    clear(card);
    if (!products.length) {
      card.appendChild(el("div", { class: "empty" }, "Sin productos"));
      return;
    }
    const table = el("table", { class: "table" }, [
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, "Producto"),
          el("th", {}, "Stock"),
          el("th", {}, "Estado")
        ])
      ])
    ]);
    const tbody = el(
      "tbody",
      {},
      products.map((p) =>
        el("tr", {}, [
          el("td", {}, p.name),
          el("td", {}, p.stock),
          el("td", {}, statusBadge(p))
        ])
      )
    );
    table.appendChild(tbody);
    card.appendChild(table);
  }

  function statusBadge(product) {
    if (product.stock <= 0) return badge("Sin stock", "danger");
    if (product.stock <= 5) return badge("Bajo", "warning");
    return badge("OK", "success");
  }

  function badge(text, variant) {
    return el("span", { class: `badge ${variant}` }, text);
  }

  function openMovement() {
    const productSelect = el(
      "select",
      {},
      products.map((p) =>
        el("option", { value: p.id }, `${p.name} (Stock ${p.stock})`)
      )
    );
    const typeSelect = el("select", {}, [
      el("option", { value: "in" }, "Entrada"),
      el("option", { value: "out" }, "Salida"),
      el("option", { value: "adjust" }, "Ajuste")
    ]);
    const qtyInput = el("input", { type: "number", min: "0", value: 0 });
    const reasonInput = el("input", { placeholder: "Razón" });
    const form = el("div", { class: "form" }, [
      field("Producto", productSelect),
      field("Tipo", typeSelect),
      field("Cantidad", qtyInput),
      field("Razón", reasonInput)
    ]);
    showModal({
      title: "Movimiento de stock",
      content: form,
      actions: [
        { label: "Cancelar", onClick: (close) => close() },
        {
          label: "Guardar",
          variant: "primary",
          onClick: async (close) => {
            try {
              const payload = {
                productId: productSelect.value,
                type: typeSelect.value,
                qty: Number(qtyInput.value),
                reason: reasonInput.value.trim()
              };
              if (!payload.reason || payload.qty <= 0) {
                toast.warn("Completa cantidad y razón");
                return;
              }
              await inventoryService.moveStock(payload);
              products = repo.list();
              render();
              toast.success("Movimiento registrado");
              close();
            } catch (err) {
              toast.error(err.message || "Error al mover stock");
            }
          }
        }
      ]
    });
  }

  render();
  return wrapper;
}

inventoryPage.title = "Inventario";

function field(label, input) {
  return el("div", { class: "field" }, [el("label", {}, label), input]);
}
