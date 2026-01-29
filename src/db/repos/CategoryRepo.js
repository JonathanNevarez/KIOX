import { getDb } from "../sqlite/index.js";
import { nowIso } from "../../utils/time.js";
import { hashId } from "../../utils/hash.js";
import { OutboxRepo } from "./OutboxRepo.js";

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
    const outbox = new OutboxRepo();
    outbox.create({
      event_id: hashId(["outbox", "category.created", id, createdAt]),
      event_type: "category.created",
      payload: JSON.stringify({ id, name, createdAt }),
      status: "PENDING",
      createdAt
    });
    this.db.persist();
    return this.getById(id);
  }

  update(id, { name }) {
    const updatedAt = nowIso();
    this.db.exec("UPDATE categories SET name = ? WHERE id = ?;", [name, id]);
    const outbox = new OutboxRepo();
    outbox.create({
      event_id: hashId(["outbox", "category.updated", id, updatedAt]),
      event_type: "category.updated",
      payload: JSON.stringify({ id, name, updatedAt }),
      status: "PENDING",
      createdAt: updatedAt
    });
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
    const removedAt = nowIso();
    const outbox = new OutboxRepo();
    outbox.create({
      event_id: hashId(["outbox", "category.deleted", id, removedAt]),
      event_type: "category.deleted",
      payload: JSON.stringify({ id, deletedAt: removedAt }),
      status: "PENDING",
      createdAt: removedAt
    });
    this.db.persist();
    return { ok: true };
  }
}
