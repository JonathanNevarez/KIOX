import { getDb } from "../sqlite/index.js";

export class SaleItemRepo {
  constructor() {
    this.db = getDb();
  }

  listBySaleId(saleId) {
    return this.db.all(
      `SELECT si.*, p.name as productName
       FROM sale_items si
       JOIN products p ON p.id = si.productId
       WHERE si.saleId = ?;`,
      [saleId]
    );
  }

  create(item) {
    this.db.exec(
      `INSERT INTO sale_items (id, saleId, productId, qty, price, total)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [item.id, item.saleId, item.productId, item.qty, item.price, item.total]
    );
  }
}
