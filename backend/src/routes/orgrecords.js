const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { authenticateToken } = require('../middleware/auth');
const { invokeChaincode } = require('../services/fabricService');
const { v4: uuidv4 } = require('uuid');

const getPool = () => sql.connect({
    user: process.env.MSSQL_USER || 'sa', password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost', database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
});

// Add record to citizen account
router.post('/add', authenticateToken, async (req, res) => {
    try {
        const { citizenId, recordType, recordTitle, recordData } = req.body;
        const orgId = req.user.id;
        const pool = await getPool();

        // Verify citizen exists and is approved
        const citizen = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .query(`SELECT fullName FROM CitizenRegistration WHERE citizenId=@cid AND status='APPROVED'`);
        if (citizen.recordset.length === 0) return res.status(404).json({ error: 'Citizen not found or not approved' });

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
            .query(`INSERT INTO Notification (recipientId,recipientType,title,message,type)
        VALUES (@cid,'CITIZEN','New Record Added',
        'Organization ' + @orgId + ' added a new record: ' + @title,'RECORD')`);

        try { await invokeChaincode('audit', 'LogEvent', [uuidv4(), citizenId, orgId, 'RECORD_ADDED', '[]', 'false', '']); } catch {}
        res.json({ success: true, message: 'Record added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get citizens linked to org (those who granted consent)
router.get('/citizens', authenticateToken, async (req, res) => {
    try {
        const orgId = req.user.id;
        const pool = await getPool();
        const result = await pool.request()
            .input('orgId', sql.NVarChar, orgId)
            .query(`SELECT DISTINCT cr.citizenId, cr.fullName, cr.nicNumber, cr.did, cr.status
        FROM CitizenRegistration cr
        WHERE cr.status='APPROVED'`);
        res.json({ success: true, citizens: result.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get records added by this org
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
