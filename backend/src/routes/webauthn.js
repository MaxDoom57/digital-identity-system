const express = require('express');
const router = express.Router();
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const RP_NAME = 'Digital Identity System';
const RP_ID   = process.env.WEBAUTHN_RP_ID || 'localhost';
// Accept any localhost port so the portal can run on 3002 or 3003 without breaking keys
const ORIGIN  = [
    'http://localhost:3003',
    'http://localhost:3002',
    ...(process.env.WEBAUTHN_ORIGIN ? [process.env.WEBAUTHN_ORIGIN] : []),
];

const getPool = () => sql.connect({
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
});

// In-memory challenge store (keyed by citizenId or nicNumber)
const challenges = new Map();

// Ensure CitizenCredential table exists
async function ensureTable(pool) {
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='CitizenCredential' AND xtype='U')
        CREATE TABLE CitizenCredential (
            credentialId  NVARCHAR(512) PRIMARY KEY,
            citizenId     NVARCHAR(255) NOT NULL,
            publicKey     NVARCHAR(MAX) NOT NULL,
            counter       BIGINT        NOT NULL DEFAULT 0,
            createdAt     DATETIME      NOT NULL DEFAULT GETDATE()
        )
    `);
}

// ── Registration: generate options ──────────────────────────────────────────
// GET /api/webauthn/register-options?citizenId=xxx
router.get('/register-options', async (req, res) => {
    try {
        const { citizenId } = req.query;
        if (!citizenId) return res.status(400).json({ error: 'citizenId required' });

        const pool = await getPool();
        await ensureTable(pool);

        // Citizen must exist (PENDING or APPROVED)
        const citizenRes = await pool.request()
            .input('id', sql.NVarChar, citizenId)
            .query('SELECT citizenId, fullName FROM CitizenRegistration WHERE citizenId = @id');
        if (citizenRes.recordset.length === 0)
            return res.status(404).json({ error: 'Citizen not found' });

        const { fullName } = citizenRes.recordset[0];

        // Existing credentials to exclude
        const existing = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .query('SELECT credentialId FROM CitizenCredential WHERE citizenId = @cid');

        const excludeCredentials = existing.recordset.map(r => ({
            id: Buffer.from(r.credentialId, 'base64url'),
            type: 'public-key',
        }));

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: RP_ID,
            userID: Buffer.from(citizenId),
            userName: fullName,
            userDisplayName: fullName,
            excludeCredentials,
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
            timeout: 60000,
        });

        challenges.set(`reg:${citizenId}`, options.challenge);
        res.json(options);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Registration: verify & store ─────────────────────────────────────────────
// POST /api/webauthn/register-verify  { citizenId, credential }
router.post('/register-verify', async (req, res) => {
    try {
        const { citizenId, credential } = req.body;
        if (!citizenId || !credential)
            return res.status(400).json({ error: 'citizenId and credential required' });

        const expectedChallenge = challenges.get(`reg:${citizenId}`);
        if (!expectedChallenge)
            return res.status(400).json({ error: 'Challenge expired — request options again' });

        const verification = await verifyRegistrationResponse({
            response: credential,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
        });

        if (!verification.verified)
            return res.status(400).json({ error: 'Device key verification failed' });

        const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

        const credentialId = Buffer.from(credentialID).toString('base64url');
        const publicKey    = Buffer.from(credentialPublicKey).toString('base64url');

        const pool = await getPool();
        await ensureTable(pool);

        await pool.request()
            .input('credentialId', sql.NVarChar, credentialId)
            .input('citizenId',   sql.NVarChar, citizenId)
            .input('publicKey',   sql.NVarChar, publicKey)
            .input('counter',     sql.BigInt,   counter)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM CitizenCredential WHERE credentialId = @credentialId)
                    INSERT INTO CitizenCredential (credentialId, citizenId, publicKey, counter)
                    VALUES (@credentialId, @citizenId, @publicKey, @counter)
            `);

        challenges.delete(`reg:${citizenId}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Login: generate challenge ────────────────────────────────────────────────
// POST /api/webauthn/login-options  { citizenId }
router.post('/login-options', async (req, res) => {
    try {
        const { citizenId } = req.body;
        if (!citizenId) return res.status(400).json({ error: 'citizenId required' });

        const pool = await getPool();
        await ensureTable(pool);

        const citizenRes = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .query(`SELECT citizenId FROM CitizenRegistration WHERE citizenId = @cid AND status = 'APPROVED'`);
        if (citizenRes.recordset.length === 0)
            return res.status(404).json({ error: 'Citizen not found or not yet approved' });

        const credRes = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .query('SELECT credentialId FROM CitizenCredential WHERE citizenId = @cid');

        if (credRes.recordset.length === 0)
            return res.status(400).json({
                error: 'no_device_key',
                message: 'No device key registered. Please set one up after approval.'
            });

        const allowCredentials = credRes.recordset.map(r => ({
            id: Buffer.from(r.credentialId, 'base64url'),
            type: 'public-key',
            transports: ['internal', 'hybrid', 'usb', 'ble', 'nfc'],
        }));

        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            allowCredentials,
            userVerification: 'preferred',
            timeout: 60000,
        });

        challenges.set(`auth:${citizenId}`, options.challenge);
        res.json(options);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Login: verify & issue JWT ────────────────────────────────────────────────
// POST /api/webauthn/login-verify  { citizenId, credential }
router.post('/login-verify', async (req, res) => {
    try {
        const { citizenId, credential } = req.body;
        if (!citizenId || !credential)
            return res.status(400).json({ error: 'citizenId and credential required' });

        const expectedChallenge = challenges.get(`auth:${citizenId}`);
        if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired — try again' });

        const pool = await getPool();
        const credRes = await pool.request()
            .input('credId', sql.NVarChar, credential.id)
            .query('SELECT * FROM CitizenCredential WHERE credentialId = @credId');

        if (credRes.recordset.length === 0)
            return res.status(401).json({ error: 'Unrecognised device key' });

        const storedCred = credRes.recordset[0];

        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            authenticator: {
                credentialPublicKey: Buffer.from(storedCred.publicKey, 'base64url'),
                credentialID:        Buffer.from(storedCred.credentialId, 'base64url'),
                counter:             Number(storedCred.counter),
            },
        });

        if (!verification.verified)
            return res.status(401).json({ error: 'Device key authentication failed' });

        await pool.request()
            .input('counter', sql.BigInt, verification.authenticationInfo.newCounter)
            .input('credId',  sql.NVarChar, credential.id)
            .query('UPDATE CitizenCredential SET counter = @counter WHERE credentialId = @credId');

        challenges.delete(`auth:${citizenId}`);

        const citizenRes = await pool.request()
            .input('id', sql.NVarChar, citizenId)
            .query('SELECT citizenId, nicNumber, fullName FROM CitizenRegistration WHERE citizenId = @id');
        const citizen = citizenRes.recordset[0];

        const token = jwt.sign(
            { id: citizen.citizenId, nicNumber: citizen.nicNumber, role: 'citizen' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ token, role: 'citizen', citizenId: citizen.citizenId, fullName: citizen.fullName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Check if citizen has a device key ────────────────────────────────────────
// GET /api/webauthn/has-key?citizenId=xxx
router.get('/has-key', async (req, res) => {
    try {
        const { citizenId } = req.query;
        if (!citizenId) return res.status(400).json({ error: 'citizenId required' });
        const pool = await getPool();
        await ensureTable(pool);
        const r = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .query('SELECT COUNT(*) AS cnt FROM CitizenCredential WHERE citizenId = @cid');
        res.json({ hasKey: r.recordset[0].cnt > 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── List my device keys (authenticated citizen) ───────────────────────────────
// GET /api/webauthn/my-keys
const { authenticateToken } = require('../middleware/auth');
router.get('/my-keys', authenticateToken, async (req, res) => {
    try {
        const citizenId = req.user.id;
        const pool = await getPool();
        await ensureTable(pool);
        const r = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .query('SELECT credentialId, createdAt FROM CitizenCredential WHERE citizenId = @cid ORDER BY createdAt DESC');
        res.json({ keys: r.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Delete a device key (authenticated citizen) ───────────────────────────────
// DELETE /api/webauthn/key/:credentialId
router.delete('/key/:credentialId', authenticateToken, async (req, res) => {
    try {
        const citizenId = req.user.id;
        const { credentialId } = req.params;
        const pool = await getPool();
        await ensureTable(pool);

        // Ensure at least one key remains
        const countRes = await pool.request()
            .input('cid', sql.NVarChar, citizenId)
            .query('SELECT COUNT(*) AS cnt FROM CitizenCredential WHERE citizenId = @cid');
        if (countRes.recordset[0].cnt <= 1)
            return res.status(400).json({ error: 'Cannot remove the only device key. Register a new key first.' });

        await pool.request()
            .input('credId', sql.NVarChar, credentialId)
            .input('cid',    sql.NVarChar, citizenId)
            .query('DELETE FROM CitizenCredential WHERE credentialId = @credId AND citizenId = @cid');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
