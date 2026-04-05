const express = require('express');
const router = express.Router();
const sql = require('mssql');
const QRCode = require('qrcode');
const { invokeChaincode, queryChaincode } = require('../services/fabricService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const getPool = () => sql.connect({
    user: process.env.MSSQL_USER || 'sa', password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost', database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
});

// Get all pending registrations
router.get('/pending', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT * FROM CitizenRegistration ORDER BY
        CASE status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END, createdAt DESC`);
        res.json({ success: true, registrations: result.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve registration
router.post('/approve/:citizenId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { citizenId } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.NVarChar, citizenId)
            .query('SELECT * FROM CitizenRegistration WHERE citizenId=@id');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
        const citizen = result.recordset[0];

        // Create DID on blockchain (skip if already exists from a previous partial attempt)
        const did = `did:fabric:${citizenId}`;
        let identityExists = false;
        try {
            const existing = await queryChaincode('identity', 'IdentityExists', [did]);
            identityExists = existing === true || existing === 'true';
        } catch { }

        if (!identityExists) {
            await invokeChaincode('identity', 'CreateIdentity', [
                citizenId, did, citizen.fullName, citizen.nicNumber,
                citizen.biometricHash, ''
            ]);
        }

        // Log to audit chaincode
        const { v4: uuidv4 } = require('uuid');
        try {
            await invokeChaincode('audit', 'LogEvent', [
                uuidv4(), citizenId, 'ADMIN', 'IDENTITY_CREATED', '[]', false, ''
            ]);
        } catch { }

        // Generate QR code
        const qrData = JSON.stringify({ did, citizenId, fullName: citizen.fullName, nicNumber: citizen.nicNumber });
        const qrCode = await QRCode.toDataURL(qrData);

        await pool.request()
            .input('id', sql.NVarChar, citizenId)
            .input('did', sql.NVarChar, did)
            .input('qr', sql.NVarChar, qrCode)
            .query(`UPDATE CitizenRegistration SET status='APPROVED', did=@did, qrCode=@qr, updatedAt=GETDATE()
        WHERE citizenId=@id`);

        // Send notification to citizen
        await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .input('did', sql.NVarChar, did)
            .query(`INSERT INTO Notification (recipientId,recipientType,message,type)
        VALUES (@cid,'CITIZEN',
        'Registration Approved: Your digital identity has been approved. Your DID is: ' + @did,'APPROVAL')`);

        res.json({ success: true, did, message: 'Citizen approved and DID created on blockchain' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reject registration
router.post('/reject/:citizenId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { citizenId } = req.params;
        const { reason } = req.body;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.NVarChar, citizenId)
            .input('reason', sql.NVarChar, reason || 'Registration rejected by admin')
            .query(`UPDATE CitizenRegistration SET status='REJECTED', rejectionReason=@reason, updatedAt=GETDATE()
        WHERE citizenId=@id`);

        await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .input('reason', sql.NVarChar, reason || 'Registration rejected by admin')
            .query(`INSERT INTO Notification (recipientId,recipientType,message,type)
        VALUES (@cid,'CITIZEN',
        'Registration Rejected: Your registration was rejected. Reason: ' + @reason,'REJECTION')`);

        res.json({ success: true, message: 'Registration rejected' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get admin notifications
router.get('/notifications', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT * FROM Notification WHERE recipientType='ADMIN' ORDER BY createdAt DESC`);
        res.json({ success: true, notifications: result.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark admin notifications read
router.put('/notifications/read', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .query(`UPDATE Notification SET isRead=1 WHERE recipientType='ADMIN'`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
