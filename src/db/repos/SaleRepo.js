import { getDb } from "../sqlite/index.js";

export class SaleRepo {
  constructor() {
    this.db = getDb();
  }

  list() {
    return this.db.all(
      `SELECT s.*,
        CASE
          WHEN s.paid >= s.total THEN 'Pagado'
          WHEN s.paid > 0 THEN 'Parcial'
          ELSE 'Crédito'
        END as status
       FROM sales s
       ORDER BY s.createdAt DESC;`
    );
  }

  getById(id) {
    return this.db.get("SELECT * FROM sales WHERE id = ?;", [id]);
  }

  create(sale) {
    this.db.exec(
      `INSERT INTO sales
        (id, createdAt, customerName, customerPhone, paymentMethod, subtotal, total, paid, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        sale.id,
        sale.createdAt,
        sale.customerName || null,
        sale.customerPhone || null,
        sale.paymentMethod,
        sale.subtotal,
        sale.total,
        sale.paid,
        sale.notes || null
      ]
    );
    return sale.id;
  }

  updatePaid(id, paid) {
    this.db.exec("UPDATE sales SET paid = ? WHERE id = ?;", [paid, id]);
  }
}
