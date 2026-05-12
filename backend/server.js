const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supermarket_secret_key_2024';

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'supermarket.db');
const dbDir = path.dirname(dbPath);
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

const bcrypt = require('bcryptjs');

const initDb = () => {
  const initSql = fs.readFileSync(path.join(__dirname, 'database', 'init.sql'), 'utf8');
  db.exec(initSql);
  
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('123456', 10);
    const stmt = db.prepare('INSERT OR REPLACE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)');
    stmt.run('admin', hashedPassword, 'admin', '系统管理员');
    stmt.run('cashier1', hashedPassword, 'cashier', '收银员1');
    stmt.run('cashier2', hashedPassword, 'cashier', '收银员2');
  }
};

initDb();

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'token无效' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }
  next();
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user) {
    return res.json({ success: false, message: '用户名不存在' });
  }
  
  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(password, user.password)) {
    return res.json({ success: false, message: '密码错误' });
  }
  
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name }
    }
  });
});

app.get('/api/user/info', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, role, name, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, data: user });
});

app.get('/api/products', authMiddleware, (req, res) => {
  const { keyword, category, page = 1, pageSize = 20 } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  
  if (keyword) {
    sql += ' AND (barcode LIKE ? OR name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const products = db.prepare(sql).all(...params);
  res.json({ success: true, data: { list: products, total } });
});

app.get('/api/products/barcode/:barcode', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
  if (!product) {
    return res.json({ success: false, message: '商品不存在' });
  }
  res.json({ success: true, data: product });
});

app.post('/api/products', authMiddleware, adminMiddleware, (req, res) => {
  const { barcode, name, category, unit, cost_price, sale_price, stock, min_stock } = req.body;
  
  const existing = db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode);
  if (existing) {
    return res.json({ success: false, message: '商品条码已存在' });
  }
  
  const stmt = db.prepare('INSERT INTO products (barcode, name, category, unit, cost_price, sale_price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(barcode, name, category, unit, cost_price, sale_price, stock, min_stock);
  
  db.prepare('INSERT INTO stock_logs (product_id, type, quantity, before_stock, after_stock, operator_id, remark) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    result.lastInsertRowid, 'in', stock, 0, stock, req.user.id, '初始入库'
  );
  
  res.json({ success: true, data: { id: result.lastInsertRowid } });
});

app.put('/api/products/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, category, unit, cost_price, sale_price, stock, min_stock } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  
  if (!product) {
    return res.json({ success: false, message: '商品不存在' });
  }
  
  db.prepare('UPDATE products SET name = ?, category = ?, unit = ?, cost_price = ?, sale_price = ?, stock = ?, min_stock = ? WHERE id = ?').run(
    name, category, unit, cost_price, sale_price, stock, min_stock, req.params.id
  );
  
  res.json({ success: true });
});

app.delete('/api/products/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/categories', authMiddleware, (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ""').all();
  res.json({ success: true, data: categories.map(c => c.category) });
});

app.post('/api/orders', authMiddleware, (req, res) => {
  const { items, member_id, payment_method, total_amount, discount_amount, final_amount, received_amount, change_amount, round_type } = req.body;
  
  const orderNo = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
  
  const orderStmt = db.prepare('INSERT INTO orders (order_no, member_id, payment_method, total_amount, discount_amount, final_amount, received_amount, change_amount, round_type, cashier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const orderResult = orderStmt.run(orderNo, member_id, payment_method, total_amount, discount_amount, final_amount, received_amount, change_amount, round_type, req.user.id);
  
  const orderItemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, barcode, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const updateStockStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  const stockLogStmt = db.prepare('INSERT INTO stock_logs (product_id, type, quantity, before_stock, after_stock, operator_id, remark) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  for (const item of items) {
    orderItemStmt.run(orderResult.lastInsertRowid, item.product_id, item.product_name, item.barcode, item.quantity, item.unit_price, item.subtotal);
    
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
    const beforeStock = product.stock;
    const afterStock = beforeStock - item.quantity;
    
    updateStockStmt.run(item.quantity, item.product_id);
    stockLogStmt.run(item.product_id, 'out', item.quantity, beforeStock, afterStock, req.user.id, `销售出库-订单${orderNo}`);
  }
  
  if (member_id) {
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
    if (member) {
      const points = Math.floor(final_amount);
      db.prepare('UPDATE members SET points = points + ?, balance = balance - ? WHERE id = ?').run(points, discount_amount || 0, member_id);
      db.prepare('INSERT INTO member_points_logs (member_id, type, points, balance, operator_id, remark) VALUES (?, ?, ?, ?, ?, ?)').run(
        member_id, 'earn', points, discount_amount || 0, req.user.id, `消费获得积分-订单${orderNo}`
      );
    }
  }
  
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderResult.lastInsertRowid);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderResult.lastInsertRowid);
  
  res.json({
    success: true,
    data: {
      order: { ...order, items: orderItems },
      cashier_name: req.user.name
    }
  });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const { start_date, end_date, cashier_id, order_no, page = 1, pageSize = 20 } = req.query;
  let sql = `SELECT o.*, u.name as cashier_name, m.name as member_name, m.phone as member_phone 
             FROM orders o 
             LEFT JOIN users u ON o.cashier_id = u.id 
             LEFT JOIN members m ON o.member_id = m.id 
             WHERE 1=1`;
  const params = [];
  
  if (start_date) {
    sql += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }
  if (cashier_id) {
    sql += ' AND o.cashier_id = ?';
    params.push(cashier_id);
  }
  if (order_no) {
    sql += ' AND o.order_no LIKE ?';
    params.push(`%${order_no}%`);
  }
  
  const countSql = sql.replace('SELECT o.*', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const orders = db.prepare(sql).all(...params);
  res.json({ success: true, data: { list: orders, total } });
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const order = db.prepare(`SELECT o.*, u.name as cashier_name, m.name as member_name, m.phone as member_phone 
                            FROM orders o 
                            LEFT JOIN users u ON o.cashier_id = u.id 
                            LEFT JOIN members m ON o.member_id = m.id 
                            WHERE o.id = ?`).get(req.params.id);
  
  if (!order) {
    return res.json({ success: false, message: '订单不存在' });
  }
  
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  order.items = items;
  
  res.json({ success: true, data: order });
});

