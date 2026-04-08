const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');

const dbConfig = {
    server: process.env.MSSQL_HOST || 'localhost',
    port: parseInt(process.env.MSSQL_PORT) || 1433,
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
};

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Admin login (hardcoded)
        if (role === 'admin') {
            if (username === 'admin' && password === 'Admin@2025') {
                const token = jwt.sign(
                    { id: 'admin-001', username, role: 'admin' },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRES_IN }
                );
                return res.json({ token, role: 'admin', username });
            }
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Organization login
        if (role === 'organization') {
            const pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('orgId', sql.NVarChar, username)
                .query('SELECT * FROM OrganizationUser WHERE orgId = @orgId AND isActive = 1');

            if (result.recordset.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const org = result.recordset[0];
            const valid = await bcrypt.compare(password, org.passwordHash);
            if (!valid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const mustChangePassword = org.mustChangePassword === true || org.mustChangePassword === 1;
            const token = jwt.sign(
                { id: org.orgId, username: org.orgId, role: 'organization', mustChangePassword },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );
            return res.json({ token, role: 'organization', orgId: org.orgId, orgName: org.orgName, mustChangePassword });
        }

        return res.status(400).json({ error: 'Invalid role' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Organization — change password (first-time setup)
router.post('/org/change-password', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'organization') return res.status(403).json({ error: 'Forbidden' });

        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('orgId', sql.NVarChar, decoded.id)
            .input('hash', sql.NVarChar, passwordHash)
            .query('UPDATE OrganizationUser SET passwordHash = @hash, mustChangePassword = 0 WHERE orgId = @orgId');

        // Issue a fresh token with mustChangePassword = false
        const newToken = jwt.sign(
            { id: decoded.id, username: decoded.id, role: 'organization', mustChangePassword: false },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        res.json({ success: true, token: newToken });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get current org info from token (for portal display)
router.get('/org/me', authenticateToken, requireRole('organization'), async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('orgId', sql.NVarChar, req.user.id)
            .query('SELECT orgId, orgName FROM OrganizationUser WHERE orgId = @orgId');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ orgId: result.recordset[0].orgId, orgName: result.recordset[0].orgName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Citizen login (biometric hash based)
router.post('/citizen/login', async (req, res) => {
    try {
        const { nicNumber, biometricHash } = req.body;
        if (!nicNumber || !biometricHash) {
            return res.status(400).json({ error: 'NIC and biometric data required' });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('nicNumber', sql.VarChar, nicNumber)
            .query('SELECT * FROM Citizen WHERE NICNumber = @nicNumber AND IsActive = 1');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Citizen not found' });
        }

        const citizen = result.recordset[0];
        const token = jwt.sign(
            { id: citizen.CitizenID, nicNumber, role: 'citizen' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ token, role: 'citizen', citizenId: citizen.CitizenID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
