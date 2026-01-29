PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  categoryId TEXT NOT NULL,
  priceSell REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  barcode TEXT,
  imageUrl TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  customerName TEXT,
  customerPhone TEXT,
  paymentMethod TEXT NOT NULL,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  paid REAL NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  saleId TEXT NOT NULL,
  productId TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  total REAL NOT NULL,
  FOREIGN KEY (saleId) REFERENCES sales(id),
  FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  type TEXT NOT NULL,
  qty INTEGER NOT NULL,
  reason TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  saleId TEXT NOT NULL,
  customerName TEXT NOT NULL,
  customerPhone TEXT,
  amount REAL NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (saleId) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  lastError TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryId);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(createdAt);
CREATE INDEX IF NOT EXISTS idx_debts_sale ON debts(saleId);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_events(status);
