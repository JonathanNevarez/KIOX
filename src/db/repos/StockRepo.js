import { getDb } from "../sqlite/index.js";

export class StockRepo {
  constructor() {
    this.db = getDb();
  }

  createMovement(move) {
    this.db.exec(
      `INSERT INTO stock_movements (id, productId, type, qty, reason, createdAt)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [move.id, move.productId, move.type, move.qty, move.reason, move.createdAt]
    );
  }
}
