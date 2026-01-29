import { getDb } from "../sqlite/index.js";

export class DebtRepo {
  constructor() {
    this.db = getDb();
  }

  listOpen() {
    return this.db.all(
      `SELECT d.*, s.total, s.paid
       FROM debts d
       JOIN sales s ON s.id = d.saleId
       ORDER BY d.createdAt DESC;`
    );
  }

  getById(id) {
    return this.db.get("SELECT * FROM debts WHERE id = ?;", [id]);
  }

  create(debt) {
    this.db.exec(
      `INSERT INTO debts (id, saleId, customerName, customerPhone, amount, createdAt)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        debt.id,
        debt.saleId,
        debt.customerName,
        debt.customerPhone || null,
        debt.amount,
        debt.createdAt
      ]
    );
    return debt.id;
  }

  updateAmount(id, amount) {
    this.db.exec("UPDATE debts SET amount = ? WHERE id = ?;", [amount, id]);
  }

  remove(id) {
    this.db.exec("DELETE FROM debts WHERE id = ?;", [id]);
  }
}
