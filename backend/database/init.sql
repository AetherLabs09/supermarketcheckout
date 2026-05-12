CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT '个',
  cost_price REAL DEFAULT 0,
  sale_price REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_no TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  member_id INTEGER,
  payment_method TEXT NOT NULL,
  total_amount REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  final_amount REAL NOT NULL,
  received_amount REAL,
  change_amount REAL DEFAULT 0,
  round_type TEXT DEFAULT 'none',
  status TEXT DEFAULT 'completed',
  cashier_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  before_stock INTEGER NOT NULL,
  after_stock INTEGER NOT NULL,
  operator_id INTEGER NOT NULL,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS member_points_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  balance REAL DEFAULT 0,
  operator_id INTEGER NOT NULL,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

INSERT OR IGNORE INTO products (barcode, name, category, unit, cost_price, sale_price, stock, min_stock) VALUES 
('6901234567890', '可口可乐330ml', '饮料', '瓶', 2.00, 3.00, 200, 50),
('6901234567891', '农夫山泉550ml', '饮料', '瓶', 1.00, 2.00, 300, 100),
('6901234567892', '康师傅红烧牛肉面', '食品', '袋', 2.50, 4.50, 150, 30),
('6901234567893', '旺旺雪饼', '零食', '袋', 3.00, 5.50, 100, 20),
('6901234567894', '德芙巧克力', '零食', '盒', 15.00, 28.00, 50, 10),
('6901234567895', '清风抽纸', '日用品', '包', 8.00, 15.00, 80, 20),
('6901234567896', '高露洁牙膏', '日用品', '支', 8.00, 15.00, 60, 15),
('6901234567897', '海飞丝洗发水', '日用品', '瓶', 25.00, 45.00, 40, 10),
('6901234567898', '统一冰红茶', '饮料', '瓶', 2.00, 3.50, 180, 40),
('6901234567899', '奥利奥饼干', '零食', '盒', 6.00, 12.00, 70, 15);

INSERT OR IGNORE INTO members (card_no, name, phone, level, points, balance) VALUES 
('M001', '张三', '13800138001', 2, 500, 100.00),
('M002', '李四', '13800138002', 1, 200, 50.00),
('M003', '王五', '13800138003', 3, 1000, 200.00);
