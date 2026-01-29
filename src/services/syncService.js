import { OutboxRepo } from "../db/repos/OutboxRepo.js";
import { settingsService } from "./settingsService.js";

export const syncService = {
  getPendingEvents(limit = 50) {
    const repo = new OutboxRepo();
    return repo.listPending(limit);
  },
  preparePayload(events) {
    return {
      deviceId: settingsService.getDeviceId(),
      events: events.map((ev) => ({
        event_id: ev.event_id,
        event_type: ev.event_type,
        payload: JSON.parse(ev.payload),
        createdAt: ev.createdAt
      }))
    };
  },
  isOnline() {
    return navigator.onLine;
  }
};
