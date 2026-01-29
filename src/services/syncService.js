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
    if ((counts?.categories || 0) > 0 || (counts?.products || 0) > 0 || (counts?.sales || 0) > 0) {
      return;
    }
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
        insertMany(db, "categories", data.categories || [], [
          "id",
          "name",
          "createdAt"
        ]);
        insertMany(db, "products", data.products || [], [
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
        insertMany(db, "sales", data.sales || [], [
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
        insertMany(db, "sale_items", data.sale_items || [], [
          "id",
          "saleId",
          "productId",
          "qty",
          "price",
          "total"
        ]);
        insertMany(db, "stock_movements", data.stock_movements || [], [
          "id",
          "productId",
          "type",
          "qty",
          "reason",
          "createdAt"
        ]);
        insertMany(db, "debts", data.debts || [], [
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
  start() {
    this.bootstrapIfEmpty();
    this.sendPending();
    setInterval(() => this.sendPending(), 30000);
  }
};

function insertMany(db, table, rows, columns) {
  if (!rows?.length) return;
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders});`;
  rows.forEach((row) => {
    const values = columns.map((col) => row[col] ?? null);
    db.exec(sql, values);
  });
}
