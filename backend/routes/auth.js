const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { verifyToken } = require('./jwtHelper');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_only_for_dev_never_prod';

// --- Helpers ---

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function setAuthCookie(res, token) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// --- Routes ---

// Check Session
router.get('/me', verifyToken, (req, res) => {
  res.json({ ok: true, user: req.user });
});

router.post('/signup', async (req, res) => {
  try {
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      phone,
      shipping_address,
    } = req.body;

    if (
      !username ||
      !password ||
      !first_name ||
      !last_name ||
      !email ||
      !phone ||
      !shipping_address
    ) {
      return res
        .status(400)
        .json({ ok: false, error: 'All fields are required' });
    }

    const [existing] = await pool.query(
      `SELECT id FROM customers WHERE username = ? OR email = ?`,
      [username, email]
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ ok: false, error: 'Username or email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO customers (username, password_hash, first_name, last_name, email, phone, shipping_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        password_hash,
        first_name,
        last_name,
        email,
        phone,
        shipping_address,
      ]
    );

    await pool.query(`INSERT INTO carts (customer_id) VALUES (?)`, [
      result.insertId,
    ]);

    const user = { id: result.insertId, role: 'customer', username };
    const token = signToken({ id: user.id, role: 'customer' });

    setAuthCookie(res, token);

    res.status(201).json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Admin backdoor
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = signToken({ role: 'admin', username: 'admin' });
      setAuthCookie(res, token);
      return res.json({
        ok: true,
        user: { role: 'admin', username: 'admin' }, // Standardized response
        admin: true,
        message: 'Admin login successful',
      });
    }

    const [rows] = await pool.query(
      `SELECT id, password_hash, username FROM customers WHERE username = ?`,
      [username]
    );

    if (rows.length === 0)
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match)
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const token = signToken({
      id: user.id,
      role: 'customer',
      username: user.username,
    });

    setAuthCookie(res, token);

    res.json({
      ok: true,
      user: { id: user.id, username: user.username, role: 'customer' },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return res.json({ ok: true, message: 'Logged out successfully' });
});

module.exports = router;