app.post('/api/orders/:id/void', authMiddleware, adminMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  
  if (!order) {
    return res.json({ success: false, message: '订单不存在' });
  }
  
  if (order.status === 'voided') {
    return res.json({ success: false, message: '订单已作废' });
  }
  
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('voided', req.params.id);
  
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  for (const item of items) {
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
    const beforeStock = product.stock;
    const afterStock = beforeStock + item.quantity;
    
    db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
    db.prepare('INSERT INTO stock_logs (product_id, type, quantity, before_stock, after_stock, operator_id, remark) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      item.product_id, 'return', item.quantity, beforeStock, afterStock, req.user.id, `订单作废退货-订单${order.order_no}`
    );
  }
  
  res.json({ success: true });
});

app.get('/api/members', authMiddleware, (req, res) => {
  const { keyword, page = 1, pageSize = 20 } = req.query;
  let sql = 'SELECT * FROM members WHERE 1=1';
  const params = [];
  
  if (keyword) {
    sql += ' AND (name LIKE ? OR phone LIKE ? OR card_no LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const members = db.prepare(sql).all(...params);
  res.json({ success: true, data: { list: members, total } });
});

app.get('/api/members/phone/:phone', authMiddleware, (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE phone = ?').get(req.params.phone);
  if (!member) {
    return res.json({ success: false, message: '会员不存在' });
  }
  res.json({ success: true, data: member });
});

app.post('/api/members', authMiddleware, (req, res) => {
  const { name, phone, card_no } = req.body;
  
  const existing = db.prepare('SELECT id FROM members WHERE phone = ?').get(phone);
  if (existing) {
    return res.json({ success: false, message: '该手机号已注册会员' });
  }
  
  const stmt = db.prepare('INSERT INTO members (name, phone, card_no) VALUES (?, ?, ?)');
  const result = stmt.run(name, phone, card_no || 'M' + Date.now());
  
  res.json({ success: true, data: { id: result.lastInsertRowid } });
});

app.put('/api/members/:id', authMiddleware, (req, res) => {
  const { name, phone, level } = req.body;
  db.prepare('UPDATE members SET name = ?, phone = ?, level = ? WHERE id = ?').run(name, phone, level, req.params.id);
  res.json({ success: true });
});

app.post('/api/members/:id/recharge', authMiddleware, (req, res) => {
  const { amount } = req.body;
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  
  if (!member) {
    return res.json({ success: false, message: '会员不存在' });
  }
  
  db.prepare('UPDATE members SET balance = balance + ? WHERE id = ?').run(amount, req.params.id);
  db.prepare('INSERT INTO member_points_logs (member_id, type, points, balance, operator_id, remark) VALUES (?, ?, ?, ?, ?, ?)').run(
    req.params.id, 'recharge', 0, amount, req.user.id, '会员充值'
  );
  
  res.json({ success: true });
});

app.post('/api/members/:id/points', authMiddleware, (req, res) => {
  const { points, type } = req.body;
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  
  if (!member) {
    return res.json({ success: false, message: '会员不存在' });
  }
  
  const changePoints = type === 'add' ? points : -points;
  db.prepare('UPDATE members SET points = points + ? WHERE id = ?').run(changePoints, req.params.id);
  db.prepare('INSERT INTO member_points_logs (member_id, type, points, balance, operator_id, remark) VALUES (?, ?, ?, ?, ?, ?)').run(
    req.params.id, type === 'add' ? 'earn' : 'use', Math.abs(changePoints), 0, req.user.id, type === 'add' ? '手动增加积分' : '手动扣减积分'
  );
  
  res.json({ success: true });
});

app.get('/api/stock/logs', authMiddleware, (req, res) => {
  const { product_id, type, start_date, end_date, page = 1, pageSize = 20 } = req.query;
  let sql = `SELECT sl.*, p.name as product_name, p.barcode, u.name as operator_name 
             FROM stock_logs sl 
             LEFT JOIN products p ON sl.product_id = p.id 
             LEFT JOIN users u ON sl.operator_id = u.id 
             WHERE 1=1`;
  const params = [];
  
  if (product_id) {
    sql += ' AND sl.product_id = ?';
    params.push(product_id);
  }
  if (type) {
    sql += ' AND sl.type = ?';
    params.push(type);
  }
  if (start_date) {
    sql += ' AND DATE(sl.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(sl.created_at) <= ?';
    params.push(end_date);
  }
  
  const countSql = sql.replace('SELECT sl.*', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY sl.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const logs = db.prepare(sql).all(...params);
  res.json({ success: true, data: { list: logs, total } });
});

app.post('/api/stock/in', authMiddleware, adminMiddleware, (req, res) => {
  const { product_id, quantity, remark } = req.body;
  
  const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return res.json({ success: false, message: '商品不存在' });
  }
  
  const beforeStock = product.stock;
  const afterStock = beforeStock + quantity;
  
  db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(quantity, product_id);
  db.prepare('INSERT INTO stock_logs (product_id, type, quantity, before_stock, after_stock, operator_id, remark) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    product_id, 'in', quantity, beforeStock, afterStock, req.user.id, remark || '手动入库'
  );
  
  res.json({ success: true });
});

app.get('/api/stock/warning', authMiddleware, (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE stock <= min_stock').all();
  res.json({ success: true, data: products });
});

app.get('/api/statistics/daily', authMiddleware, (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const stats = db.prepare(`SELECT 
    COUNT(*) as order_count,
    COALESCE(SUM(final_amount), 0) as total_amount,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN final_amount ELSE 0 END), 0) as cash_amount,
    COALESCE(SUM(CASE WHEN payment_method = 'wechat' THEN final_amount ELSE 0 END), 0) as wechat_amount,
    COALESCE(SUM(CASE WHEN payment_method = 'alipay' THEN final_amount ELSE 0 END), 0) as alipay_amount,
    COALESCE(SUM(CASE WHEN payment_method = 'member' THEN final_amount ELSE 0 END), 0) as member_amount
    FROM orders WHERE DATE(created_at) = ? AND status = 'completed'`).get(targetDate);
  
  res.json({ success: true, data: stats });
});

app.get('/api/statistics/monthly', authMiddleware, (req, res) => {
  const { year, month } = req.query;
  const targetYear = year || new Date().getFullYear();
  const targetMonth = month || new Date().getMonth() + 1;
  
  const stats = db.prepare(`SELECT 
    COUNT(*) as order_count,
    COALESCE(SUM(final_amount), 0) as total_amount
    FROM orders WHERE strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ? AND status = 'completed'`).get(
    targetYear.toString(), targetMonth.toString().padStart(2, '0')
  );
  
  res.json({ success: true, data: stats });
});

app.get('/api/statistics/hot-products', authMiddleware, (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;
  let sql = `SELECT p.id, p.name, p.barcode, SUM(oi.quantity) as total_quantity, SUM(oi.subtotal) as total_amount
             FROM order_items oi 
             JOIN orders o ON oi.order_id = o.id 
             JOIN products p ON oi.product_id = p.id 
             WHERE o.status = 'completed'`;
  const params = [];
  
  if (start_date) {
    sql += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }
  
  sql += ' GROUP BY p.id ORDER BY total_quantity DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const products = db.prepare(sql).all(...params);
  res.json({ success: true, data: products });
});

app.get('/api/statistics/category', authMiddleware, (req, res) => {
  const { start_date, end_date } = req.query;
  let sql = `SELECT p.category, SUM(oi.quantity) as total_quantity, SUM(oi.subtotal) as total_amount
             FROM order_items oi 
             JOIN orders o ON oi.order_id = o.id 
             JOIN products p ON oi.product_id = p.id 
             WHERE o.status = 'completed'`;
  const params = [];
  
  if (start_date) {
    sql += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }
  
  sql += ' GROUP BY p.category ORDER BY total_amount DESC';
  
  const categories = db.prepare(sql).all(...params);
  res.json({ success: true, data: categories });
});

app.get('/api/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, role, name, created_at FROM users').all();
  res.json({ success: true, data: users });
});

app.post('/api/users', authMiddleware, adminMiddleware, (req, res) => {
  const { username, password, role, name } = req.body;
  
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.json({ success: false, message: '用户名已存在' });
  }
  
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const stmt = db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)');
  const result = stmt.run(username, hashedPassword, role, name);
  
  res.json({ success: true, data: { id: result.lastInsertRowid } });
});

app.put('/api/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { role, name, password } = req.body;
  
  if (password) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET role = ?, name = ?, password = ? WHERE id = ?').run(role, name, hashedPassword, req.params.id);
  } else {
    db.prepare('UPDATE users SET role = ?, name = ? WHERE id = ?').run(role, name, req.params.id);
  }
  
  res.json({ success: true });
});

app.delete('/api/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  if (req.params.id == req.user.id) {
    return res.json({ success: false, message: '不能删除自己' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`超市收银系统运行在端口 ${PORT}`);
});
