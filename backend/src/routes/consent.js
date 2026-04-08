const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { invokeChaincode } = require('../services/fabricService');
const { authenticateToken } = require('../middleware/auth');

const getPool = () => sql.connect({
    user: process.env.MSSQL_USER || 'sa', password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost', database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
});

// Try blockchain write; silently skip if Fabric is unavailable
const tryBlockchain = async (fn) => {
    try { await fn(); } catch { /* Fabric offline — continue with MSSQL only */ }
};

// ── CITIZEN ENDPOINTS ──────────────────────────────────────────────────────────

// Submit a consent request (citizen → org, status: PENDING)
router.post('/request', authenticateToken, async (req, res) => {
    try {
        const { citizenId, orgId, fields } = req.body;
        if (!citizenId || !orgId || !fields?.length)
            return res.status(400).json({ error: 'citizenId, orgId and fields are required' });

        const pool = await getPool();

        // Upsert: if a request already exists update it, otherwise insert
        const existing = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .input('oid', sql.NVarChar, orgId)
            .query(`SELECT id, status FROM ConsentRequest WHERE citizenId=@cid AND orgId=@oid`);

        if (existing.recordset.length > 0) {
            const row = existing.recordset[0];
            if (row.status === 'APPROVED')
                return res.status(400).json({ error: 'Consent is already active for this organization' });
            // Re-submit: reset to PENDING with updated fields
            await pool.request()
                .input('id', sql.Int, row.id)
                .input('fields', sql.NVarChar, JSON.stringify(fields))
                .query(`UPDATE ConsentRequest SET status='PENDING', fields=@fields, updatedAt=GETDATE() WHERE id=@id`);
        } else {
            await pool.request()
                .input('cid', sql.NVarChar, citizenId)
                .input('oid', sql.NVarChar, orgId)
                .input('fields', sql.NVarChar, JSON.stringify(fields))
                .query(`INSERT INTO ConsentRequest (citizenId, orgId, fields) VALUES (@cid, @oid, @fields)`);
        }

        // Notify the organization
        await pool.request()
            .input('oid', sql.NVarChar, orgId)
            .input('cid', sql.NVarChar, citizenId)
            .query(`INSERT INTO Notification (recipientId, recipientType, message, type)
                    VALUES (@oid, 'ORG',
                    'Citizen ' + @cid + ' has submitted a consent request for your organization. Please review it.',
                    'CONSENT_REQUEST')`);

        res.json({ success: true, message: 'Consent request submitted. Awaiting organization approval.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get consent profile for citizen (all their requests/active consents)
router.get('/profile/:citizenId', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('cid', sql.NVarChar, req.params.citizenId)
            .query(`SELECT id, orgId, fields, status, createdAt, updatedAt
                    FROM ConsentRequest WHERE citizenId=@cid
                    ORDER BY updatedAt DESC`);

        // Build permissions map (APPROVED only) for backward compatibility
        const permissions = {};
        const requests = result.recordset.map(r => ({
            ...r,
            fields: (() => { try { return JSON.parse(r.fields); } catch { return []; } })()
        }));
        requests.filter(r => r.status === 'APPROVED').forEach(r => {
            permissions[r.orgId] = r.fields;
        });

        res.json({ permissions, requests });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Revoke an active consent (citizen)
router.post('/revoke', authenticateToken, async (req, res) => {
    try {
        const { citizenId, orgId } = req.body;
        const pool = await getPool();
        await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .input('oid', sql.NVarChar, orgId)
            .query(`UPDATE ConsentRequest SET status='REVOKED', updatedAt=GETDATE()
                    WHERE citizenId=@cid AND orgId=@oid AND status='APPROVED'`);

        await tryBlockchain(() =>
            invokeChaincode('consent', 'DeclinePermission', [citizenId, orgId])
        );

        res.json({ success: true, message: 'Consent revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Legacy decline (kept for backward compat)
router.post('/decline', authenticateToken, async (req, res) => {
    const { citizenId, orgId } = req.body;
    req.body = { citizenId, orgId };
    // Reuse revoke logic
    try {
        const pool = await getPool();
        await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .input('oid', sql.NVarChar, orgId)
            .query(`UPDATE ConsentRequest SET status='REVOKED', updatedAt=GETDATE()
                    WHERE citizenId=@cid AND orgId=@oid AND status='APPROVED'`);
        await tryBlockchain(() =>
            invokeChaincode('consent', 'DeclinePermission', [citizenId, orgId])
        );
        res.json({ success: true, message: 'Consent revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── ORG ENDPOINTS ──────────────────────────────────────────────────────────────

// Get pending consent requests for this org
router.get('/org/requests', authenticateToken, async (req, res) => {
    try {
        const orgId = req.user.id;
        const pool = await getPool();
        const result = await pool.request()
            .input('oid', sql.NVarChar, orgId)
            .query(`SELECT cr.id, cr.citizenId, cr.orgId, cr.fields, cr.status,
                           cr.createdAt, cr.updatedAt,
                           c.fullName, c.nicNumber
                    FROM ConsentRequest cr
                    JOIN CitizenRegistration c ON cr.citizenId = c.citizenId
                    WHERE cr.orgId = @oid
                    ORDER BY cr.status ASC, cr.updatedAt DESC`);

        const requests = result.recordset.map(r => ({
            ...r,
            fields: (() => { try { return JSON.parse(r.fields); } catch { return []; } })()
        }));
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve a consent request (org)
router.post('/org/approve/:id', authenticateToken, async (req, res) => {
    try {
        const orgId = req.user.id;
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('oid', sql.NVarChar, orgId)
            .query(`SELECT * FROM ConsentRequest WHERE id=@id AND orgId=@oid`);
        if (result.recordset.length === 0)
            return res.status(404).json({ error: 'Request not found' });

        const req_ = result.recordset[0];
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`UPDATE ConsentRequest SET status='APPROVED', updatedAt=GETDATE() WHERE id=@id`);

        // Notify citizen
        await pool.request()
            .input('cid', sql.NVarChar, req_.citizenId)
            .input('oid', sql.NVarChar, orgId)
            .query(`INSERT INTO Notification (recipientId, recipientType, message, type)
                    VALUES (@cid, 'CITIZEN',
                    'Your consent request to organization ' + @oid + ' has been approved.',
                    'CONSENT_APPROVED')`);

        // Write to blockchain (graceful — Fabric may be offline)
        await tryBlockchain(() =>
            invokeChaincode('consent', 'GrantPermission', [req_.citizenId, orgId, req_.fields])
        );

        res.json({ success: true, message: 'Consent request approved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reject a consent request (org)
router.post('/org/reject/:id', authenticateToken, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { reason } = req.body;
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('oid', sql.NVarChar, orgId)
            .query(`SELECT * FROM ConsentRequest WHERE id=@id AND orgId=@oid`);
        if (result.recordset.length === 0)
            return res.status(404).json({ error: 'Request not found' });

        const req_ = result.recordset[0];
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`UPDATE ConsentRequest SET status='REJECTED', updatedAt=GETDATE() WHERE id=@id`);

        // Notify citizen
        await pool.request()
            .input('cid', sql.NVarChar, req_.citizenId)
            .input('oid', sql.NVarChar, orgId)
            .input('reason', sql.NVarChar, reason || 'No reason provided')
            .query(`INSERT INTO Notification (recipientId, recipientType, message, type)
                    VALUES (@cid, 'CITIZEN',
                    'Your consent request to organization ' + @oid + ' was rejected. Reason: ' + @reason,
                    'CONSENT_REJECTED')`);

        res.json({ success: true, message: 'Consent request rejected' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get consented fields for an org (used during identity verification)
router.get('/fields/:citizenId/:orgId', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('cid', sql.NVarChar, req.params.citizenId)
            .input('oid', sql.NVarChar, req.params.orgId)
            .query(`SELECT fields FROM ConsentRequest
                    WHERE citizenId=@cid AND orgId=@oid AND status='APPROVED'`);
        const fields = result.recordset.length > 0
            ? (() => { try { return JSON.parse(result.recordset[0].fields); } catch { return []; } })()
            : [];
        res.json({ fields });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
