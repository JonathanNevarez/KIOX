import { CategoryRepo } from "../db/repos/CategoryRepo.js";
import { ProductRepo } from "../db/repos/ProductRepo.js";
import { validateProduct } from "../services/validation.js";
import { formatMoney } from "../utils/format.js";
import { el, clear } from "../utils/dom.js";
import { showModal } from "../ui/components/modal.js";
import { toast } from "../ui/components/toast.js";
import { settingsService } from "../services/settingsService.js";
import { createIcons, icons } from "lucide";

export function productsPage() {
  const categoryRepo = new CategoryRepo();
  const productRepo = new ProductRepo();
  let products = productRepo.list();
  const categories = categoryRepo.list();

  const wrapper = el("div", { class: "grid" });
  const header = el("div", { class: "header-actions" }, [
    el(
      "button",
      {
        class: "btn primary",
        onClick: () => openForm()
      },
      "Nuevo producto"
    )
  ]);
  wrapper.appendChild(header);

  const search = el("input", {
    placeholder: "Buscar por nombre o SKU",
    onInput: (e) => {
      const value = e.target.value.toLowerCase();
      products = productRepo.list().filter(
        (p) =>
          p.name.toLowerCase().includes(value) ||
          (p.barcode || "").toLowerCase().includes(value)
      );
      renderTable();
    }
  });
  wrapper.appendChild(el("div", { class: "field" }, [search]));

  const tableWrap = el("div", { class: "card" });
  wrapper.appendChild(tableWrap);

  function renderTable() {
    clear(tableWrap);
    if (!products.length) {
      tableWrap.appendChild(el("div", { class: "empty" }, "Sin productos"));
      return;
    }
    const table = el("table", { class: "table" }, [
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, "Nombre"),
          el("th", { class: "col-hide-sm" }, "Categoría"),
          el("th", {}, "Precio"),
          el("th", {}, "Stock"),
          el("th", {}, "Acciones")
        ])
      ])
    ]);
    const tbody = el(
      "tbody",
      {},
      products.map((p) =>
        el("tr", {}, [
          el("td", { "data-label": "Nombre" }, p.name),
          el("td", { "data-label": "Categoría", class: "col-hide-sm" }, p.categoryName),
          el(
            "td",
            { "data-label": "Precio" },
            formatMoney(p.priceSell, settingsService.getCurrency())
          ),
          el("td", { "data-label": "Stock" }, p.stock),
          el("td", { "data-label": "Acciones", class: "actions" }, [
            el(
              "button",
              {
                class: "btn ghost icon-btn info",
                onClick: () => openForm(p),
                title: "Editar",
                "aria-label": "Editar"
              },
              el("i", { "data-lucide": "pencil" })
            ),
            el(
              "button",
              {
                class: "btn ghost icon-btn danger",
                onClick: () => openDelete(p),
                title: "Eliminar",
                "aria-label": "Eliminar"
              },
              el("i", { "data-lucide": "trash-2" })
            )
          ])
        ])
      )
    );
    table.appendChild(tbody);
    const scroll = el("div", { class: "table-scroll" }, table);
    tableWrap.appendChild(scroll);
    createIcons({ icons });
  }

  function openForm(product) {
    if (!categories.length) {
      toast.warn("Crea una categoría antes de agregar productos");
      window.location.hash = "#/categories";
      return;
    }
    const form = el("form", { class: "form" });
    const name = el("input", { value: product?.name || "" });
    const category = el(
      "select",
      {},
      categories.map((c) =>
        el(
          "option",
          { value: c.id, selected: product?.categoryId === c.id },
          c.name
        )
      )
    );
    const priceSell = el("input", {
      type: "number",
      step: "0.01",
      value: product?.priceSell || 0
    });
    const stock = el("input", { type: "number", value: product?.stock || 0 });
    const barcode = el("input", { value: product?.barcode || "" });
    const imageUrl = el("input", { value: product?.imageUrl || "" });

    form.append(
      field("Nombre", name),
      field("Categoría", category),
      field("Precio venta", priceSell),
      field("Stock", stock),
      field("SKU", barcode),
      field("Imagen URL", imageUrl)
    );

    showModal({
      title: product ? "Editar producto" : "Nuevo producto",
      content: form,
      actions: [
        {
          label: "Cancelar",
          onClick: (close) => close()
        },
        {
          label: "Guardar",
          variant: "primary",
          onClick: (close) => {
            const payload = {
              name: name.value.trim(),
              categoryId: category.value,
              priceSell: Number(priceSell.value),
              stock: Number(stock.value),
              barcode: barcode.value.trim(),
              imageUrl: imageUrl.value.trim()
            };
            const errors = validateProduct(payload);
            if (Object.keys(errors).length) {
              toast.warn("Revisa los campos requeridos");
              return;
            }
            try {
              if (product) {
                productRepo.update(product.id, payload);
                toast.success("Producto actualizado");
              } else {
                productRepo.create(payload);
                toast.success("Producto creado");
              }
            } catch (err) {
              toast.error(err.message || "No se pudo guardar el producto");
              return;
            }
            products = productRepo.list();
            renderTable();
            close();
          }
        }
      ]
    });
  }

  function openDelete(product) {
    showModal({
      title: "Eliminar producto",
      content: el("div", {}, `Confirmar eliminación de "${product.name}"`),
      actions: [
        { label: "Cancelar", onClick: (close) => close() },
        {
          label: "Eliminar",
          variant: "primary",
          onClick: (close) => {
            productRepo.remove(product.id);
            products = productRepo.list();
            renderTable();
            toast.success("Producto eliminado");
            close();
          }
        }
      ]
    });
  }

  renderTable();
  return wrapper;
}

productsPage.title = "Productos";

function field(label, input) {
  return el("div", { class: "field" }, [el("label", {}, label), input]);
}
