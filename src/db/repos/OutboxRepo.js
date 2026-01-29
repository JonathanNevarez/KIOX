import { getDb } from "../sqlite/index.js";

export class OutboxRepo {
  constructor() {
    this.db = getDb();
  }

  listPending(limit = 50) {
    return this.db.all(
      `SELECT * FROM outbox_events
       WHERE status = 'PENDING'
       ORDER BY createdAt ASC
       LIMIT ?;`,
      [limit]
    );
  }

  create(event) {
    this.db.exec(
      `INSERT INTO outbox_events
        (event_id, event_type, payload, status, attempts, createdAt, lastError)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        event.event_id,
        event.event_type,
        event.payload,
        event.status || "PENDING",
        event.attempts || 0,
        event.createdAt,
        event.lastError || null
      ]
    );
  }

  markDone(eventId) {
    this.db.exec(
      "UPDATE outbox_events SET status = 'DONE' WHERE event_id = ?;",
      [eventId]
    );
  }

  markError(eventId, error) {
    this.db.exec(
      `UPDATE outbox_events
       SET status = 'ERROR', attempts = attempts + 1, lastError = ?
       WHERE event_id = ?;`,
      [error, eventId]
    );
  }
}
