export function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n) => n.toString(16).padStart(2, "0");
  const parts = [...bytes].map(toHex).join("");
  return `${parts.slice(0, 8)}-${parts.slice(8, 12)}-${parts.slice(12, 16)}-${parts.slice(16, 20)}-${parts.slice(20)}`;
}
