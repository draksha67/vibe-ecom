const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(DB_PATH);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// GET /api/products
app.get('/api/products', (req, res) => {
  db.all("SELECT id, name, price, description FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// GET /api/cart -> returns items with product info and total
app.get('/api/cart', (req, res) => {
  const sql = `
    SELECT cart.id as cartId, cart.qty, products.id as productId, products.name, products.price
    FROM cart
    JOIN products ON cart.productId = products.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const total = rows.reduce((s, r) => s + r.price * r.qty, 0);
    res.json({ items: rows, total: +total.toFixed(2) });
  });
});

// POST /api/cart -> add { productId, qty }
app.post('/api/cart', (req, res) => {
  const { productId, qty } = req.body;
  if (!productId || !qty || qty <= 0) return res.status(400).json({ error: 'Invalid payload' });

  // If same product exists, increase qty; otherwise insert
  db.get("SELECT id, qty FROM cart WHERE productId = ?", [productId], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (row) {
      const newQty = row.qty + qty;
      db.run("UPDATE cart SET qty = ? WHERE id = ?", [newQty, row.id], function (err2) {
        if (err2) return res.status(500).json({ error: 'DB error' });
        res.json({ cartId: row.id, productId, qty: newQty });
      });
    } else {
      db.run("INSERT INTO cart (productId, qty) VALUES (?, ?)", [productId, qty], function(err3) {
        if (err3) return res.status(500).json({ error: 'DB error' });
        res.status(201).json({ cartId: this.lastID, productId, qty });
      });
    }
  });
});

// DELETE /api/cart/:id -> remove cart item by cart id
app.delete('/api/cart/:id', (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM cart WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });
});

// POST /api/cart/:id -> update qty (optional endpoint used by frontend update)
app.post('/api/cart/:id', (req, res) => {
  const id = req.params.id;
  const { qty } = req.body;
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Invalid qty' });
  db.run("UPDATE cart SET qty = ? WHERE id = ?", [qty, id], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ id, qty });
  });
});

// POST /api/checkout -> { cartItems } -> returns mock receipt with total & timestamp
app.post('/api/checkout', (req, res) => {
  // Accept cartItems OR read from DB if not provided
  const clientCart = req.body.cartItems; // optional: array of {productId, qty}
  if (clientCart && Array.isArray(clientCart)) {
    // compute total from DB prices
    const placeholders = clientCart.map(() => '?').join(',');
    const productIds = clientCart.map(ci => ci.productId);
    db.all(`SELECT id, price, name FROM products WHERE id IN (${placeholders})`, productIds, (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      const map = Object.fromEntries(rows.map(r => [r.id, r]));
      let total = 0;
      const items = clientCart.map(ci => {
        const p = map[ci.productId];
        const sub = (p ? p.price : 0) * ci.qty;
        total += sub;
        return { productId: ci.productId, name: p ? p.name : 'Unknown', qty: ci.qty, price: p ? p.price : 0, subtotal: +sub.toFixed(2)};
      });
      const receipt = { items, total: +total.toFixed(2), timestamp: new Date().toISOString() };
      // Optionally clear cart table:
      db.run("DELETE FROM cart", [], (e) => { /* ignore error */ });
      res.json({ receipt });
    });
  } else {
    // read from DB cart
    const sql = `
      SELECT cart.id as cartId, cart.qty, products.id as productId, products.name, products.price
      FROM cart
      JOIN products ON cart.productId = products.id
    `;
    db.all(sql, [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      const total = rows.reduce((s, r) => s + r.price * r.qty, 0);
      const items = rows.map(r => ({ productId: r.productId, name: r.name, qty: r.qty, price: r.price, subtotal: +(r.price * r.qty).toFixed(2) }));
      const receipt = { items, total: +total.toFixed(2), timestamp: new Date().toISOString() };
      // clear cart after checkout
      db.run("DELETE FROM cart", [], (e) => { /* ignore */ });
      res.json({ receipt });
    });
  }
});

// Simple health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
