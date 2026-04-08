const express = require('express');
const router = express.Router();
const sql = require('mssql');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { invokeChaincode } = require('../services/fabricService');
const { v4: uuidv4 } = require('uuid');

const BIOMETRIC_SERVICE = 'http://localhost:5001';

const getPool = () => sql.connect({
    user: process.env.MSSQL_USER || 'sa', password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost', database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
});

// Lookup citizen by ID (for enroll flow)
router.get('/citizen-lookup/:citizenId', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('cid', sql.NVarChar, req.params.citizenId)
            .query(`SELECT citizenId, fullName, nicNumber, did, status
                    FROM CitizenRegistration WHERE citizenId=@cid`);
        if (result.recordset.length === 0)
            return res.status(404).json({ error: 'Citizen not found' });
        const c = result.recordset[0];
        if (c.status !== 'APPROVED')
            return res.status(400).json({ error: 'Citizen identity is not yet approved' });
        res.json({ success: true, citizen: c });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Enroll citizen into org via face verification
router.post('/enroll', authenticateToken, async (req, res) => {
    try {
        const { citizenId, faceImage } = req.body;
        const orgId = req.user.id;

        if (!citizenId || !faceImage)
            return res.status(400).json({ error: 'citizenId and faceImage are required' });

        const pool = await getPool();

        // Get citizen + biometric hash
        const result = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .query(`SELECT citizenId, fullName, nicNumber, did, status, biometricHash
                    FROM CitizenRegistration WHERE citizenId=@cid`);
        if (result.recordset.length === 0)
            return res.status(404).json({ error: 'Citizen not found' });
        const citizen = result.recordset[0];
        if (citizen.status !== 'APPROVED')
            return res.status(400).json({ error: 'Citizen identity is not yet approved' });

        // Verify face against stored biometric hash
        try {
            const bioRes = await axios.post(
                `${BIOMETRIC_SERVICE}/api/face/verify`,
                { image: faceImage, citizenId, storedHash: citizen.biometricHash },
                { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
            );
            if (!bioRes.data?.verified && !bioRes.data?.match) {
                return res.status(401).json({ error: 'Face verification failed. Please try again.' });
            }
        } catch (bioErr) {
            // If biometric service is down or returns error response
            const msg = bioErr.response?.data?.error || bioErr.message;
            return res.status(401).json({ error: `Face verification failed: ${msg}` });
        }

        // Link citizen to org (ignore if already linked)
        await pool.request()
            .input('orgId', sql.NVarChar, orgId)
            .input('cid', sql.NVarChar, citizenId)
            .query(`IF NOT EXISTS (SELECT 1 FROM OrgCitizenLink WHERE orgId=@orgId AND citizenId=@cid)
                    INSERT INTO OrgCitizenLink (orgId, citizenId) VALUES (@orgId, @cid)`);

        try {
            await invokeChaincode('audit', 'LogEvent', [
                uuidv4(), citizenId, orgId, 'CITIZEN_ENROLLED', '[]', 'false', ''
            ]);
        } catch { }

        res.json({ success: true, citizen: {
            citizenId: citizen.citizenId,
            fullName: citizen.fullName,
            nicNumber: citizen.nicNumber,
            did: citizen.did,
            status: citizen.status
        }});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get citizens linked to this org only
router.get('/citizens', authenticateToken, async (req, res) => {
    try {
        const orgId = req.user.id;
        const pool = await getPool();
        const result = await pool.request()
            .input('orgId', sql.NVarChar, orgId)
            .query(`SELECT cr.citizenId, cr.fullName, cr.nicNumber, cr.did, cr.status, ocl.linkedAt
                    FROM CitizenRegistration cr
                    INNER JOIN OrgCitizenLink ocl ON cr.citizenId = ocl.citizenId
                    WHERE ocl.orgId = @orgId AND cr.status = 'APPROVED'
                    ORDER BY ocl.linkedAt DESC`);
        res.json({ success: true, citizens: result.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add record to citizen account
router.post('/add', authenticateToken, async (req, res) => {
    try {
        const { citizenId, recordType, recordTitle, recordData } = req.body;
        const orgId = req.user.id;
        const pool = await getPool();

        // Verify citizen is linked to this org
        const linked = await pool.request()
            .input('orgId', sql.NVarChar, orgId)
            .input('cid', sql.NVarChar, citizenId)
            .query(`SELECT 1 FROM OrgCitizenLink WHERE orgId=@orgId AND citizenId=@cid`);
        if (linked.recordset.length === 0)
            return res.status(403).json({ error: 'Citizen is not enrolled in your organization' });

        await pool.request()
            .input('orgId', sql.NVarChar, orgId)
            .input('cid', sql.NVarChar, citizenId)
            .input('type', sql.NVarChar, recordType)
            .input('title', sql.NVarChar, recordTitle)
            .input('data', sql.NVarChar, JSON.stringify(recordData))
            .query(`INSERT INTO OrganizationRecord (orgId,citizenId,recordType,recordTitle,recordData)
                    VALUES (@orgId,@cid,@type,@title,@data)`);

        // Notify citizen
        await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .input('orgId', sql.NVarChar, orgId)
            .input('title', sql.NVarChar, recordTitle)
            .query(`INSERT INTO Notification (recipientId,recipientType,message,type)
                    VALUES (@cid,'CITIZEN',
                    'New Record Added: Organization ' + @orgId + ' added a new record: ' + @title,'RECORD')`);

        try {
            await invokeChaincode('audit', 'LogEvent', [
                uuidv4(), citizenId, orgId, 'RECORD_ADDED', '[]', 'false', ''
            ]);
        } catch { }

        res.json({ success: true, message: 'Record added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get records added by this org for a citizen
router.get('/records/:citizenId', authenticateToken, async (req, res) => {
    try {
        const orgId = req.user.id;
        const pool = await getPool();
        const result = await pool.request()
            .input('orgId', sql.NVarChar, orgId)
            .input('cid', sql.NVarChar, req.params.citizenId)
            .query(`SELECT * FROM OrganizationRecord WHERE orgId=@orgId AND citizenId=@cid ORDER BY addedAt DESC`);
        res.json({ success: true, records: result.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
