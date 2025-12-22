const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
    throw new Error('FATAL: JWT_SECRET environment variable is required but not set');
}

/**
 * Middleware to verify JWT token exists and is valid
 * Attaches decoded user to req.user
 */
function verifyToken(req, res, next) {
    const token = req.cookies?.access_token;

    if (!token) {
        return res.status(401).json({
            ok: false,
            error: 'Authentication required. Please login.'
        });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                ok: false,
                error: 'Invalid or expired token. Please login again.'
            });
        }
        req.user = decoded;
        next();
    });
}

/**
 * Middleware to verify user has admin role
 * Must be used AFTER verifyToken
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            ok: false,
            error: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            ok: false,
            error: 'Admin access required. This endpoint is restricted to administrators.'
        });
    }

    next();
}

/**
 * Combined middleware: verify token AND require admin role
 * Use this for admin routes
 */
function verifyAdmin(req, res, next) {
    verifyToken(req, res, (err) => {
        if (err) return;
        requireAdmin(req, res, next);
    });
}

/**
 * Middleware to verify user is accessing their own resource
 * Must be used AFTER verifyToken
 * Checks if req.user.id matches req.params.id
 */
function verifyOwnership(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            ok: false,
            error: 'Authentication required'
        });
    }

    const requestedId = Number(req.params.id);

    // Admin can access any resource
    if (req.user.role === 'admin') {
        return next();
    }

    // Customer can only access their own resource
    if (req.user.id !== requestedId) {
        return res.status(403).json({
            ok: false,
            error: 'Access denied. You can only access your own data.'
        });
    }

    next();
}

/**
 * Combined middleware: verify token AND ownership
 * Use this for customer resource routes
 */
function verifyCustomer(req, res, next) {
    verifyToken(req, res, (err) => {
        if (err) return;
        verifyOwnership(req, res, next);
    });
}

module.exports = {
    verifyToken,
    requireAdmin,
    verifyAdmin,
    verifyOwnership,
    verifyCustomer
};
