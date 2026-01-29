import { getDb, withTransaction } from "../db/sqlite/index.js";
import { settingsService } from "../services/settingsService.js";
import { toast } from "../ui/components/toast.js";
import { showModal } from "../ui/components/modal.js";
import { el } from "../utils/dom.js";
import { nowIso } from "../utils/time.js";

export function settingsPage() {
  const wrapper = el("div", { class: "grid" });

  const deviceCard = el("div", { class: "card" }, [
    el("h3", {}, "Dispositivo"),
    el("div", {}, `DeviceId: ${settingsService.getDeviceId()}`)
  ]);

  const themeSelect = el("select", {}, [
    el("option", { value: "light" }, "Claro"),
    el("option", { value: "dark" }, "Oscuro")
  ]);
  themeSelect.value = settingsService.getTheme();
  themeSelect.addEventListener("change", () => {
    settingsService.setTheme(themeSelect.value);
    document.documentElement.setAttribute("data-theme", themeSelect.value);
  });

  const currencyInput = el("input", {
    value: settingsService.getCurrency()
  });

  const settingsCard = el("div", { class: "card form" }, [
    el("h3", {}, "Preferencias"),
    field("Moneda", currencyInput),
    field("Tema", themeSelect),
    el(
      "button",
      {
        class: "btn primary",
        onClick: () => {
          settingsService.setCurrency(currencyInput.value.trim() || "USD");
          toast.success("Preferencias guardadas");
        }
      },
      "Guardar"
    )
  ]);

  const exportButton = el(
    "button",
    {
      class: "btn secondary",
      onClick: () => exportBackup()
    },
    "Exportar respaldo"
  );

  const importInput = el("input", {
    type: "file",
    accept: "application/json",
    class: "hidden"
  });
  const importButton = el(
    "button",
    {
      class: "btn primary",
      onClick: () => importInput.click()
    },
    "Importar respaldo"
  );

  importInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!validateBackup(data)) {
        toast.error("Archivo inválido");
        return;
      }
      showModal({
        title: "Confirmar importación",
        content: el(
          "div",
          {},
          "La importación reemplazará los datos actuales."
        ),
        actions: [
          { label: "Cancelar", onClick: (close) => close() },
          {
            label: "Reemplazar",
            variant: "primary",
            onClick: async (close) => {
              await replaceData(data);
              document.documentElement.setAttribute(
                "data-theme",
                settingsService.getTheme()
              );
              toast.success("Datos importados");
              close();
            }
          }
        ]
      });
    } catch {
      toast.error("No se pudo leer el archivo");
    }
  });

  const backupCard = el("div", { class: "card form" }, [
    el("h3", {}, "Respaldo"),
    exportButton,
    importButton,
    importInput
  ]);

  const resetButton = el(
    "button",
    {
      class: "btn ghost",
      onClick: () => confirmReset()
    },
    "Reset local"
  );

  const resetCard = el("div", { class: "card form" }, [
    el("h3", {}, "Mantenimiento"),
    el(
      "div",
      { class: "muted" },
      "Elimina datos locales y reinicia la app."
    ),
    resetButton
  ]);

  wrapper.append(deviceCard, settingsCard, backupCard, resetCard);
  return wrapper;
}

settingsPage.title = "Settings";

function field(label, input) {
  return el("div", { class: "field" }, [el("label", {}, label), input]);
}

function exportBackup() {
  const db = getDb();
  const backup = {
    version: 1,
    createdAt: nowIso(),
    data: {
      categories: db.all("SELECT * FROM categories;"),
      products: db.all("SELECT * FROM products;"),
      sales: db.all("SELECT * FROM sales;"),
      sale_items: db.all("SELECT * FROM sale_items;"),
      stock_movements: db.all("SELECT * FROM stock_movements;"),
      debts: db.all("SELECT * FROM debts;"),
      settings: db.all("SELECT * FROM settings;"),
      outbox_events: db.all("SELECT * FROM outbox_events;")
    }
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kios-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function validateBackup(json) {
  return (
    json &&
    json.version === 1 &&
    json.data &&
    Array.isArray(json.data.categories) &&
    Array.isArray(json.data.products)
  );
}

async function replaceData(json) {
  const db = getDb();
  await withTransaction(async () => {
    db.exec("DELETE FROM sale_items;");
    db.exec("DELETE FROM sales;");
    db.exec("DELETE FROM debts;");
    db.exec("DELETE FROM stock_movements;");
    db.exec("DELETE FROM products;");
    db.exec("DELETE FROM categories;");
    db.exec("DELETE FROM outbox_events;");
    db.exec("DELETE FROM settings;");

    insertMany(db, "categories", json.data.categories, [
      "id",
      "name",
      "createdAt"
    ]);
    insertMany(db, "products", json.data.products, [
      "id",
      "name",
      "categoryId",
      "priceSell",
      "stock",
      "barcode",
      "imageUrl",
      "createdAt",
      "updatedAt"
    ]);
    insertMany(db, "sales", json.data.sales, [
      "id",
      "createdAt",
      "customerName",
      "customerPhone",
      "paymentMethod",
      "subtotal",
      "total",
      "paid",
      "notes"
    ]);
    insertMany(db, "sale_items", json.data.sale_items, [
      "id",
      "saleId",
      "productId",
      "qty",
      "price",
      "total"
    ]);
    insertMany(db, "stock_movements", json.data.stock_movements, [
      "id",
      "productId",
      "type",
      "qty",
      "reason",
      "createdAt"
    ]);
    insertMany(db, "debts", json.data.debts, [
      "id",
      "saleId",
      "customerName",
      "customerPhone",
      "amount",
      "createdAt"
    ]);
    insertMany(db, "settings", json.data.settings, ["key", "value"]);
    insertMany(db, "outbox_events", json.data.outbox_events || [], [
      "event_id",
      "event_type",
      "payload",
      "status",
      "attempts",
      "createdAt",
      "lastError"
    ]);
  });
}

function insertMany(db, table, rows, columns) {
  if (!rows?.length) return;
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders});`;
  rows.forEach((row) => {
    const values = columns.map((col) => row[col] ?? null);
    db.exec(sql, values);
  });
}

function confirmReset() {
  showModal({
    title: "Reset local",
    content: el(
      "div",
      {},
      "Se eliminarán los datos locales de esta app en el dispositivo."
    ),
    actions: [
      { label: "Cancelar", onClick: (close) => close() },
      {
        label: "Eliminar",
        variant: "primary",
        onClick: (close) => {
          localStorage.removeItem("kios_sqlite_v1");
          toast.success("Datos locales eliminados");
          close();
          window.location.reload();
        }
      }
    ]
  });
}
