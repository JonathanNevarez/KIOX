import { getDb } from "../sqlite/index.js";
import { nowIso } from "../../utils/time.js";
import { hashId } from "../../utils/hash.js";

export class CategoryRepo {
  constructor() {
    this.db = getDb();
  }

  list() {
    return this.db.all("SELECT * FROM categories ORDER BY name;");
  }

  getById(id) {
    return this.db.get("SELECT * FROM categories WHERE id = ?;", [id]);
  }

  create({ name }) {
    const createdAt = nowIso();
    const id = hashId(["category", name, createdAt]);
    this.db.exec("INSERT INTO categories (id, name, createdAt) VALUES (?, ?, ?);", [
      id,
      name,
      createdAt
    ]);
    this.db.persist();
    return this.getById(id);
  }

  update(id, { name }) {
    this.db.exec("UPDATE categories SET name = ? WHERE id = ?;", [name, id]);
    this.db.persist();
    return this.getById(id);
  }

  remove(id) {
    const count = this.db.get(
      "SELECT COUNT(*) as count FROM products WHERE categoryId = ?;",
      [id]
    );
    if (count?.count > 0) {
      return { ok: false, reason: "Categoria con productos" };
    }
    this.db.exec("DELETE FROM categories WHERE id = ?;", [id]);
    this.db.persist();
    return { ok: true };
  }
}
