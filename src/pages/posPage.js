import { CategoryRepo } from "../db/repos/CategoryRepo.js";
import { ProductRepo } from "../db/repos/ProductRepo.js";
import { saleService } from "../services/saleService.js";
import { settingsService } from "../services/settingsService.js";
import { validateCheckout } from "../services/validation.js";
import { store } from "../state/store.js";
import { formatMoney } from "../utils/format.js";
import { el, clear } from "../utils/dom.js";
import { showModal } from "../ui/components/modal.js";
import { toast } from "../ui/components/toast.js";

export function posPage() {
  const categoryRepo = new CategoryRepo();
  const productRepo = new ProductRepo();
  const categories = categoryRepo.list();
  let products = productRepo.list();

  const wrapper = el("div", { class: "pos" }, []);
  const productSection = el("div", { class: "card" });
  const cartSection = el("div", { class: "cart" });

  const searchInput = el("input", {
    placeholder: "Buscar producto",
    value: "",
    onInput: (e) => {
      const value = e.target.value.toLowerCase();
      store.setState({
        filters: { ...store.getState().filters, search: value }
      });
      renderProducts();
    }
  });

  const chips = el(
    "div",
    { class: "chips" },
    [
      el(
        "button",
        {
          class: "chip active",
          onClick: () => {
            store.setState({
              selectedCategory: null
            });
            renderChips();
            renderProducts();
          }
        },
        "Todas"
      ),
      ...categories.map((cat) =>
        el(
          "button",
          {
            class: "chip",
            onClick: () => {
              store.setState({ selectedCategory: cat.id });
              renderChips();
              renderProducts();
            }
          },
          cat.name
        )
      )
    ]
  );

  productSection.appendChild(
    el("div", { class: "form" }, [
      el("div", { class: "field" }, [
        el("label", {}, "Buscar"),
        searchInput
      ]),
      chips
    ])
  );

  const productGrid = el("div", { class: "product-grid" });
  productSection.appendChild(productGrid);

  wrapper.appendChild(productSection);
  wrapper.appendChild(cartSection);

  function renderChips() {
    const selected = store.getState().selectedCategory;
    chips.querySelectorAll(".chip").forEach((chip, idx) => {
      if (idx === 0) {
        chip.classList.toggle("active", !selected);
        return;
      }
      const cat = categories[idx - 1];
      chip.classList.toggle("active", selected === cat.id);
    });
  }

  function renderProducts() {
    clear(productGrid);
    const { search } = store.getState().filters;
    const selected = store.getState().selectedCategory;
    products = productRepo.list();
    const filtered = products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search) ||
        (p.barcode || "").toLowerCase().includes(search);
      const matchCategory = !selected || p.categoryId === selected;
      return matchSearch && matchCategory;
    });
    if (!filtered.length) {
      productGrid.appendChild(
        el("div", { class: "empty" }, "Sin productos")
      );
      return;
    }
    filtered.forEach((product) => {
      const thumbContent = product.imageUrl
        ? el("img", {
            src: product.imageUrl,
            alt: product.name,
            loading: "lazy"
          })
        : el("div", { class: "initial" }, product.name.slice(0, 2).toUpperCase());
      const card = el("div", { class: "product-card" }, [
        el("div", { class: "thumb" }, thumbContent),
        el("strong", {}, product.name),
        el("span", {}, formatMoney(product.priceSell, settingsService.getCurrency())),
        el(
          "small",
          { class: "muted" },
          `Stock: ${product.stock}`
        )
      ]);
      card.addEventListener("click", () => {
        if (product.stock <= 0) {
          toast.warn("Stock insuficiente");
          return;
        }
        store.addToCart({
          productId: product.id,
          name: product.name,
          price: product.priceSell,
          qty: 1
        });
      });
      productGrid.appendChild(card);
    });
  }

  function renderCart() {
    clear(cartSection);
    const cart = store.getState().cart;
    cartSection.appendChild(el("h3", {}, "Carrito"));

    if (!cart.length) {
      cartSection.appendChild(
        el("div", { class: "empty" }, "Sin items")
      );
      return;
    }

    cart.forEach((item) => {
      const product = productRepo.getById(item.productId);
      const row = el("div", { class: "cart-item" }, [
        el("div", {}, [
          el("strong", {}, item.name),
          el("div", {}, formatMoney(item.price, settingsService.getCurrency()))
        ]),
        el("div", { class: "cart-actions" }, [
          el(
            "button",
            {
              class: "btn ghost",
              onClick: () => {
                if (item.qty <= 1) {
                  store.removeFromCart(item.productId);
                } else {
                  store.updateCart(item.productId, item.qty - 1);
                }
              }
            },
            "-"
          ),
          el("input", {
            type: "number",
            min: "1",
            value: item.qty,
            onChange: (e) => {
              const qty = Number(e.target.value);
              if (qty > 0 && qty <= product.stock) {
                store.updateCart(item.productId, qty);
              } else {
                toast.warn("Cantidad supera el stock");
                e.target.value = item.qty;
              }
            }
          }),
          el(
            "button",
            {
              class: "btn ghost",
              onClick: () => {
                const next = item.qty + 1;
                if (next > product.stock) {
                  toast.warn("Stock insuficiente");
                  return;
                }
                store.updateCart(item.productId, next);
              }
            },
            "+"
          ),
          el(
            "button",
            {
              class: "btn ghost",
              onClick: () => store.removeFromCart(item.productId)
            },
            "Eliminar"
          )
        ])
      ]);
      cartSection.appendChild(row);
    });

    const totals = cart.reduce(
      (acc, item) => {
        acc.subtotal += item.price * item.qty;
        acc.total = acc.subtotal;
        return acc;
      },
      { subtotal: 0, total: 0 }
    );

    cartSection.appendChild(
      el("div", { class: "totals" }, [
        el("div", { class: "line" }, [
          el("span", {}, "Subtotal"),
          el("span", {}, formatMoney(totals.subtotal, settingsService.getCurrency()))
        ]),
        el("div", { class: "line" }, [
          el("span", {}, "Total"),
          el("strong", {}, formatMoney(totals.total, settingsService.getCurrency()))
        ])
      ])
    );

    cartSection.appendChild(
      el(
        "button",
        {
          class: "btn primary",
          onClick: () => openCheckoutModal(cart, totals)
        },
        "Cobrar"
      )
    );
  }

  function openCheckoutModal(cart, totals) {
    const form = el("form", { class: "form" }, []);
    const paymentMethod = el("select", {}, [
      el("option", { value: "cash" }, "Efectivo"),
      el("option", { value: "transfer" }, "Transferencia"),
      el("option", { value: "credit" }, "Crédito")
    ]);
    const paidInput = el("input", {
      type: "number",
      min: "0",
      step: "0.01",
      value: totals.total
    });
    const partialToggle = el("input", { type: "checkbox" });
    const customerName = el("input", { placeholder: "Nombre cliente" });
    const customerPhone = el("input", { placeholder: "Teléfono (opcional)" });
    const notes = el("textarea", { rows: "3", placeholder: "Notas" });
    const balanceText = el("div", {}, "");

    const updateBalance = () => {
      const paid = Number(paidInput.value || 0);
      const balance = Math.max(totals.total - paid, 0);
      balanceText.textContent = `Saldo: ${formatMoney(
        balance,
        settingsService.getCurrency()
      )}`;
    };

    paidInput.addEventListener("input", updateBalance);
    const syncPaymentInputs = () => {
      if (paymentMethod.value === "credit") {
        paidInput.value = 0;
        paidInput.disabled = true;
        partialToggle.checked = false;
        partialToggle.disabled = true;
      } else {
        partialToggle.disabled = false;
        paidInput.disabled = !partialToggle.checked;
        if (!partialToggle.checked) {
          paidInput.value = totals.total;
        }
      }
      updateBalance();
    };

    partialToggle.addEventListener("change", syncPaymentInputs);
    paymentMethod.addEventListener("change", syncPaymentInputs);

    form.appendChild(
      el("div", { class: "field" }, [
        el("label", {}, "Método de pago"),
        paymentMethod
      ])
    );
    form.appendChild(
      el("div", { class: "field" }, [
        el("label", {}, "Pago parcial"),
        el("div", {}, [partialToggle])
      ])
    );
    form.appendChild(
      el("div", { class: "field" }, [
        el("label", {}, "Monto pagado"),
        paidInput
      ])
    );
    form.appendChild(
      el("div", { class: "field" }, [
        el("label", {}, "Cliente"),
        customerName
      ])
    );
    form.appendChild(
      el("div", { class: "field" }, [
        el("label", {}, "Teléfono"),
        customerPhone
      ])
    );
    form.appendChild(
      el("div", { class: "field" }, [
        el("label", {}, "Notas"),
        notes
      ])
    );
    form.appendChild(balanceText);
    syncPaymentInputs();

    const modal = showModal({
      title: "Checkout",
      content: form,
      actions: [
        {
          label: "Cancelar",
          variant: "secondary",
          onClick: (close) => close()
        },
        {
          label: "Confirmar venta",
          variant: "primary",
          onClick: async (close) => {
            try {
              const payload = {
                paymentMethod: paymentMethod.value,
                paid: Number(paidInput.value || 0),
                customerName: customerName.value.trim(),
                customerPhone: customerPhone.value.trim(),
                notes: notes.value.trim(),
                partial: partialToggle.checked
              };
              const errors = validateCheckout(payload);
              if (Object.keys(errors).length > 0) {
                toast.warn("Completa los campos requeridos");
                return;
              }
              const stockErrors = await saleService.validateStock(cart);
              if (stockErrors.length) {
                toast.error("Stock insuficiente en algunos productos");
                return;
              }
              const result = await saleService.createSale({
                items: cart,
                payment: payload
              });
              store.clearCart();
              close();
              toast.success(`Venta #${result.saleId} registrada`);
              window.location.hash = "#/home";
            } catch (err) {
              toast.error("Error al registrar venta");
              console.error(err);
            }
          }
        }
      ]
    });

    return modal;
  }

  renderProducts();
  renderCart();
  store.subscribe(() => renderCart());
  return wrapper;
}

posPage.title = "Nueva Venta";
