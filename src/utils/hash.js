import { settingsService } from "../services/settingsService.js";

function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = (hash >>> 0) * 0x01000193;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashId(parts) {
  const deviceId = settingsService.getDeviceId() || "device";
  const base = [deviceId, ...parts].join("|");
  return fnv1a(base);
}
