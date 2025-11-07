const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

db.serialize(() => {
  // drop old tables for a fresh start (safe for assignment)
  db.run(`DROP TABLE IF EXISTS products`);
  db.run(`DROP TABLE IF EXISTS cart`);
  db.run(`DROP TABLE IF EXISTS users`);

  db.run(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price REAL,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER,
      qty INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(productId) REFERENCES products(id)
    )
  `);

  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT
    )
  `);

  const products = [
    ['Vibe T-Shirt', 19.99, 'Soft cotton t-shirt'],
    ['Vibe Cap', 12.5, 'Adjustable cap'],
    ['Vibe Mug', 8.99, 'Ceramic mug 350ml'],
    ['Vibe Hoodie', 39.99, 'Comfort hoodie'],
    ['Vibe Sticker Pack', 4.5, '5 assorted stickers'],
    ['Vibe Tote Bag', 14.0, 'Reusable tote'],
    ['Vibe Poster', 9.99, 'A2 poster'],
    ['Vibe Phone Case', 15.0, 'Fits most phones']
  ];

  const stmt = db.prepare("INSERT INTO products (name, price, description) VALUES (?, ?, ?)");
  for (const p of products) {
    stmt.run(p[0], p[1], p[2]);
  }
  stmt.finalize();

  console.log("DB initialized with products.");
});

db.close();
