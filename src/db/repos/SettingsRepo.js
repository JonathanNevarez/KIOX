import { getDb } from "../sqlite/index.js";

export class SettingsRepo {
  constructor() {
    this.db = getDb();
  }

  get(key) {
    const row = this.db.get("SELECT value FROM settings WHERE key = ?;", [key]);
    return row ? row.value : null;
  }

  set(key, value) {
    const exists = this.db.get("SELECT key FROM settings WHERE key = ?;", [key]);
    if (exists) {
      this.db.exec("UPDATE settings SET value = ? WHERE key = ?;", [value, key]);
    } else {
      this.db.exec("INSERT INTO settings (key, value) VALUES (?, ?);", [
        key,
        value
      ]);
    }
    this.db.persist();
  }
}
