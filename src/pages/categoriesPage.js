import { CategoryRepo } from "../db/repos/CategoryRepo.js";
import { validateCategory } from "../services/validation.js";
import { el, clear } from "../utils/dom.js";
import { showModal } from "../ui/components/modal.js";
import { toast } from "../ui/components/toast.js";

export function categoriesPage() {
  const repo = new CategoryRepo();
  let categories = repo.list();
  const wrapper = el("div", { class: "grid" }, []);

  wrapper.appendChild(
    el(
      "button",
      { class: "btn primary", onClick: () => openForm() },
      "Nueva categoría"
    )
  );

  const card = el("div", { class: "card" });
  wrapper.appendChild(card);

  function render() {
    clear(card);
    if (!categories.length) {
      card.appendChild(el("div", { class: "empty" }, "Sin categorías"));
      return;
    }
    const table = el("table", { class: "table" }, [
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, "Nombre"),
          el("th", {}, "Acciones")
        ])
      ])
    ]);
    const tbody = el(
      "tbody",
      {},
      categories.map((cat) =>
        el("tr", {}, [
          el("td", {}, cat.name),
          el("td", {}, [
            el(
              "button",
              { class: "btn ghost", onClick: () => openForm(cat) },
              "Editar"
            ),
            el(
              "button",
              {
                class: "btn ghost",
                onClick: () => openDelete(cat)
              },
              "Eliminar"
            )
          ])
        ])
      )
    );
    table.appendChild(tbody);
    card.appendChild(table);
  }

  function openForm(category) {
    const name = el("input", { value: category?.name || "" });
    const form = el("div", { class: "form" }, [
      el("div", { class: "field" }, [el("label", {}, "Nombre"), name])
    ]);
    showModal({
      title: category ? "Editar categoría" : "Nueva categoría",
      content: form,
      actions: [
        { label: "Cancelar", onClick: (close) => close() },
        {
          label: "Guardar",
          variant: "primary",
          onClick: (close) => {
            const payload = { name: name.value.trim() };
            const errors = validateCategory(payload);
            if (Object.keys(errors).length) {
              toast.warn("Nombre requerido");
              return;
            }
            if (category) {
              repo.update(category.id, payload);
              toast.success("Categoría actualizada");
            } else {
              repo.create(payload);
              toast.success("Categoría creada");
            }
            categories = repo.list();
            render();
            close();
          }
        }
      ]
    });
  }

  function openDelete(category) {
    showModal({
      title: "Eliminar categoría",
      content: el(
        "div",
        {},
        `Confirmar eliminación de "${category.name}"`
      ),
      actions: [
        { label: "Cancelar", onClick: (close) => close() },
        {
          label: "Eliminar",
          variant: "primary",
          onClick: (close) => {
            const result = repo.remove(category.id);
            if (!result.ok) {
              toast.warn(
                "No se puede eliminar: la categoría tiene productos"
              );
              return;
            }
            categories = repo.list();
            render();
            toast.success("Categoría eliminada");
            close();
          }
        }
      ]
    });
  }

  render();
  return wrapper;
}

categoriesPage.title = "Categorías";
