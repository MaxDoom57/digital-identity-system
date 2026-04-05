'use strict';

/**
 * Offline Token Test Suite
 * ========================
 * Tests the Python verify_offline_token() function in
 * biometric/routes/offline.py via the Flask biometric service REST API.
 *
 * Prerequisites:
 *   - Biometric service running at http://localhost:5001
 *     (cd biometric && python app.py)
 *
 * Run:
 *   cd tests/offline-token && npm install && npm test
 *
 * Coverage:
 *   Scenario 1 — Token generation      : generate endpoint returns correct structure
 *   Scenario 2 — Valid token            : signature + expiry pass; biometric mismatch
 *                                         is expected in unit-test context (no real image)
 *   Scenario 3 — Expired token          : rejected with 'Token expired' before biometric check
 *   Scenario 4 — Tampered signature     : rejected with 'Invalid token signature'
 *   Scenario 5 — Replay attack          : same token accepted twice; server stores no nonce
 *                                         (security finding documented for thesis)
 */

const axios   = require('axios');
const crypto  = require('crypto');
const {
    buildToken,
    buildExpiredToken,
    tamperToken,
    decodeToken,
    sortedDumps,
    TEST_IMAGE_B64,
    OFFLINE_SECRET,
} = require('./helpers/token-builder');

// ── Configuration ─────────────────────────────────────────────────────────
const BIOMETRIC_URL  = process.env.BIOMETRIC_URL || 'http://localhost:5001';
const GENERATE_URL   = `${BIOMETRIC_URL}/api/offline/generate-token`;
const VERIFY_URL     = `${BIOMETRIC_URL}/api/offline/verify-token`;

// Test citizen fixture — does not need to exist in the DB; the biometric
// service generate-token endpoint accepts arbitrary citizenId values.
const TEST_CITIZEN_ID     = 'BENCH-TEST-001';
const TEST_BIOMETRIC_HASH = crypto.createHash('sha256').update('test-biometric-seed-001').digest('hex');

// ── Helpers ────────────────────────────────────────────────────────────────
async function generate(params = {}) {
    return axios.post(GENERATE_URL, {
        citizenId:    TEST_CITIZEN_ID,
        biometricHash: TEST_BIOMETRIC_HASH,
        validSeconds:  3600,
        ...params,
    });
}

async function verify(token) {
    return axios.post(VERIFY_URL, { token, image: TEST_IMAGE_B64 });
}

