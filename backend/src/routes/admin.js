const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { invokeChaincode, queryChaincode } = require('../services/fabricService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const getPool = () => sql.connect({
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
});

const parseLogs = (result) => {
    if (Array.isArray(result)) return result;
    if (typeof result === 'string') {
        try { return JSON.parse(result); } catch { return []; }
    }
    return [];
};

// Register organization
router.post('/org/register', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { orgId, orgName, sector, allowedFields, accessKey } = req.body;
        await invokeChaincode('orgpermission', 'RegisterOrganization', [
            orgId, orgName, sector, JSON.stringify(allowedFields), req.user.username
        ]);

        // Create org login credentials
        const rawPassword = accessKey || 'Org@2025';
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        const pool = await getPool();
        await pool.request()
            .input('orgId', sql.NVarChar, orgId)
            .input('orgName', sql.NVarChar, orgName)
            .input('passwordHash', sql.NVarChar, passwordHash)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM OrganizationUser WHERE orgId = @orgId)
                    INSERT INTO OrganizationUser (orgId, orgName, passwordHash) VALUES (@orgId, @orgName, @passwordHash)
                ELSE
                    UPDATE OrganizationUser SET orgName = @orgName, passwordHash = @passwordHash WHERE orgId = @orgId
            `);

        res.json({ success: true, message: 'Organization registered', defaultAccessKey: accessKey ? undefined : 'Org@2025' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all organizations
router.get('/orgs', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const orgs = await queryChaincode('orgpermission', 'GetAllOrganizations', []);
        res.json(orgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Suspend organization
router.put('/org/suspend/:orgId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await invokeChaincode('orgpermission', 'SuspendOrganization', [req.params.orgId]);
        res.json({ success: true, message: 'Organization suspended' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get audit log for specific citizen
router.get('/audit/:citizenId', authenticateToken, async (req, res) => {
    try {
        const plainId = req.params.citizenId.replace('did:fabric:', '');
        const result = await queryChaincode('audit', 'GetCitizenAuditLog', [plainId]);
        res.json(parseLogs(result));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all audit logs across all approved citizens
router.get('/audit-all', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const citizens = await pool.request()
            .query(`SELECT citizenId FROM CitizenRegistration WHERE status='APPROVED'`);

        const allLogs = [];
        for (const c of citizens.recordset) {
            try {
                const result = await queryChaincode('audit', 'GetCitizenAuditLog', [c.citizenId]);
                parseLogs(result).forEach(log => allLogs.push({ ...log, citizenId: c.citizenId }));
            } catch {}
        }

        allLogs.sort((a, b) => (parseInt(b.timestamp) || 0) - (parseInt(a.timestamp) || 0));
        res.json(allLogs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

// Delete organization
router.delete('/org/:orgId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await invokeChaincode('orgpermission', 'SuspendOrganization', [req.params.orgId]);
        res.json({ success: true, message: 'Organization removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update organization
router.put('/org/update/:orgId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { allowedFields } = req.body;
        await invokeChaincode('orgpermission', 'UpdateOrgFields', [
            req.params.orgId, JSON.stringify(allowedFields)
        ]);
        res.json({ success: true, message: 'Organization updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
