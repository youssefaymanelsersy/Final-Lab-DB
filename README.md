# BookStore - Online Bookstore Management System

## Website Link

[Book Store](https://final-lab-db.vercel.app/)

A full-stack online bookstore application built with **React**, **Express.js**, and **TiDB Cloud**, containerized with **Docker**.

---

## 👤 Role & Responsibilities

- **Lead Backend Developer**

  - Designed the backend architecture and REST API structure
  - Created and implemented the full database schema and ERD
  - Integrated TiDB Cloud (MySQL-compatible) with connection pooling
  - Implemented authentication, authorization, and role-based access
  - Designed order processing, inventory tracking, and auto-reorder logic
  - Containerized backend services using Docker and Docker Compose

---

## 🏗️ Architecture

- **Frontend**: React 19 + Vite + React Router (role-based UI)
- **Backend**: Node.js + Express.js  
  - Modular routing (auth, books, customers, admin)
  - RESTful API design
  - JWT authentication & role-based authorization
- **Database**: TiDB Cloud (MySQL-compatible)
  - Relational schema with foreign keys & constraints
  - Optimized for scalability and transactional consistency
- **Deployment**: Docker Compose (isolated frontend & backend services)

---

## 📁 Project Structure

```plaintext
Final-Lab-DB/
├── docker-compose.yml
├── Database/
│   └── schema.sql           # Database schema (tables, FKs, sample data)
├── backend/
│   ├── Dockerfile
│   ├── .env                 # TiDB connection config (not committed)
│   ├── index.js             # Express app entry
│   ├── db.js                # MySQL2 connection pool
│   ├── middleware/
│   │   └── auth.js          # JWT auth middleware
│   └── routes/
│       ├── auth.js          # Login/signup
│       ├── books.js         # Book catalog
│       ├── customers/       # Modular customer routes
│       │   ├── index.js     # Route aggregator
│       │   ├── profile.js   # Customer profile + password
│       │   ├── cart.js      # Cart operations
│       │   └── orders.js    # Checkout + order history
│       └── admin/           # Admin routes
│           ├── index.js
│           ├── books.js
│           ├── reports.js
│           └── publisherOrders.js
└── Frontend/
    ├── Dockerfile
    ├── src/
    │   ├── App.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── BooksPage.jsx
    │   │   ├── CartPage.jsx
    │   │   ├── MyOrders.jsx
    │   │   ├── MySettingsPage.jsx
    │   │   ├── CustomerBooksPage.jsx
    │   │   ├── WishlistPage.jsx
    │   │   ├── OrdersPage.jsx
    │   │   ├── ReportsPage.jsx
    │   │   └── CheckoutSuccessPage.jsx
    |   |   
    │   ├── components/
    │   └── Styles/
    └── vite.config.js
```

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- TiDB Cloud account (for database)

### 1️⃣ Clone Repository

```bash
git clone https://github.com/ahmeddsameh-glitch/Final-Lab-DB
cd Final-Lab-DB
```

### 2️⃣ Configure Backend Environment

Create `backend/.env` with TiDB credentials:

```env
DB_HOST=gateway01.xx.prod.aws.tidbcloud.com
DB_USER=your_user
DB_PASS=your_password
DB_NAME=bookstore
DB_PORT=4000
PORT=3000

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook

JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
```

*Note: TLS certificates should be placed in `backend/certs/` if required.*

### 3️⃣ Start Services

```bash
docker compose up --build
```

This will:

- Build and start backend (port 3000)
- Build and start frontend (port 5173)
- Connect backend to TiDB Cloud

### 4️⃣ Access Application

- **Frontend**: <http://localhost:5173>
- **Backend API**: <http://localhost:3000>
- **Health Check**: <http://localhost:3000/health>

---

## 🗄️ Database Schema

The database contains:

- **Publishers**: Book publishers
- **Authors**: Book authors
- **Books**: Catalog with stock tracking and auto-reorder thresholds
- **Customers**: User accounts with authentication
- **Carts**: Shopping cart system
- **Orders**: Order processing with card validation
- **Sales**: Sales records
- **Publisher Orders**: Automatic stock replenishment

See `Database/schema.sql` for full schema.

---

## ⚙️ Backend Business Logic

- Centralized order processing with transactional integrity
- Automatic stock monitoring and reorder triggering
- Publisher order deduplication to avoid duplicate replenishments
- Secure checkout flow with Stripe integration
- Clean separation between routes, controllers, and database access

---

## 🔐 Authentication

- JWT-based authentication
- Cookies for session management
- Role-based access (Customer/Admin)
- Secure password hashing with bcrypt
- Secure checkout using stripe API

### API Endpoints

#### Auth

- `POST /api/auth/signup` - Register new customer
- `POST /api/auth/login` - Login (customer/admin)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

#### Customer Routes

- `GET /api/customers/:id` - Get profile
- `PUT /api/customers/:id` - Update profile
- `PUT /api/customers/:id/password` - Change password
- `GET /api/customers/:id/cart` - View cart
- `POST /api/customers/:id/cart` - Add to cart
- `PUT /api/customers/:id/cart/:isbn` - Update quantity
- `DELETE /api/customers/:id/cart/:isbn` - Remove from cart
- `POST /api/customers/:id/checkout` - Complete purchase
- `GET /api/customers/:id/orders` - Order history

#### Books

- `GET /api/books` - List all books (with filters)
- `GET /api/books/:isbn` - Get book details

#### Admin Routes

- `GET /api/admin/books` - Manage books
- `POST /api/admin/books` - Add new book
- `PUT /api/admin/books/:isbn` - Update book
- `DELETE /api/admin/books/:isbn` - Delete book
- `GET /api/admin/reports/top-sales` - Sales reports
- `GET /api/admin/publisher-orders` - Stock orders

---

## 🛒 Features

### Customer Features

- Browse books by category, author, publisher
- Search functionality
- Shopping cart with quantity management
- Checkout with card validation (Visa format)
- Order history with details
- Profile management

### Admin Features

- Book catalog management (CRUD)
- Stock tracking
- Sales reports (top books, revenue by category)
- Publisher order management
- Automatic reorder when stock < threshold

### Automatic Stock Management

When a book's stock drops below threshold during checkout:

- System creates a pending publisher order (3x threshold quantity)
- Deduplicates if pending order already exists
- Admin can view and manage these orders

---

## 🐳 Docker Configuration

### Services

```yaml
services:
  backend:
    build: ./backend
    ports: ["3000:3000"]
    environment: [NODE_ENV=production]

  frontend:
    build: ./Frontend
    ports: ["5173:5173"]
```

### Common Commands

```bash

# Start services

docker compose up -d

# View logs

docker compose logs -f backend

# Restart specific service

docker compose restart backend

# Stop all services

docker compose down

# Rebuild and restart

docker compose up --build
```

---

## 🔒 Security Notes

- `.env` files are **not committed** to repository
- TLS certificates stored locally in `backend/certs/`
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens stored in HTTP-only cookies
- CORS configured for frontend origin

---

## 🛠️ Development

### Backend

```bash
cd backend
npm install
npm run dev  # Nodemon hot-reload
```

### Frontend

```bash
cd Frontend
npm install
npm run dev  # Vite dev server
```

---

## 📊 Tech Stack

| Layer             | Technology                                   |
|---------------    |-------------------------------------         |
| Frontend          | React 19, React Router, Lucide Icons         |
| Backend           | Express.js, JWT, bcrypt, cookie-parser       |
| Database          | TiDB Cloud (MySQL2 driver)                   |
| Containerization  | Docker, Docker Compose                       |
| Build Tools       | Vite,Nodemon                                 |

---

## 👥 Team Members

- [Youssef Ayman](https://github.com/youssefaymanelsersy) – Lead Backend Developer
- [Ahmed Sameh](https://github.com/ahmeddsameh-glitch) – Lead Frontend Developer
- [Ahmed Hossam](https://github.com/Ahmad-Hossam-88) – Backend Developer
- [Omar Mohamed](https://github.com/omar-franco) – Frontend Developer
