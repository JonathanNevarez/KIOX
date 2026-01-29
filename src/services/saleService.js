import { withTransaction } from "../db/sqlite/index.js";
import { ProductRepo } from "../db/repos/ProductRepo.js";
import { SaleRepo } from "../db/repos/SaleRepo.js";
import { SaleItemRepo } from "../db/repos/SaleItemRepo.js";
import { StockRepo } from "../db/repos/StockRepo.js";
import { DebtRepo } from "../db/repos/DebtRepo.js";
import { OutboxRepo } from "../db/repos/OutboxRepo.js";
import { nowIso } from "../utils/time.js";
import { hashId } from "../utils/hash.js";

export const saleService = {
  async validateStock(items) {
    const productRepo = new ProductRepo();
    const errors = [];
    for (const item of items) {
      const product = productRepo.getById(item.productId);
      if (!product || product.stock < item.qty) {
        errors.push({
          productId: item.productId,
          message: "Stock insuficiente"
        });
      }
    }
    return errors;
  },

  calculateTotals(items) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const total = subtotal;
    return { subtotal, total };
  },

  async createSale({ items, payment }) {
    const productRepo = new ProductRepo();
    const saleRepo = new SaleRepo();
    const saleItemRepo = new SaleItemRepo();
    const stockRepo = new StockRepo();
    const debtRepo = new DebtRepo();
    const outboxRepo = new OutboxRepo();

    const { subtotal, total } = this.calculateTotals(items);
    let paid =
      payment.paymentMethod === "credit" ? 0 : Number(payment.paid || 0);
    paid = Math.min(paid, total);
    const balance = total - paid;

    const saleCreatedAt = nowIso();
    const saleId = hashId(["sale", payment.customerName || "cash", saleCreatedAt]);
    const eventItems = [];
    let debtId = null;
    const saleIdFinal = await withTransaction(async () => {
      const saleIdInner = saleRepo.create({
        id: saleId,
        createdAt: saleCreatedAt,
        customerName: payment.customerName || null,
        customerPhone: payment.customerPhone || null,
        paymentMethod: payment.paymentMethod,
        subtotal,
        total,
        paid,
        notes: payment.notes || null
      });

      for (const item of items) {
        const itemCreatedAt = nowIso();
        const itemId = hashId(["sale_item", saleIdInner, item.productId, itemCreatedAt]);
        saleItemRepo.create({
          id: itemId,
          saleId: saleIdInner,
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          total: item.price * item.qty
        });
        eventItems.push({
          id: itemId,
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          price: item.price,
          total: item.price * item.qty,
          createdAt: itemCreatedAt
        });

        const product = productRepo.getById(item.productId);
        productRepo.updateStock(item.productId, product.stock - item.qty);
        const moveCreatedAt = nowIso();
        stockRepo.createMovement({
          id: hashId(["stock_move", item.productId, moveCreatedAt]),
          productId: item.productId,
          type: "out",
          qty: item.qty,
          reason: "sale",
          createdAt: moveCreatedAt
        });
      }

      if (balance > 0) {
        const debtCreatedAt = nowIso();
        debtId = hashId(["debt", saleIdInner, debtCreatedAt]);
        debtRepo.create({
          id: debtId,
          saleId: saleIdInner,
          customerName: payment.customerName,
          customerPhone: payment.customerPhone || null,
          amount: balance,
          createdAt: debtCreatedAt
        });
      }

      const eventCreatedAt = nowIso();
      outboxRepo.create({
        event_id: hashId(["outbox", "sale.created", saleIdInner, eventCreatedAt]),
        event_type: "sale.created",
        payload: JSON.stringify({
          saleId: saleIdInner,
          saleCreatedAt,
          items: eventItems,
          payment,
          totals: { subtotal, total, paid },
          balance,
          debtId
        }),
        status: "PENDING",
        createdAt: eventCreatedAt
      });

      return saleIdInner;
    });

    return { saleId: saleIdFinal, balance };
  },

  async registerDebtPayment({ debtId, amount }) {
    const debtRepo = new DebtRepo();
    const saleRepo = new SaleRepo();
    const outboxRepo = new OutboxRepo();
    const debt = debtRepo.getById(debtId);
    if (!debt) throw new Error("Deuda no encontrada");

    const newAmount = Math.max(debt.amount - amount, 0);
    await withTransaction(async () => {
      if (newAmount === 0) {
        debtRepo.remove(debtId);
      } else {
        debtRepo.updateAmount(debtId, newAmount);
      }
      const sale = saleRepo.getById(debt.saleId);
      const paid = Math.min(sale.paid + amount, sale.total);
      saleRepo.updatePaid(sale.id, paid);

      const eventCreatedAt = nowIso();
      outboxRepo.create({
        event_id: hashId(["outbox", "debt.payment", debtId, eventCreatedAt]),
        event_type: "debt.payment",
        payload: JSON.stringify({
          debtId,
          saleId: sale.id,
          amount
        }),
        status: "PENDING",
        createdAt: eventCreatedAt
      });
    });
    return { newAmount };
  }
};
