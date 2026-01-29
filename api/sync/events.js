export default function handler(req, res) {
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
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { events = [] } = req.body || {};
  res.status(200).json({
    accepted: events.map((e) => e.event_id),
    duplicated: [],
    errored: []
  });
}
