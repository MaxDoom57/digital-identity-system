const express = require('express');
const router = express.Router();
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { invokeChaincode, queryChaincode } = require('../services/fabricService');
const { authenticateToken } = require('../middleware/auth');

const BIOMETRIC_SERVICE = 'http://localhost:5001';

const getPool = () => sql.connect({
    user: process.env.MSSQL_USER || 'sa', password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost', database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
});

// Register new citizen
router.post('/register', async (req, res) => {
    try {
        const { fullName, nicNumber, dateOfBirth, address, phone, email, password, biometricHash } = req.body;
        if (!fullName || !nicNumber || !email || !password || !biometricHash) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pool = await getPool();

        // Check duplicate NIC or email
        const existing = await pool.request()
            .input('nic', sql.NVarChar, nicNumber)
            .input('email', sql.NVarChar, email)
            .query('SELECT 1 AS found FROM CitizenRegistration WHERE nicNumber=@nic OR email=@email');
        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: 'NIC number or email already registered' });
        }

        const citizenId = 'CIT' + Date.now().toString().slice(-6);
        const passwordHash = await bcrypt.hash(password, 10);

        await pool.request()
            .input('citizenId', sql.NVarChar, citizenId)
            .input('fullName', sql.NVarChar, fullName)
            .input('nicNumber', sql.NVarChar, nicNumber)
            .input('dateOfBirth', sql.Date, dateOfBirth || null)
            .input('address', sql.NVarChar, address || '')
            .input('phone', sql.NVarChar, phone || '')
            .input('email', sql.NVarChar, email)
            .input('passwordHash', sql.NVarChar, passwordHash)
            .input('biometricHash', sql.NVarChar, biometricHash)
            .query(`INSERT INTO CitizenRegistration
        (citizenId,fullName,nicNumber,dateOfBirth,address,phone,email,passwordHash,biometricHash,status)
        VALUES (@citizenId,@fullName,@nicNumber,@dateOfBirth,@address,@phone,@email,@passwordHash,@biometricHash,'PENDING')`);

        // Notify admin
        await pool.request()
            .input('message', sql.NVarChar, `New Registration Pending: ${fullName} (${nicNumber}) has submitted a registration request.`)
            .query(`INSERT INTO Notification (recipientId,recipientType,message,type)
        VALUES ('admin','ADMIN',@message,'REGISTRATION')`);

        res.json({ success: true, citizenId, message: 'Registration submitted. Awaiting admin approval.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Citizen login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM CitizenRegistration WHERE email=@email');

        if (result.recordset.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const citizen = result.recordset[0];

        const valid = await bcrypt.compare(password, citizen.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: citizen.citizenId, email: citizen.email, role: 'citizen', status: citizen.status },
            process.env.JWT_SECRET, { expiresIn: '24h' }
        );

        res.json({
            success: true, token, citizen: {
                citizenId: citizen.citizenId, fullName: citizen.fullName,
                status: citizen.status, did: citizen.did,
                rejectionReason: citizen.rejectionReason
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get citizen profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.NVarChar, req.user.id)
            .query('SELECT * FROM CitizenRegistration WHERE citizenId=@id');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
        const c = result.recordset[0];

        // Get org records
        const records = await pool.request()
            .input('cid', sql.NVarChar, req.user.id)
            .query('SELECT * FROM OrganizationRecord WHERE citizenId=@cid ORDER BY addedAt DESC');

        // Get notifications
        const notifs = await pool.request()
            .input('cid', sql.NVarChar, req.user.id)
            .query('SELECT * FROM Notification WHERE recipientId=@cid ORDER BY createdAt DESC');

        // Get blockchain identity if approved
        let blockchainData = null;
        if (c.did) {
            try {
                blockchainData = await queryChaincode('identity', 'GetIdentity', [c.did]);
                blockchainData = JSON.parse(blockchainData);
            } catch { }
        }

        res.json({
            success: true, citizen: c, orgRecords: records.recordset,
            notifications: notifs.recordset, blockchainData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate offline token
router.post('/offline-token', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.NVarChar, req.user.id)
            .query('SELECT citizenId, biometricHash, status FROM CitizenRegistration WHERE citizenId=@id');

        if (result.recordset.length === 0) return res.status(404).json({ error: 'Citizen not found' });
        const citizen = result.recordset[0];
        if (citizen.status !== 'APPROVED') return res.status(403).json({ error: 'Identity not yet approved' });
        if (!citizen.biometricHash) return res.status(400).json({ error: 'No biometric data enrolled' });

        const biometricRes = await axios.post(
            `${BIOMETRIC_SERVICE}/api/offline/generate-token`,
            { citizenId: citizen.citizenId, biometricHash: citizen.biometricHash, validSeconds: 86400 },
            { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        const { token, expiry, validFor } = biometricRes.data;
        const qrCode = await QRCode.toDataURL(token, { width: 256, margin: 2 });

        res.json({ success: true, token, expiry, validFor, qrCode });
    } catch (err) {
        const msg = err.response?.data?.error || err.message;
        res.status(500).json({ error: msg });
    }
});

// Get active organizations (for consent manager — citizen-accessible)
router.get('/orgs', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT orgId, orgName FROM OrganizationUser WHERE isActive = 1');
        const orgs = result.recordset;

        // Enrich with sector/allowedFields from blockchain
        let blockchainMap = {};
        try {
            const bcOrgs = await queryChaincode('orgpermission', 'GetAllOrganizations', []);
            (Array.isArray(bcOrgs) ? bcOrgs : []).forEach(o => { blockchainMap[o.orgId] = o; });
        } catch { }

        const merged = orgs.map(o => ({
            orgId: o.orgId,
            orgName: o.orgName,
            sector: blockchainMap[o.orgId]?.sector || 'Government',
            allowedFields: blockchainMap[o.orgId]?.allowedFields || [],
        }));
        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark notifications as read
router.put('/notifications/read', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, req.user.id)
            .query('UPDATE Notification SET isRead=1 WHERE recipientId=@id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
