const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

const BIOMETRIC_SERVICE = 'http://localhost:5001';

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
router.post('/liveness/check', (req, res) => forwardRequest('/api/liveness/check', req, res));
router.post('/liveness/multiframe', authenticateToken, (req, res) => forwardRequest('/api/liveness/multiframe', req, res));
router.post('/offline/generate-token', authenticateToken, (req, res) => forwardRequest('/api/offline/generate-token', req, res));
router.post('/offline/verify-token', authenticateToken, (req, res) => forwardRequest('/api/offline/verify-token', req, res));

module.exports = router;
