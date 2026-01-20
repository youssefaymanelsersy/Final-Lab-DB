const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const caPath = process.env.DB_CA_PATH;

if (!caPath) {
  throw new Error('DB_CA_PATH environment variable is not set');
}

if (!fs.existsSync(caPath)) {
  throw new Error(`CA certificate not found at path: ${caPath}`);
}

const ca = fs.readFileSync(caPath, 'utf8');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: {
        ca,
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = db;
