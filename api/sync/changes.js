import { getPool } from "../db.js";

export default async function handler(req, res) {
  const required = process.env.SYNC_API_KEY;
  if (required) {
    const provided =
      req.headers["x-api-key"] ||
      (req.query?.api_key ? String(req.query.api_key) : "");
    if (provided !== required) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const since = String(req.query?.since || "1970-01-01T00:00:00.000Z");
  const deviceId = String(req.query?.deviceId || "");

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT event_id, event_type, payload, "createdAt", device_id
       FROM outbox_events
       WHERE "createdAt" > $1
         AND ($2 = '' OR device_id IS NULL OR device_id <> $2)
       ORDER BY "createdAt" ASC
       LIMIT 500;`,
      [since, deviceId]
    );
    res.status(200).json({
      events: result.rows,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: "Changes failed" });
  }
}
