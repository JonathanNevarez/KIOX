export function required(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function positiveNumber(value) {
  return Number(value) > 0;
}

export function nonNegative(value) {
  return Number(value) >= 0;
}

export function validateProduct(data) {
  const errors = {};
  if (!required(data.name)) errors.name = "Nombre requerido";
  if (!required(data.categoryId)) errors.categoryId = "Categoría requerida";
  if (!positiveNumber(data.priceSell))
    errors.priceSell = "Precio de venta inválido";
  if (!nonNegative(data.stock)) errors.stock = "Stock inválido";
  return errors;
}

export function validateCategory(data) {
  const errors = {};
  if (!required(data.name)) errors.name = "Nombre requerido";
  return errors;
}

export function validateCheckout(data) {
  const errors = {};
  if (!required(data.paymentMethod))
    errors.paymentMethod = "Método requerido";
  if (
    data.paymentMethod !== "cash" &&
    data.paymentMethod !== "transfer" &&
    data.paymentMethod !== "credit"
  ) {
    errors.paymentMethod = "Método inválido";
  }
  if ((data.paymentMethod === "credit" || data.partial) && !required(data.customerName)) {
    errors.customerName = "Cliente requerido";
  }
  if (Number(data.paid) < 0) {
    errors.paid = "Pago inválido";
  }
  return errors;
}
