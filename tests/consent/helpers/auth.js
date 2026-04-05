'use strict';

/**
 * auth.js — JWT test token factory
 *
 * Forges valid JWTs signed with the same secret as the backend, without
 * needing real database users.  This is standard practice for integration
 * tests: we trust our own signing implementation (tested separately) and
 * focus on testing the application logic under each role.
 *
 * JWT_SECRET is read from the environment so it can be overridden in CI:
 *   JWT_SECRET=<secret> npm test
 * Defaults to the value in backend/.env.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET  || 'digital_identity_jwt_secret_2025_very_long_key';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';

/**
 * Forge a citizen token.
 * Payload mirrors auth.js citizen login: { id, email, role, status }
 */
function citizenToken(citizenId, { status = 'APPROVED' } = {}) {
    return jwt.sign(
        { id: citizenId, email: `${citizenId}@test.local`, role: 'citizen', status },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
}

/**
 * Forge an organization token.
 * Payload mirrors auth.js org login: { id, username, role }
 */
function orgToken(orgId) {
    return jwt.sign(
        { id: orgId, username: orgId, role: 'organization' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
}

/**
 * Forge an admin token.
 */
function adminToken() {
    return jwt.sign(
        { id: 'admin-001', username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
}

/**
 * Return axios Authorization header object for a given token string.
 */
function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
}

module.exports = { citizenToken, orgToken, adminToken, authHeader };
