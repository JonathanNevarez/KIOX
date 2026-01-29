import { withTransaction } from "../db/sqlite/index.js";
import { ProductRepo } from "../db/repos/ProductRepo.js";
import { StockRepo } from "../db/repos/StockRepo.js";
import { OutboxRepo } from "../db/repos/OutboxRepo.js";
import { nowIso } from "../utils/time.js";
import { hashId } from "../utils/hash.js";

export const inventoryService = {
  async moveStock({ productId, type, qty, reason }) {
    const productRepo = new ProductRepo();
    const stockRepo = new StockRepo();
    const outboxRepo = new OutboxRepo();
    const product = productRepo.getById(productId);
    if (!product) throw new Error("Producto no encontrado");

    let newStock = product.stock;
    if (type === "in") newStock += qty;
    if (type === "out") newStock -= qty;
    if (type === "adjust") newStock = qty;
    if (newStock < 0) throw new Error("Stock negativo no permitido");

    await withTransaction(async () => {
      const moveCreatedAt = nowIso();
      productRepo.updateStock(productId, newStock);
      stockRepo.createMovement({
        id: hashId(["stock_move", productId, moveCreatedAt]),
        productId,
        type,
        qty,
        reason,
        createdAt: moveCreatedAt
      });
      const eventCreatedAt = nowIso();
      outboxRepo.create({
        event_id: hashId(["outbox", "stock.moved", productId, eventCreatedAt]),
        event_type: "stock.moved",
        payload: JSON.stringify({
          id: hashId(["stock_move", productId, moveCreatedAt]),
          productId,
          type,
          qty,
          reason,
          createdAt: moveCreatedAt
        }),
        status: "PENDING",
        createdAt: eventCreatedAt
      });
    });
  }
};
