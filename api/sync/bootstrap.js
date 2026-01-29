import { getPool } from "../db.js";

export default async function handler(req, res) {
  const required = process.env.SYNC_API_KEY;
  if (required) {
    const provided =
      req.headers["x-api-key"] ||
      (req.query?.api_key ? String(req.query.api_key) : "");
    if (provided !== required) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const pool = getPool();
    const categories = await pool.query("SELECT * FROM categories;");
    const products = await pool.query("SELECT * FROM products;");
    const sales = await pool.query("SELECT * FROM sales;");
    const saleItems = await pool.query("SELECT * FROM sale_items;");
    const stockMovements = await pool.query("SELECT * FROM stock_movements;");
    const debts = await pool.query("SELECT * FROM debts;");
    res.status(200).json({
      categories: categories.rows,
      products: products.rows,
      sales: sales.rows,
      sale_items: saleItems.rows,
      stock_movements: stockMovements.rows,
      debts: debts.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Bootstrap failed" });
  }
}
