import { getDb } from "../sqlite/index.js";
import { nowIso } from "../../utils/time.js";
import { hashId } from "../../utils/hash.js";

const LOW_STOCK_THRESHOLD = 5;

export class ProductRepo {
  constructor() {
    this.db = getDb();
  }

  list() {
    return this.db.all(
      `SELECT p.*, c.name as categoryName
       FROM products p
       JOIN categories c ON c.id = p.categoryId
       ORDER BY p.name;`
    );
  }

  listLowStock(limit = 5) {
    return this.db.all(
      `SELECT p.*, c.name as categoryName
       FROM products p
       JOIN categories c ON c.id = p.categoryId
       WHERE p.stock <= ?
       ORDER BY p.stock ASC
       LIMIT ?;`,
      [LOW_STOCK_THRESHOLD, limit]
    );
  }

  getById(id) {
    return this.db.get("SELECT * FROM products WHERE id = ?;", [id]);
  }

  create(data) {
    const createdAt = nowIso();
    const updatedAt = createdAt;
    const exists = this.db.get("SELECT id FROM categories WHERE id = ?;", [
      data.categoryId
    ]);
    if (!exists) {
      throw new Error("Categoría no encontrada");
    }
    const id = hashId(["product", data.name, createdAt]);
    this.db.exec(
      `INSERT INTO products
        (id, name, categoryId, priceSell, stock, barcode, imageUrl, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.name,
        data.categoryId,
        data.priceSell,
        data.stock || 0,
        data.barcode || null,
        data.imageUrl || null,
        createdAt,
        updatedAt
      ]
    );
    this.db.persist();
    return this.getById(id);
  }

  update(id, data) {
    const updatedAt = nowIso();
    const exists = this.db.get("SELECT id FROM categories WHERE id = ?;", [
      data.categoryId
    ]);
    if (!exists) {
      throw new Error("Categoría no encontrada");
    }
    this.db.exec(
      `UPDATE products
       SET name = ?, categoryId = ?, priceSell = ?, stock = ?, barcode = ?, imageUrl = ?, updatedAt = ?
       WHERE id = ?;`,
      [
        data.name,
        data.categoryId,
        data.priceSell,
        data.stock || 0,
        data.barcode || null,
        data.imageUrl || null,
        updatedAt,
        id
      ]
    );
    this.db.persist();
    return this.getById(id);
  }

  updateStock(id, stock) {
    this.db.exec("UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?;", [
      stock,
      nowIso(),
      id
    ]);
  }

  remove(id) {
    this.db.exec("DELETE FROM products WHERE id = ?;", [id]);
    this.db.persist();
  }
}
