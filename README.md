# Vibe Commerce — Mock E-Com Cart

Simple full-stack shopping cart app built as an assignment for Vibe Commerce screening.

**Tech stack**
- Frontend: React (Create React App)
- Backend: Node.js + Express
- Database: SQLite (local file `backend/db.sqlite`)
- Communication: REST API (`/api/*`)

## Features
- Products list (seeded sample items)
- Add to cart, update quantity, remove items
- Cart total calculation (server)
- Mock checkout → returns receipt (total + timestamp)
- Cart persisted in SQLite until checkout

## Quick start (local)
**Backend**
```bash
cd backend
npm install
npm run init-db     # seed products and create db.sqlite
npm run dev         # runs nodemon server on http://localhost:4000
