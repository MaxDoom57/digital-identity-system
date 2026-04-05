const express = require('express');
const router = express.Router();
const { invokeChaincode, queryChaincode } = require('../services/fabricService');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const sql = require('mssql');
const getPool = () => sql.connect({ user: process.env.MSSQL_USER || 'sa', password: process.env.MSSQL_PASSWORD, server: process.env.MSSQL_HOST || 'localhost', database: process.env.MSSQL_DATABASE, options: { encrypt: false, trustServerCertificate: true } });

// Create new digital identity
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { citizenId, fullName, nicNumber, biometricHash, biometricTemplate } = req.body;
        if (!citizenId || !fullName || !nicNumber || !biometricHash) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { storeOnIPFS } = require('../services/ipfsService');
        let ipfsCid = '';

        if (biometricTemplate) {
            const ipfsResult = await storeOnIPFS({
                citizenId,
                template: biometricTemplate,
                timestamp: Date.now()
            });
            ipfsCid = ipfsResult.cid;
        }

        const did = `did:fabric:${citizenId}`;
        await invokeChaincode('identity', 'CreateIdentity', [
            citizenId, did, fullName, nicNumber, biometricHash, ipfsCid
        ]);

        res.json({ success: true, did, ipfsCid, message: 'Identity created on blockchain' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get identity by DID
router.get('/:did', authenticateToken, async (req, res) => {
    try {
        const did = decodeURIComponent(req.params.did);
        const identity = await queryChaincode('identity', 'GetIdentity', [did]);
        res.json(identity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Revoke identity
router.put('/revoke/:did', authenticateToken, async (req, res) => {
    try {
        const did = decodeURIComponent(req.params.did);
        await invokeChaincode('identity', 'RevokeIdentity', [did]);
        res.json({ success: true, message: 'Identity revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

// Verify by QR code data
router.post('/verify-qr', async (req, res) => {
    try {
        const { qrData } = req.body;
        let parsed;
        try { parsed = JSON.parse(qrData); } catch { return res.status(400).json({ error: 'Invalid QR data' }); }
        const { did, citizenId } = parsed;
        if (!did) return res.status(400).json({ error: 'Missing DID in QR' });
        const identity = await queryChaincode('identity', 'GetIdentity', [did]);
        const citizen = await getPool().then(p => p.request()
            .input('id', require('mssql').NVarChar, citizenId)
            .query('SELECT fullName, nicNumber, dateOfBirth, status FROM CitizenRegistration WHERE citizenId=@id')
        );
        res.json({
            verified: true,
            did,
            citizenId,
            identity,
            citizen: citizen.recordset[0] || null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify QR code
router.post('/verify-qr', async (req, res) => {
    try {
        const sql = require('mssql');
        const { qrData } = req.body;
        let parsed;
        try { parsed = JSON.parse(qrData); } catch { return res.status(400).json({ error: 'Invalid QR data' }); }
        const { did, citizenId } = parsed;
        if (!did) return res.status(400).json({ error: 'Missing DID in QR' });

        const identity = await queryChaincode('identity', 'GetIdentity', [did]);

        const pool = await sql.connect({
            user: process.env.MSSQL_USER || 'sa',
            password: process.env.MSSQL_PASSWORD,
            server: process.env.MSSQL_HOST || 'localhost',
            database: process.env.MSSQL_DATABASE,
            options: { encrypt: false, trustServerCertificate: true }
        });
        const citizen = await pool.request()
            .input('id', sql.NVarChar, citizenId)
            .query('SELECT fullName, nicNumber, dateOfBirth, status, did FROM CitizenRegistration WHERE citizenId=@id');

        res.json({
            verified: true,
            did,
            citizenId,
            identity,
            citizen: citizen.recordset[0] || null
        });
    } catch (err) {
        res.status(500).json({ verified: false, error: err.message });
    }
});
