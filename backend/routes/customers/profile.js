const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../../db');
const { verifyCustomer } = require('../../middleware/auth');

const router = express.Router();

function ensureSameCustomer(req, res, next) {
    const paramId = Number(req.params.id);
    const authId = Number(req.user?.id);
    if (!authId || !paramId) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    if (authId !== paramId) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    next();
}

// 0) Get customer profile
router.get('/:id', verifyCustomer, ensureSameCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        let rows;
        try {
            [rows] = await pool.query(
                `SELECT id, username, first_name, last_name, email, phone, shipping_address, avatar_url, created_at
                FROM customers WHERE id = ? LIMIT 1`,
                [id]
            );
        } catch (e) {
            if (/Unknown column 'avatar_url'/.test(e.message)) {
                [rows] = await pool.query(
                    `SELECT id, username, first_name, last_name, email, phone, shipping_address, created_at
                    FROM customers WHERE id = ? LIMIT 1`,
                    [id]
                );
                const row = rows[0];
                if (!row) return res.status(404).json({ ok: false, error: 'Customer not found' });
                return res.json({ ok: true, profile: { ...row, avatar_url: null } });
            }
            throw e;
        }
        const row = rows[0];
        if (!row) {
            return res.status(404).json({ ok: false, error: 'Customer not found' });
        }
        res.json({ ok: true, profile: row });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// 1) Update customer profile (NO password)
router.put('/:id', verifyCustomer, ensureSameCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { first_name, last_name, email, phone, shipping_address } = req.body;

        if (!id || !first_name || !last_name || !email || !phone || !shipping_address) {
            return res.status(400).json({ ok: false, error: 'All fields are required' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ ok: false, error: 'Invalid email format' });
        }

        await pool.query(
            `UPDATE customers
            SET first_name = ?, last_name = ?, email = ?, phone = ?, shipping_address = ?
            WHERE id = ?`,
            [first_name, last_name, email, phone, shipping_address, id]
        );

        res.json({ ok: true, message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// 2) Change password
router.put('/:id/password', verifyCustomer, ensureSameCustomer, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { old_password, new_password } = req.body;

        if (!old_password || !new_password) {
            return res.status(400).json({ ok: false, error: 'Both passwords required' });
        }
        if (String(new_password).length < 6) {
            return res.status(400).json({ ok: false, error: 'New password must be at least 6 characters' });
        }

        const [rows] = await pool.query(`SELECT password_hash FROM customers WHERE id=?`, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Customer not found' });
        }

        const match = await bcrypt.compare(old_password, rows[0].password_hash);
        if (!match) {
            return res.status(401).json({ ok: false, error: 'Incorrect password' });
        }

        const newHash = await bcrypt.hash(new_password, 10);
        await pool.query(`UPDATE customers SET password_hash=? WHERE id=?`, [newHash, id]);

        res.json({ ok: true, message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});


// 3) Upload/Update avatar
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        if (!ok) return cb(new Error('Only JPG, PNG, or WEBP allowed'));
        cb(null, true);
    }
});

router.post('/:id/avatar', verifyCustomer, ensureSameCustomer, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' });
        const id = Number(req.params.id);

        // Process to WEBP buffer (256x256)
        const webpBuffer = await sharp(req.file.buffer)
            .rotate()
            .resize(256, 256, { fit: 'cover' })
            .webp({ quality: 85 })
            .toBuffer();

        const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
        let publicUrl;

        if (driver === 'tidb') {
            // Store avatar bytes in TiDB
            await pool.query(
                `INSERT INTO customer_avatars (customer_id, mime_type, image_data)
                VALUES (?, 'image/webp', ?)
                ON DUPLICATE KEY UPDATE mime_type=VALUES(mime_type), image_data=VALUES(image_data), updated_at=CURRENT_TIMESTAMP`,
                [id, webpBuffer]
            );
            publicUrl = `/api/customers/${id}/avatar`;
        } else {
            // Local FS storage
            const baseDir = path.resolve(process.cwd(), 'uploads', 'avatars');
            await fs.promises.mkdir(baseDir, { recursive: true });
            const filename = `c${id}_${Date.now()}.webp`;
            const filepath = path.join(baseDir, filename);
            await fs.promises.writeFile(filepath, webpBuffer);
            publicUrl = `/uploads/avatars/${filename}`;
        }

        // Try to persist URL if column exists; ignore if not migrated yet
        try {
            await pool.query('UPDATE customers SET avatar_url=? WHERE id=?', [publicUrl, id]);
        } catch (e) {
            if (!/Unknown column 'avatar_url'/.test(e.message)) throw e;
        }

        res.json({ ok: true, avatar_url: publicUrl });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// 4) Serve avatar (works for TiDB storage)
router.get('/:id/avatar', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [rows] = await pool.query(
            `SELECT mime_type, image_data FROM customer_avatars WHERE customer_id=? LIMIT 1`,
            [id]
        );
        if (rows.length === 0) return res.status(404).send('Not found');
        const { mime_type, image_data } = rows[0];
        res.setHeader('Content-Type', mime_type || 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
        return res.end(image_data);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;