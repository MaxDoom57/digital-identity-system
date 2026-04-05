const express = require('express');
const router = express.Router();
const { invokeChaincode, queryChaincode } = require('../services/fabricService');
const { authenticateToken } = require('../middleware/auth');

// Grant consent
router.post('/grant', authenticateToken, async (req, res) => {
    try {
        const { citizenId, orgId, fields } = req.body;
        await invokeChaincode('consent', 'GrantPermission', [
            citizenId, orgId, JSON.stringify(fields)
        ]);
        res.json({ success: true, message: 'Consent granted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Decline consent
router.post('/decline', authenticateToken, async (req, res) => {
    try {
        const { citizenId, orgId } = req.body;
        await invokeChaincode('consent', 'DeclinePermission', [citizenId, orgId]);
        res.json({ success: true, message: 'Consent declined' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get consent profile
router.get('/profile/:citizenId', authenticateToken, async (req, res) => {
    try {
        const profile = await queryChaincode('consent', 'GetConsentProfile', [req.params.citizenId]);
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get consented fields for an org
router.get('/fields/:citizenId/:orgId', authenticateToken, async (req, res) => {
    try {
        const fields = await queryChaincode('consent', 'GetConsentedFields', [
            req.params.citizenId, req.params.orgId
        ]);
        res.json({ fields });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
