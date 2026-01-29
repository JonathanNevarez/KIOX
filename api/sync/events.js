import { getPool } from "../db.js";

async function applyCategoryCreated(pool, ev) {
  await pool.query(
    `INSERT INTO categories (id, name, "createdAt")
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING;`,
    [ev.id, ev.name, ev.createdAt || new Date().toISOString()]
  );
}

async function applyCategoryUpdated(pool, ev) {
  await pool.query(
    `UPDATE categories SET name = $2 WHERE id = $1;`,
    [ev.id, ev.name]
  );
}

async function applyCategoryDeleted(pool, ev) {
  await pool.query(`DELETE FROM categories WHERE id = $1;`, [ev.id]);
}

async function applyProductCreated(pool, ev) {
  await pool.query(
    `INSERT INTO products
      (id, name, "categoryId", "priceSell", stock, barcode, "imageUrl", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      "categoryId" = EXCLUDED."categoryId",
      "priceSell" = EXCLUDED."priceSell",
      stock = EXCLUDED.stock,
      barcode = EXCLUDED.barcode,
      "imageUrl" = EXCLUDED."imageUrl",
      "updatedAt" = EXCLUDED."updatedAt";`,
    [
      ev.id,
      ev.name,
      ev.categoryId,
      ev.priceSell,
      ev.stock || 0,
      ev.barcode || null,
      ev.imageUrl || null,
      ev.createdAt || new Date().toISOString(),
      ev.updatedAt || new Date().toISOString()
    ]
  );
}

async function applyProductUpdated(pool, ev) {
  await pool.query(
    `UPDATE products SET
      name = $2,
      "categoryId" = $3,
      "priceSell" = $4,
      stock = $5,
      barcode = $6,
      "imageUrl" = $7,
      "updatedAt" = $8
     WHERE id = $1;`,
    [
      ev.id,
      ev.name,
      ev.categoryId,
      ev.priceSell,
      ev.stock || 0,
      ev.barcode || null,
      ev.imageUrl || null,
      ev.updatedAt || new Date().toISOString()
    ]
  );
}

async function applyProductDeleted(pool, ev) {
  await pool.query(`DELETE FROM products WHERE id = $1;`, [ev.id]);
}

async function applySaleCreated(pool, ev) {
  const payment = ev.payment || {};
  const totals = ev.totals || {};
  await pool.query(
    `INSERT INTO sales
      (id, "createdAt", "customerName", "customerPhone", "paymentMethod", subtotal, total, paid, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING;`,
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
  for (const item of items) {
    await pool.query(
      `INSERT INTO sale_items
        (id, "saleId", "productId", qty, price, total)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING;`,
      [
        item.id,
        ev.saleId,
        item.productId,
        item.qty,
        item.price,
        item.total
      ]
    );

    await pool.query(
      `UPDATE products SET stock = stock - $2 WHERE id = $1;`,
      [item.productId, item.qty]
    );

    const movementId = `${ev.saleId}:${item.productId}:${item.id}`;
    await pool.query(
      `INSERT INTO stock_movements
        (id, "productId", type, qty, reason, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING;`,
      [
        movementId,
        item.productId,
        "out",
        item.qty,
        "sale",
        item.createdAt || new Date().toISOString()
      ]
    );
  }

  if (ev.balance > 0 && ev.debtId) {
    await pool.query(
      `INSERT INTO debts
        (id, "saleId", "customerName", "customerPhone", amount, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING;`,
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
}

async function applyDebtPayment(pool, ev) {
  const debtRes = await pool.query(`SELECT amount FROM debts WHERE id = $1;`, [
    ev.debtId
  ]);
  if (debtRes.rowCount === 0) return;
  const current = Number(debtRes.rows[0].amount || 0);
  const next = Math.max(current - Number(ev.amount || 0), 0);
  if (next === 0) {
    await pool.query(`DELETE FROM debts WHERE id = $1;`, [ev.debtId]);
  } else {
    await pool.query(`UPDATE debts SET amount = $2 WHERE id = $1;`, [
      ev.debtId,
      next
    ]);
  }
  await pool.query(`UPDATE sales SET paid = paid + $2 WHERE id = $1;`, [
    ev.saleId,
    ev.amount || 0
  ]);
}

async function applyStockMoved(pool, ev) {
  await pool.query(
    `INSERT INTO stock_movements
      (id, "productId", type, qty, reason, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING;`,
    [ev.id, ev.productId, ev.type, ev.qty, ev.reason, ev.createdAt]
  );
  if (ev.type === "in") {
    await pool.query(`UPDATE products SET stock = stock + $2 WHERE id = $1;`, [
      ev.productId,
      ev.qty
    ]);
  }
  if (ev.type === "out") {
    await pool.query(`UPDATE products SET stock = stock - $2 WHERE id = $1;`, [
      ev.productId,
      ev.qty
    ]);
  }
  if (ev.type === "adjust") {
    await pool.query(`UPDATE products SET stock = $2 WHERE id = $1;`, [
      ev.productId,
      ev.qty
    ]);
  }
}

async function applyEvent(pool, ev) {
  switch (ev.event_type) {
    case "category.created":
      return applyCategoryCreated(pool, ev);
    case "category.updated":
      return applyCategoryUpdated(pool, ev);
    case "category.deleted":
      return applyCategoryDeleted(pool, ev);
    case "product.created":
      return applyProductCreated(pool, ev);
    case "product.updated":
      return applyProductUpdated(pool, ev);
    case "product.deleted":
      return applyProductDeleted(pool, ev);
    case "sale.created":
      return applySaleCreated(pool, ev);
    case "debt.payment":
      return applyDebtPayment(pool, ev);
    case "stock.moved":
      return applyStockMoved(pool, ev);
    default:
      return null;
  }
}

export default async function handler(req, res) {
  const required = process.env.SYNC_API_KEY;
  if (required) {
    const provided =
      req.headers["x-api-key"] ||
      (req.query?.api_key ? String(req.query.api_key) : "");
    if (provided !== required) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { deviceId = null, events = [] } = req.body || {};
  if (!Array.isArray(events)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const pool = getPool();
  const accepted = [];
  const duplicated = [];
  const errored = [];

  try {
    await pool.query("BEGIN");
    for (const raw of events) {
      try {
        const payload =
          typeof raw.payload === "string" ? JSON.parse(raw.payload) : raw.payload;
        const event = { ...raw, ...payload };
        const result = await pool.query(
          `INSERT INTO outbox_events
            (event_id, event_type, payload, status, attempts, "createdAt", "lastError")
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (event_id) DO NOTHING;`,
          [
            raw.event_id,
            raw.event_type,
            payload,
            "RECEIVED",
            0,
            raw.createdAt || new Date().toISOString(),
            null
          ]
        );
        if (result.rowCount === 0) {
          duplicated.push(raw.event_id);
          continue;
        }
        await applyEvent(pool, event);
        accepted.push(raw.event_id);
      } catch (err) {
        errored.push(raw.event_id);
      }
    }
    await pool.query("COMMIT");
    res.status(200).json({ accepted, duplicated, errored, deviceId });
  } catch (err) {
    try {
      await pool.query("ROLLBACK");
    } catch {}
    res.status(500).json({ error: "Sync failed" });
  }
}
