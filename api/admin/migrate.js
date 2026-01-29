import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPool } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requireApiKey(req, res) {
  const required = process.env.SYNC_API_KEY;
  if (!required) return true;
  const provided =
    req.headers["x-api-key"] ||
    (req.query?.api_key ? String(req.query.api_key) : "");
  if (provided !== required) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireApiKey(req, res)) return;

  try {
    const sql = fs.readFileSync(path.join(__dirname, "../schema.pg.sql"), "utf8");
    const pool = getPool();
    await pool.query("BEGIN");
    await pool.query(sql);
    await pool.query("COMMIT");
    res.status(200).json({ ok: true });
  } catch (err) {
    try {
      const pool = getPool();
      await pool.query("ROLLBACK");
    } catch {}
    res.status(500).json({ error: "Migration failed" });
  }
}
