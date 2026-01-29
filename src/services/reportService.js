import { getDb } from "../db/sqlite/index.js";
import { ProductRepo } from "../db/repos/ProductRepo.js";
import { todayIsoDate } from "../utils/time.js";

export const reportService = {
  getDashboardMetrics() {
    const db = getDb();
    const today = todayIsoDate();
    const salesToday = db.get(
      "SELECT COUNT(*) as count FROM sales WHERE substr(createdAt, 1, 10) = ?;",
      [today]
    );
    const totalPaid = db.get(
      "SELECT COALESCE(SUM(paid), 0) as total FROM sales WHERE substr(createdAt, 1, 10) = ?;",
      [today]
    );
    const totalDebt = db.get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM debts;",
      []
    );
    const totalProducts = db.get(
      "SELECT COUNT(*) as count FROM products;",
      []
    );
    const lowStock = new ProductRepo().listLowStock(5);
    return {
      salesToday: salesToday?.count || 0,
      totalPaid: totalPaid?.total || 0,
      totalDebt: totalDebt?.total || 0,
      totalProducts: totalProducts?.count || 0,
      lowStock
    };
  }
};
