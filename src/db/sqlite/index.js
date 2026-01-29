import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

const STORAGE_KEY = "kios_sqlite_v1";

let dbInstance = null;

function toBase64(u8) {
  let binary = "";
  for (let i = 0; i < u8.length; i += 1) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    u8[i] = binary.charCodeAt(i);
  }
  return u8;
}

class DbClient {
  constructor(db) {
    this.db = db;
    this.persistTimer = null;
  }

  exec(sql, params = []) {
    if (!params.length) {
      this.db.exec(sql);
      return;
    }
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      // consume
    }
    stmt.free();
  }

  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  get(sql, params = []) {
    const rows = this.all(sql, params);
    return rows[0] || null;
  }

  run(sql, params = []) {
    this.exec(sql, params);
    return this.get("SELECT last_insert_rowid() AS id;");
  }

  getUserVersion() {
    const row = this.get("PRAGMA user_version;");
    return row?.user_version || 0;
  }

  persist() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      const data = this.db.export();
      localStorage.setItem(STORAGE_KEY, toBase64(data));
    }, 150);
  }

  clearPersisted() {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export async function initDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs({
    locateFile: () => wasmUrl
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  const database = saved
    ? new SQL.Database(fromBase64(saved))
    : new SQL.Database();

  database.exec("PRAGMA foreign_keys = ON;");
  dbInstance = new DbClient(database);
  return dbInstance;
}

export function getDb() {
  if (!dbInstance) {
    throw new Error("DB not initialized");
  }
  return dbInstance;
}

export async function withTransaction(task) {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = await task(db);
    db.exec("COMMIT");
    db.persist();
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
