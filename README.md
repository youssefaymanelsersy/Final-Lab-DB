# Final Lab – Dockerized MySQL + Backend Setup

This project uses **Docker Compose** to run:

* MySQL (database)
* Node.js backend
* Frontend

The database schema and seed data are automatically initialized on first run.

---

## 📁 Project Structure (relevant parts)

```english
Final-Lab-DB/
│
├── docker-compose.yml
│
├── Database/
│   └── schema.sql        # Database schema + triggers + seed data
│
├── backend/
│   ├── Dockerfile
│   ├── .env              # Backend DB connection config
│   └── index.js
│
└── frontend/
    └── Dockerfile
```

---

## 🧠 Key Concepts (Important)

* **MySQL user and database are created automatically by Docker**
* **schema.sql runs only once** (on first container creation)
* **Database data is persistent** via a Docker volume
* **If credentials change, the volume must be deleted**

---

## 🔧 Environment Variables

### Backend `.env` file

```env
DB_HOST=db
DB_USER=app
DB_PASS=app123
DB_NAME=bookstore
DB_PORT=3306
PORT=5000
```

These values **must match** what is defined in `docker-compose.yml`.

---

## 🐬 MySQL Initialization (Automatic)

In `docker-compose.yml`, the MySQL service uses:

```yaml
environment:
  MYSQL_DATABASE: bookstore
  MYSQL_USER: app
  MYSQL_PASSWORD: app123
  MYSQL_ROOT_PASSWORD: root
```

### What MySQL Docker does automatically on FIRST run

* Creates database `bookstore`
* Creates user `app`
* Sets password `app123`
* Grants `app` full access to `bookstore`
* Executes `/docker-entrypoint-initdb.d/schema.sql`

---

## 🗄️ Database Schema

* The file `Database/schema.sql` contains:

  * All tables
  * Foreign keys
  * Triggers
  * Seed data

This file is automatically executed **once** when the database volume is empty.

---

## ▶️ Step-by-Step: How to Run the Project (From Scratch)

### 1️⃣ Clone the repository

```bash
git clone https://github.com/ahmeddsameh-glitch/Final-Lab-DB
cd Final-Lab-DB
```

---

### 2️⃣ Start everything

```bash
docker compose up
```

Docker will:

1. Create the MySQL container
2. Create the database and user
3. Run `schema.sql`
4. Start backend and frontend

---

### 3️⃣ Verify database initialization

```bash
docker exec -it mysql-db mysql -u app -p bookstore
```

Password:

```english
app123
```

Run Command:

```bash
curl http://localhost:5000/db-test
```

Expected output:

```json
{"ok":true,"result":[{"ok":1}]}
```

---

### 4️⃣ Test backend DB connection

```bash
curl http://localhost:5000/health
```

Expected output:

```json
{"ok":true,"message":"Server is running"}
```

---

## 🔁 Does Data Reset on Rebuild?

❌ **NO**, data does **NOT** reset on:

```bash
docker compose up
docker compose restart
docker compose build
```

✅ Data **ONLY resets** if you run:

```bash
docker compose down -v
```

This deletes the database volume.

---

## ⚠️ When You MUST Reset the Database

You **must** reset if you change any of these:

* `MYSQL_USER`
* `MYSQL_PASSWORD`
* `MYSQL_DATABASE`

### Correct reset command

```bash
docker compose down -v
docker compose up --build
```

---

## ✅ Best Practice Summary

| Concern              | Location             |
| -------------------- | -------------------- |
| DB users & passwords | `docker-compose.yml` |
| Tables & triggers    | `schema.sql`         |
| App connection       | `.env`               |
| Persistent data      | Docker volume        |

## Database Access

This project uses a shared TiDB Cloud database.

For security reasons:

* `.env` files are not committed

* TLS certificates are not committed

Each team member creates a local `.env` file using `.env.example`
and receives credentials securely from the project owner.

This follows standard security best practices.
