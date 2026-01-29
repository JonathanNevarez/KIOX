import schemaSql from "../schema.sql?raw";

const migrations = [
  {
    version: 1,
    up: (db) => {
      db.exec(schemaSql);
    }
  },
  {
    version: 2,
    up: (db) => {
      db.exec("DROP TABLE IF EXISTS sale_items;");
      db.exec("DROP TABLE IF EXISTS stock_movements;");
      db.exec("DROP TABLE IF EXISTS debts;");
      db.exec("DROP TABLE IF EXISTS sales;");
      db.exec("DROP TABLE IF EXISTS products;");
      db.exec("DROP TABLE IF EXISTS categories;");
      db.exec("DROP TABLE IF EXISTS settings;");
      db.exec("DROP TABLE IF EXISTS outbox_events;");
      db.exec(schemaSql);
    }
  }
];

export async function applyMigrations(db) {
  const current = db.getUserVersion();
  const pending = migrations.filter((m) => m.version > current);
  for (const migration of pending) {
    db.exec("BEGIN");
    try {
      migration.up(db);
      db.exec(`PRAGMA user_version = ${migration.version};`);
      db.exec("COMMIT");
      db.persist();
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}