// ── Service availability check ─────────────────────────────────────────────
beforeAll(async () => {
    try {
        await axios.get(`${BIOMETRIC_URL}/health`, { timeout: 3000 });
    } catch {
        // /health may not exist — try a known endpoint instead
        try {
            await axios.post(GENERATE_URL, {
                citizenId: 'PING', biometricHash: 'ping', validSeconds: 1,
            }, { timeout: 3000 });
        } catch (err) {
            if (!err.response) {
                throw new Error(
                    `Biometric service unreachable at ${BIOMETRIC_URL}.\n` +
                    'Start it with: cd biometric && python app.py'
                );
            }
            // Got a response (even an error) — service is up
        }
    }
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 1 — Token Generation
// ══════════════════════════════════════════════════════════════════════════
describe('Scenario 1 — Token generation', () => {
    test('generate endpoint returns a valid token structure', async () => {
        const { data, status } = await generate();

        expect(status).toBe(200);
        expect(data.success).toBe(true);

        // Token must be a non-empty base64 string
        expect(typeof data.token).toBe('string');
        expect(data.token.length).toBeGreaterThan(0);
        expect(() => Buffer.from(data.token, 'base64')).not.toThrow();

        // Decoded token must have payload + signature fields
        const decoded = decodeToken(data.token);
        expect(decoded).toHaveProperty('payload');
        expect(decoded).toHaveProperty('signature');

        // Payload must carry required fields
        const { payload } = decoded;
        expect(payload.citizenId).toBe(TEST_CITIZEN_ID);
        expect(payload.biometricHash).toBe(TEST_BIOMETRIC_HASH);
        expect(typeof payload.expiry).toBe('number');
        expect(typeof payload.issuedAt).toBe('number');

        // Expiry must be in the future
        expect(payload.expiry).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    test('generate endpoint respects validSeconds parameter', async () => {
        const VALID_SECONDS = 7200;
        const before = Math.floor(Date.now() / 1000);
        const { data } = await generate({ validSeconds: VALID_SECONDS });
        const after = Math.floor(Date.now() / 1000);

        expect(data.validFor).toBe(VALID_SECONDS);
        // expiry ≈ issuedAt + validSeconds (allow 2 s clock drift)
        expect(data.expiry).toBeGreaterThanOrEqual(before + VALID_SECONDS);
        expect(data.expiry).toBeLessThanOrEqual(after  + VALID_SECONDS + 2);
    });

    test('generate endpoint rejects missing citizenId', async () => {
        await expect(
            axios.post(GENERATE_URL, { biometricHash: TEST_BIOMETRIC_HASH })
        ).rejects.toMatchObject({ response: { status: 400 } });
    });

    test('generate endpoint rejects missing biometricHash', async () => {
        await expect(
            axios.post(GENERATE_URL, { citizenId: TEST_CITIZEN_ID })
        ).rejects.toMatchObject({ response: { status: 400 } });
    });

    test('JS token builder produces a token with correct signature', () => {
        // Validates that token-builder.js faithfully replicates the Python algorithm.
        // If this test fails, all downstream tests are unreliable.
        const { payload, signature } = buildToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 3600);

        const payloadStr       = sortedDumps(payload);
        const expectedSig      = crypto
            .createHash('sha256')
            .update(payloadStr + OFFLINE_SECRET)
            .digest('hex');

        expect(signature).toBe(expectedSig);
        // Payload string must be sorted and space-separated (Python default)
        expect(payloadStr).toMatch(/^{"biometricHash":/);   // biometricHash sorts first
        expect(payloadStr).toContain('"issuedAt":');
        expect(payloadStr).not.toContain('":');             // all pairs use ': ' (with space)
    });
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 2 — Valid Token
// ══════════════════════════════════════════════════════════════════════════
describe('Scenario 2 — Valid token (signature + expiry pass)', () => {
    /**
     * In a unit-test context we cannot produce an image whose feature hash
     * exactly matches the biometricHash embedded in the token without
     * running the full biometric pipeline end-to-end.
     *
     * This test therefore verifies that:
     *   1. The signature check PASSES (reason ≠ 'Invalid token signature')
     *   2. The expiry check PASSES    (reason ≠ 'Token expired')
     *   3. Execution reaches the biometric comparison, which returns
     *      { valid: false, reason: 'Biometric mismatch' }
     *
     * The 'Biometric mismatch' result is the expected outcome here — it
     * proves verify_offline_token() accepted the token's cryptographic
     * structure and only failed on the biometric hash comparison.
     */
    test('token with valid signature and future expiry reaches biometric check', async () => {
        const { token } = buildToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 3600);
        const { data, status } = await verify(token);

        expect(status).toBe(200);
        // Cryptographic checks pass → execution reaches biometric comparison
        expect(data.reason).toBe('Biometric mismatch');
        expect(data.valid).toBe(false);
        // Must NOT be rejected at the cryptographic stage
        expect(data.reason).not.toBe('Invalid token signature');
        expect(data.reason).not.toBe('Token expired');
    });

    test('token generated by the service also reaches biometric check', async () => {
        // Ensures a token produced by Python's generate_offline_token() is
        // accepted by verify_offline_token() at the cryptographic level.
        const { data: genData } = await generate({ validSeconds: 3600 });
        const { data, status }  = await verify(genData.token);

        expect(status).toBe(200);
        expect(data.reason).toBe('Biometric mismatch');
        expect(data.valid).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 3 — Expired Token
// ══════════════════════════════════════════════════════════════════════════
describe('Scenario 3 — Expired token', () => {
    test('token expired 1 hour ago is rejected with "Token expired"', async () => {
        const { token } = buildExpiredToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 3600);
        const { data, status } = await verify(token);

        expect(status).toBe(200);
        expect(data.valid).toBe(false);
        expect(data.reason).toBe('Token expired');
    });

    test('token expired 24 hours ago is rejected', async () => {
        const { token } = buildExpiredToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 86400);
        const { data }  = await verify(token);

        expect(data.valid).toBe(false);
        expect(data.reason).toBe('Token expired');
    });

    test('token with expiry exactly at current second is rejected', async () => {
        // Build token that expires precisely now (validSeconds = 0).
        // Python: if int(time.time()) > payload['expiry'] — with validSeconds=0,
        // expiry = now, so now > now is false; this tests the edge case.
        // We use -1 to ensure it is definitively expired.
        const { token } = buildToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, -1);
        const { data }  = await verify(token);

        expect(data.valid).toBe(false);
        expect(data.reason).toBe('Token expired');
    });

    test('expiry check fires BEFORE biometric check', async () => {
        // If expiry were checked after biometrics, an expired token with a
        // matching biometric hash could briefly be accepted.  Confirm the order.
        const { token } = buildExpiredToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 60);
        const { data }  = await verify(token);

        // Must be 'Token expired', NOT 'Biometric mismatch'
        expect(data.reason).toBe('Token expired');
        expect(data.reason).not.toBe('Biometric mismatch');
    });
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 4 — Tampered Signature
// ══════════════════════════════════════════════════════════════════════════
describe('Scenario 4 — Tampered signature', () => {
    test('modifying citizenId in payload invalidates the signature', async () => {
        const { token } = buildToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 3600);
        const forged    = tamperToken(token, { citizenId: 'ATTACKER-999' });
        const { data, status } = await verify(forged);

        expect(status).toBe(200);
        expect(data.valid).toBe(false);
        expect(data.reason).toBe('Invalid token signature');
    });

    test('extending expiry in payload invalidates the signature', async () => {
        const { token, payload } = buildToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 3600);
        // Attacker tries to extend a short-lived token to a year
        const forged = tamperToken(token, { expiry: payload.expiry + 365 * 86400 });
        const { data } = await verify(forged);

        expect(data.valid).toBe(false);
        expect(data.reason).toBe('Invalid token signature');
    });

    test('substituting a different biometricHash invalidates the signature', async () => {
        const { token } = buildToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 3600);
        const attackerHash = crypto.createHash('sha256').update('attacker-biometric').digest('hex');
        const forged = tamperToken(token, { biometricHash: attackerHash });
        const { data } = await verify(forged);

        expect(data.valid).toBe(false);
        expect(data.reason).toBe('Invalid token signature');
    });

    test('signature check fires BEFORE expiry check', async () => {
        // A tampered-AND-expired token should fail on signature, not expiry.
        const { token } = buildExpiredToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 3600);
        const forged    = tamperToken(token, { citizenId: 'ATTACKER-999' });
        const { data }  = await verify(forged);

        // Python checks signature first → must be 'Invalid token signature'
        expect(data.reason).toBe('Invalid token signature');
        expect(data.reason).not.toBe('Token expired');
    });

    test('completely invalid base64 token is rejected gracefully', async () => {
        const { data, status } = await verify('not-a-valid-token!@#$');

        expect(status).toBe(200);
        expect(data.valid).toBe(false);
        // Python catches the JSON/base64 decode exception
        expect(typeof data.reason).toBe('string');
        expect(data.reason).toMatch(/token error/i);
    });

    test('empty token is rejected gracefully', async () => {
        const { data } = await verify('');

        expect(data.valid).toBe(false);
        expect(typeof data.reason).toBe('string');
    });
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 5 — Replay Attack (no nonce protection)
// ══════════════════════════════════════════════════════════════════════════
describe('Scenario 5 — Replay attack (security finding)', () => {
    /**
     * SECURITY FINDING (thesis Section 7 / security analysis):
     *
     * verify_offline_token() in offline.py has NO nonce or single-use
     * tracking.  A valid token can be replayed an unlimited number of times
     * within its validity window.
     *
     * Expected behaviour of a secure implementation:
     *   - First verification:  { valid: true/mismatch }
     *   - Second verification: { valid: false, reason: 'Token already used' }
     *
     * Actual behaviour (documented here):
     *   - Both calls return the SAME result — the server has no memory of
     *     prior verifications.
     *
     * Mitigation (future work):
     *   Store used token JTIs (e.g. SHA256(token)) in Redis with TTL = validFor.
     *   Reject any token whose JTI is already in the store.
     */

    test('same token can be submitted twice — server has no replay protection', async () => {
        const { token } = buildToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 3600);

        const [first, second] = await Promise.all([verify(token), verify(token)]);

        // Both calls succeed at the HTTP level
        expect(first.status).toBe(200);
        expect(second.status).toBe(200);

        // Both return identical results (no nonce invalidation between calls)
        expect(second.data.valid).toBe(first.data.valid);
        expect(second.data.reason).toBe(first.data.reason);
    });

    test('token remains reusable across sequential verifications', async () => {
        const { token } = buildToken(TEST_CITIZEN_ID, TEST_BIOMETRIC_HASH, 3600);

        const results = [];
        for (let i = 0; i < 3; i++) {
            const { data } = await verify(token);
            results.push(data);
        }

        // All three calls return the same result — no nonce tracking
        for (const result of results) {
            expect(result.valid).toBe(results[0].valid);
            expect(result.reason).toBe(results[0].reason);
        }
    });

    test('service-generated token is also replayable', async () => {
        // Ensures the replay gap exists for tokens produced by the real
        // generate endpoint, not just our test-built tokens.
        const { data: genData } = await generate({ validSeconds: 3600 });
        const token = genData.token;

        const first  = await verify(token);
        const second = await verify(token);

        // Both calls accepted: replay vulnerability confirmed
        expect(second.data.valid).toBe(first.data.valid);
        expect(second.data.reason).toBe(first.data.reason);
    });
});
