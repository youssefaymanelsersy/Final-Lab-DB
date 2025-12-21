const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

/**
 * POST /api/auth/signup
 */
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
            return res.status(400).json({
                ok: false,
                error: 'All fields are required',
            });
        }

        const [existing] = await pool.query(
            `SELECT id FROM customers WHERE username = ? OR email = ?`,
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                ok: false,
                error: 'Username or email already exists',
            });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
        `
            INSERT INTO customers
            (username, password_hash, first_name, last_name, email, phone, shipping_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
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

        await pool.query(
            `INSERT INTO carts (customer_id) VALUES (?)`,
            [result.insertId]
        );

        res.status(201).json({
            ok: true,
            message: 'Account created successfully',
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1) Validate input
        if (!username || !password) {
            return res.status(400).json({
                ok: false,
                error: 'Username and password are required',
            });
        }

        // 2) Find user
        const [rows] = await pool.query(
            `SELECT id, password_hash FROM customers WHERE username = ?`,
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                ok: false,
                error: 'Invalid credentials',
            });
        }

        const user = rows[0];

        // 3) Compare password
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({
                ok: false,
                error: 'Invalid credentials',
            });
        }

        // 4) Success
        res.json({
            ok: true,
            customer_id: user.id,
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
});

module.exports = router;

/******************************************************************
 * End of File
 ******************************************************************/