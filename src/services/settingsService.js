import { SettingsRepo } from "../db/repos/SettingsRepo.js";
import { uuid } from "../utils/uuid.js";

let repo = null;

function getRepo() {
  if (!repo) repo = new SettingsRepo();
  return repo;
}

export const settingsService = {
  async ensureDefaults() {
    const r = getRepo();
    if (!r.get("deviceId")) {
      r.set("deviceId", uuid());
    }
    if (!r.get("currency")) {
      r.set("currency", "USD");
    }
    if (!r.get("theme")) {
      r.set("theme", "light");
    }
  },
  getDeviceId() {
    return getRepo().get("deviceId");
  },
  getCurrency() {
    return getRepo().get("currency") || "USD";
  },
  setCurrency(value) {
    getRepo().set("currency", value);
  },
  getTheme() {
    return getRepo().get("theme") || "light";
  },
  setTheme(value) {
    getRepo().set("theme", value);
  },
  getSyncKey() {
    return getRepo().get("syncKey") || "";
  },
  setSyncKey(value) {
    getRepo().set("syncKey", value);
  },
  getLastSyncAt() {
    return getRepo().get("lastSyncAt") || "";
  },
  setLastSyncAt(value) {
    getRepo().set("lastSyncAt", value);
  }
};
