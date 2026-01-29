import { OutboxRepo } from "../db/repos/OutboxRepo.js";
import { settingsService } from "./settingsService.js";
import { logger } from "../utils/logger.js";
import { getDb, withTransaction } from "../db/sqlite/index.js";

export const syncService = {
  getPendingEvents(limit = 50) {
    const repo = new OutboxRepo();
    return repo.listPending(limit);
  },
  preparePayload(events) {
    return {
      deviceId: settingsService.getDeviceId(),
      events: events.map((ev) => ({
        event_id: ev.event_id,
        event_type: ev.event_type,
        payload: JSON.parse(ev.payload),
        createdAt: ev.createdAt
      }))
    };
  },
  isOnline() {
    return navigator.onLine;
  },
  async sendPending() {
    if (!this.isOnline()) return;
    const repo = new OutboxRepo();
    const events = repo.listPending(50);
    if (!events.length) return;
    const payload = this.preparePayload(events);
    const headers = {
      "Content-Type": "application/json"
    };
    const syncKey = settingsService.getSyncKey();
    if (syncKey) headers["x-api-key"] = syncKey;
    try {
      const res = await fetch("/api/sync/events", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        logger.warn("Sync failed", res.status);
        return;
      }
      const result = await res.json();
      (result.accepted || []).forEach((id) => repo.markDone(id));
      (result.duplicated || []).forEach((id) => repo.markDone(id));
      (result.errored || []).forEach((id) =>
        repo.markError(id, "server-error")
      );
    } catch (err) {
      logger.warn("Sync error", err);
    }
  },
  async bootstrapIfEmpty() {
    if (!this.isOnline()) return;
    const db = getDb();
    const counts = db.get(
      "SELECT (SELECT COUNT(*) FROM categories) as categories, (SELECT COUNT(*) FROM products) as products, (SELECT COUNT(*) FROM sales) as sales;"
    );
    if (
      (counts?.categories || 0) > 0 ||
      (counts?.products || 0) > 0 ||
      (counts?.sales || 0) > 0
    ) {
      return;
    }
    await this.pullAll();
  },
  async pullAll() {
    if (!this.isOnline()) return;
    const db = getDb();
    const headers = { "Content-Type": "application/json" };
    const syncKey = settingsService.getSyncKey();
    if (syncKey) headers["x-api-key"] = syncKey;
    try {
      const res = await fetch("/api/sync/bootstrap", { headers });
      if (!res.ok) {
        logger.warn("Bootstrap failed", res.status);
        return;
      }
      const data = await res.json();
      await withTransaction(async () => {
        upsertMany(db, "categories", data.categories || [], [
          "id",
          "name",
          "createdAt"
        ]);
        upsertMany(db, "products", data.products || [], [
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
        upsertMany(db, "sales", data.sales || [], [
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
        upsertMany(db, "sale_items", data.sale_items || [], [
          "id",
          "saleId",
          "productId",
          "qty",
          "price",
          "total"
        ]);
        upsertMany(db, "stock_movements", data.stock_movements || [], [
          "id",
          "productId",
          "type",
          "qty",
          "reason",
          "createdAt"
        ]);
        upsertMany(db, "debts", data.debts || [], [
          "id",
          "saleId",
          "customerName",
          "customerPhone",
          "amount",
          "createdAt"
        ]);
      });
    } catch (err) {
      logger.warn("Bootstrap error", err);
    }
  },
  async pullChanges() {
    if (!this.isOnline()) return;
    const db = getDb();
    const headers = { "Content-Type": "application/json" };
    const syncKey = settingsService.getSyncKey();
    if (syncKey) headers["x-api-key"] = syncKey;
    const since = settingsService.getLastSyncAt() || "1970-01-01T00:00:00.000Z";
    const deviceId = settingsService.getDeviceId();
    try {
      const url = `/api/sync/changes?since=${encodeURIComponent(
        since
      )}&deviceId=${encodeURIComponent(deviceId)}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        logger.warn("Changes failed", res.status);
        return;
      }
      const data = await res.json();
      const events = data.events || [];
      if (!events.length) {
        if (data.serverTime) settingsService.setLastSyncAt(data.serverTime);
        return;
      }
      await withTransaction(async () => {
        for (const ev of events) {
          const payload =
            typeof ev.payload === "string" ? JSON.parse(ev.payload) : ev.payload;
          await applyEventLocal(db, { ...payload, event_type: ev.event_type });
        }
      });
      const lastCreatedAt = events[events.length - 1].createdAt;
      settingsService.setLastSyncAt(lastCreatedAt || data.serverTime || since);
    } catch (err) {
      logger.warn("Changes error", err);
    }
  },
  start() {
    this.bootstrapIfEmpty();
    this.sendPending();
    this.pullAll();
    this.pullChanges();
    setInterval(() => {
      this.sendPending();
      this.pullChanges();
    }, 30000);
  }
};

function upsertMany(db, table, rows, columns) {
  if (!rows?.length) return;
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(",")}) VALUES (${placeholders});`;
  rows.forEach((row) => {
    const values = columns.map((col) => row[col] ?? null);
    db.exec(sql, values);
  });
}

async function applyEventLocal(db, ev) {
  switch (ev.event_type) {
    case "category.created":
      db.exec(
        `INSERT OR REPLACE INTO categories (id, name, createdAt) VALUES (?, ?, ?);`,
        [ev.id, ev.name, ev.createdAt || new Date().toISOString()]
      );
      return;
    case "category.updated":
      db.exec(`UPDATE categories SET name = ? WHERE id = ?;`, [ev.name, ev.id]);
      return;
    case "category.deleted":
      db.exec(`DELETE FROM categories WHERE id = ?;`, [ev.id]);
      return;
    case "product.created":
    case "product.updated":
      db.exec(
        `INSERT OR REPLACE INTO products
          (id, name, categoryId, priceSell, stock, barcode, imageUrl, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ev.id,
          ev.name,
          ev.categoryId,
          ev.priceSell,
          ev.stock || 0,
          ev.barcode || null,
          ev.imageUrl || null,
          ev.createdAt || ev.updatedAt || new Date().toISOString(),
          ev.updatedAt || new Date().toISOString()
        ]
      );
      return;
    case "product.deleted":
      db.exec(`DELETE FROM products WHERE id = ?;`, [ev.id]);
      return;
    case "sale.created": {
      const exists = db.get("SELECT id FROM sales WHERE id = ?;", [ev.saleId]);
      if (exists) return;
      const payment = ev.payment || {};
      const totals = ev.totals || {};
      db.exec(
        `INSERT INTO sales
          (id, createdAt, customerName, customerPhone, paymentMethod, subtotal, total, paid, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ev.saleId,
          ev.saleCreatedAt || new Date().toISOString(),
          payment.customerName || null,
          payment.customerPhone || null,
          payment.paymentMethod,
          totals.subtotal || 0,
          totals.total || 0,
          totals.paid || 0,
          payment.notes || null
        ]
      );
      const items = ev.items || [];
      items.forEach((item) => {
        db.exec(
          `INSERT OR IGNORE INTO sale_items
            (id, saleId, productId, qty, price, total)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [
            item.id,
            ev.saleId,
            item.productId,
            item.qty,
            item.price,
            item.total
          ]
        );
        db.exec(`UPDATE products SET stock = stock - ? WHERE id = ?;`, [
          item.qty,
          item.productId
        ]);
        const movementId = `${ev.saleId}:${item.productId}:${item.id}`;
        db.exec(
          `INSERT OR IGNORE INTO stock_movements
            (id, productId, type, qty, reason, createdAt)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [
            movementId,
            item.productId,
            "out",
            item.qty,
            "sale",
            item.createdAt || new Date().toISOString()
          ]
        );
      });
      if (ev.balance > 0 && ev.debtId) {
        db.exec(
          `INSERT OR IGNORE INTO debts
            (id, saleId, customerName, customerPhone, amount, createdAt)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [
            ev.debtId,
            ev.saleId,
            payment.customerName || "",
            payment.customerPhone || null,
            ev.balance,
            ev.saleCreatedAt || new Date().toISOString()
          ]
        );
      }
      return;
    }
    case "debt.payment": {
      const row = db.get("SELECT amount FROM debts WHERE id = ?;", [ev.debtId]);
      if (!row) return;
      const current = Number(row.amount || 0);
      const next = Math.max(current - Number(ev.amount || 0), 0);
      if (next === 0) {
        db.exec("DELETE FROM debts WHERE id = ?;", [ev.debtId]);
      } else {
        db.exec("UPDATE debts SET amount = ? WHERE id = ?;", [
          next,
          ev.debtId
        ]);
      }
      db.exec("UPDATE sales SET paid = paid + ? WHERE id = ?;", [
        ev.amount || 0,
        ev.saleId
      ]);
      return;
    }
    case "stock.moved": {
      db.exec(
        `INSERT OR IGNORE INTO stock_movements
          (id, productId, type, qty, reason, createdAt)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [ev.id, ev.productId, ev.type, ev.qty, ev.reason, ev.createdAt]
      );
      if (ev.type === "in") {
        db.exec("UPDATE products SET stock = stock + ? WHERE id = ?;", [
          ev.qty,
          ev.productId
        ]);
      }
      if (ev.type === "out") {
        db.exec("UPDATE products SET stock = stock - ? WHERE id = ?;", [
          ev.qty,
          ev.productId
        ]);
      }
      if (ev.type === "adjust") {
        db.exec("UPDATE products SET stock = ? WHERE id = ?;", [
          ev.qty,
          ev.productId
        ]);
      }
      return;
    }
    default:
      return;
  }
}
