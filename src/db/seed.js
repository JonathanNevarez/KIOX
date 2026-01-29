import { getDb } from "./sqlite/index.js";
import { CategoryRepo } from "./repos/CategoryRepo.js";
import { ProductRepo } from "./repos/ProductRepo.js";

export async function seedDevData() {
  const db = getDb();
  const existing = db.get("SELECT COUNT(*) as count FROM categories;");
  if (existing?.count > 0) return;

  const categoryRepo = new CategoryRepo();
  const productRepo = new ProductRepo();

  const bebidas = categoryRepo.create({ name: "Bebidas" });
  const snacks = categoryRepo.create({ name: "Snacks" });
  const higiene = categoryRepo.create({ name: "Higiene" });

  productRepo.create({
    name: "Agua 600ml",
    categoryId: bebidas.id,
    priceSell: 1.25,
    stock: 45,
    barcode: "SKU-AG-600"
  });
  productRepo.create({
    name: "Soda Lata",
    categoryId: bebidas.id,
    priceSell: 1.5,
    stock: 20,
    barcode: "SKU-SD-330"
  });
  productRepo.create({
    name: "Papas clásicas",
    categoryId: snacks.id,
    priceSell: 1.2,
    stock: 18,
    barcode: "SKU-PP-CL"
  });
  productRepo.create({
    name: "Jabón neutro",
    categoryId: higiene.id,
    priceSell: 2.4,
    stock: 12,
    barcode: "SKU-JB-NT"
  });
}
