const express = require('express');
const router = express.Router();
const axios = require('axios');
const sql = require('mssql');
const { authenticateToken } = require('../middleware/auth');

const BIOMETRIC_SERVICE = 'http://localhost:5001';

const getPool = () => sql.connect({
    user: process.env.MSSQL_USER || 'sa', password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost', database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
});

const forwardRequest = async (endpoint, req, res) => {
    try {
        const response = await axios.post(
            `${BIOMETRIC_SERVICE}${endpoint}`,
            req.body,
            {
                headers: { 'Content-Type': 'application/json' },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 30000
            }
        );
        res.json(response.data);
    } catch (err) {
        const errorMsg = err.response?.data?.error || err.message;
        res.status(500).json({ error: errorMsg });
    }
};

router.post('/fingerprint/enroll', authenticateToken, (req, res) => forwardRequest('/api/fingerprint/enroll', req, res));
router.post('/fingerprint/verify', authenticateToken, (req, res) => forwardRequest('/api/fingerprint/verify', req, res));
router.post('/face/enroll', (req, res) => forwardRequest('/api/face/enroll', req, res));
router.post('/face/verify', authenticateToken, (req, res) => forwardRequest('/api/face/verify', req, res));

// Face check for login — no auth token yet, verifies face against stored biometric hash
router.post('/face/login-check', async (req, res) => {
    try {
        const { citizenId, image } = req.body;
        if (!citizenId || !image) return res.status(400).json({ error: 'citizenId and image required' });

        const pool = await getPool();
        const result = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .query(`SELECT biometricHash, status FROM CitizenRegistration WHERE citizenId = @cid`);
        if (result.recordset.length === 0)
            return res.status(404).json({ error: 'Citizen not found' });
        if (result.recordset[0].status !== 'APPROVED')
            return res.status(403).json({ error: 'Citizen identity not yet approved' });

        const storedHash = result.recordset[0].biometricHash;

        // Valid HOG feature vector = 8100 float32 values = 32400 bytes = ~43200 base64 chars.
        // Anything shorter (old HMAC hash, placeholder, test data) is invalid.
        if (!storedHash || storedHash.length < 1000) {
            return res.status(422).json({
                error: 'Biometric data is missing or outdated. Please register again to set up face recognition.'
            });
        }

        const bioRes = await axios.post(
            `${BIOMETRIC_SERVICE}/api/face/verify`,
            { image, citizenId, storedHash },
            { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );
        const verified = bioRes.data?.verified || bioRes.data?.match || false;
        res.json({ verified });
    } catch (err) {
        const status = err.response?.status || 500;
        const msg = err.response?.data?.error || err.message;
        res.status(status >= 400 && status < 500 ? status : 500).json({ error: msg });
    }
});
router.post('/liveness/check', (req, res) => forwardRequest('/api/liveness/check', req, res));
router.post('/liveness/multiframe', authenticateToken, (req, res) => forwardRequest('/api/liveness/multiframe', req, res));
router.post('/offline/generate-token', authenticateToken, (req, res) => forwardRequest('/api/offline/generate-token', req, res));
router.post('/offline/verify-token', authenticateToken, (req, res) => forwardRequest('/api/offline/verify-token', req, res));

module.exports = router;
