const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_only_for_dev_never_prod';

function verifyToken(req, res, next) {
    // 1. Read token from COOKIES (not headers)
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ ok: false, error: 'Access token required' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res
                .status(403)
                .json({ ok: false, error: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
    });
}

module.exports = { verifyToken };
