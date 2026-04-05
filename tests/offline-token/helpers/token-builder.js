'use strict';

/**
 * token-builder.js
 *
 * JavaScript port of the Python offline token algorithm from
 * biometric/routes/offline.py — generate_offline_token() and the
 * token-construction logic inside verify_offline_token().
 *
 * Used exclusively by the test suite to construct controlled token
 * fixtures (valid, expired, tampered) without running the biometric service.
 *
 * Algorithm (must stay in sync with offline.py):
 *   payload     = { biometricHash, citizenId, expiry, issuedAt }   ← sorted keys
 *   payload_str = json.dumps(payload, sort_keys=True)               ← Python default separators
 *   signature   = sha256(payload_str + 'offline_secret_key_2025')   ← hex digest
 *   token       = base64( json.dumps({ payload, signature }) )
 */

const crypto = require('crypto');

// Must match the constant in offline.py
const OFFLINE_SECRET = 'offline_secret_key_2025';

/**
 * Replicate Python's json.dumps(obj, sort_keys=True).
 *
 * Python's default separators are (', ', ': ') — a space after both
 * the comma and colon.  JS JSON.stringify uses no spaces, so we cannot
 * use it directly for the payload string.
 */
function sortedDumps(obj) {
    if (obj === null) return 'null';
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'number') return String(obj);
    if (typeof obj === 'string') return JSON.stringify(obj); // handles escaping
    if (Array.isArray(obj)) {
        return '[' + obj.map(sortedDumps).join(', ') + ']';
    }
    // Object — sort keys alphabetically (Python sort_keys=True)
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(k => `"${k}": ${sortedDumps(obj[k])}`);
    return '{' + pairs.join(', ') + '}';
}

/**
 * Build a valid offline token.
 *
 * @param {string} citizenId
 * @param {string} biometricHash
 * @param {number} validSeconds  defaults to 86400 (24 h)
 * @returns {object} { token, expiry, validFor, payload, signature }
 */
function buildToken(citizenId, biometricHash, validSeconds = 86400) {
    const now    = Math.floor(Date.now() / 1000);
    const expiry = now + validSeconds;

    const payload = { biometricHash, citizenId, expiry, issuedAt: now };
    const payloadStr = sortedDumps(payload);

    const signature = crypto
        .createHash('sha256')
        .update(payloadStr + OFFLINE_SECRET)
        .digest('hex');

    // Outer JSON: Python insertion order is payload → signature
    const token = Buffer
        .from(JSON.stringify({ payload, signature }))
        .toString('base64');

    return { token, expiry, validFor: validSeconds, payload, signature };
}

/**
 * Build a token that expired `secondsAgo` seconds in the past.
 * Signature is valid; only the expiry timestamp is in the past.
 */
function buildExpiredToken(citizenId, biometricHash, secondsAgo = 3600) {
    return buildToken(citizenId, biometricHash, -secondsAgo);
}

/**
 * Tamper with a token by modifying a field in the decoded payload,
 * then re-encoding WITHOUT updating the signature.
 *
 * This simulates an attacker flipping a citizenId after issuance.
 * The original signature will no longer match the modified payload.
 *
 * @param {string} token   a base64 token string (from buildToken)
 * @param {object} overrides  fields to overwrite in payload, e.g. { citizenId: 'ATTACKER' }
 * @returns {string}  tampered base64 token (invalid signature)
 */
function tamperToken(token, overrides = { citizenId: 'TAMPERED-CITIZEN' }) {
    const decoded   = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const tamperedPayload = { ...decoded.payload, ...overrides };

    // Re-encode with the ORIGINAL signature — it will no longer verify
    return Buffer
        .from(JSON.stringify({ payload: tamperedPayload, signature: decoded.signature }))
        .toString('base64');
}

/**
 * Decode a token back to its JSON representation for inspection.
 */
function decodeToken(token) {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
}

// ── Minimal test image ──────────────────────────────────────────────────────
//
// A 1×1 white-pixel BMP (24-bit RGB, no compression).
// BMP is chosen because it requires no compression and its exact byte layout
// is well-defined, making it trivial to construct without external libraries.
//
// OpenCV (cv2.imdecode) fully supports BMP via IMREAD_COLOR.  The image
// processing pipeline will:
//   1. Decode → 1×1 BGR [255, 255, 255]
//   2. preprocess_fingerprint → 256×256 uniform gray
//   3. ORB returns no keypoints (uniform image) → descriptors = None
//   4. HOG fallback on 128×128 uniform gray → deterministic all-zero-ish features
//   5. compute_feature_hash(features) → deterministic HMAC-SHA256
//
// The resulting biometric hash is deterministic but does NOT match any
// token we build in tests (we use arbitrary test hashes in our tokens).
// This is expected — tests for expired/tampered tokens fail before the
// biometric check anyway; the "valid structure" test explicitly asserts
// 'Biometric mismatch' to prove the cryptographic checks passed.
const TEST_IMAGE_BMP = Buffer.from([
    // ── File header (14 bytes) ─────────────────────────────────────────
    0x42, 0x4D,             // Signature: 'BM'
    0x3A, 0x00, 0x00, 0x00, // File size: 58 bytes
    0x00, 0x00, 0x00, 0x00, // Reserved
    0x36, 0x00, 0x00, 0x00, // Pixel data offset: 54 bytes

    // ── BITMAPINFOHEADER (40 bytes) ────────────────────────────────────
    0x28, 0x00, 0x00, 0x00, // Header size: 40
    0x01, 0x00, 0x00, 0x00, // Width: 1 px
    0x01, 0x00, 0x00, 0x00, // Height: 1 px (positive = bottom-up)
    0x01, 0x00,             // Planes: 1
    0x18, 0x00,             // Bits per pixel: 24
    0x00, 0x00, 0x00, 0x00, // Compression: BI_RGB (none)
    0x04, 0x00, 0x00, 0x00, // Image size: 4 bytes (1px×3 + 1 byte row padding)
    0x00, 0x00, 0x00, 0x00, // X pixels/meter
    0x00, 0x00, 0x00, 0x00, // Y pixels/meter
    0x00, 0x00, 0x00, 0x00, // Colors in table
    0x00, 0x00, 0x00, 0x00, // Important colors

    // ── Pixel data (4 bytes: 1 white BGR pixel + 1 byte row padding) ───
    0xFF, 0xFF, 0xFF, 0x00,
]);

const TEST_IMAGE_B64 = TEST_IMAGE_BMP.toString('base64');

module.exports = {
    buildToken,
    buildExpiredToken,
    tamperToken,
    decodeToken,
    sortedDumps,
    TEST_IMAGE_B64,
    OFFLINE_SECRET,
};
