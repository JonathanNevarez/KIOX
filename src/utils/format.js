export function formatMoney(value, currency = "USD") {
  const number = Number(value || 0);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(number);
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
