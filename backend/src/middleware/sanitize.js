/**
 * Input sanitization middleware
 *
 * Strips HTML tags, <script> blocks, javascript: URIs, and inline event
 * handlers from every string value in req.body before it reaches a handler.
 * Applied globally in server.js so no route needs its own escaping.
 *
 * Fields that are intentionally opaque binary blobs (biometricHash,
 * biometricTemplate, passwordHash, qrData, image) are skipped to avoid
 * corrupting base64 / hash payloads.
 */

const SKIP_FIELDS = new Set([
  'password',
  'biometricHash',
  'biometricTemplate',
  'passwordHash',
  'qrData',
  'image',
  'token',
]);

function sanitizeString(str) {
  return str
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') // full script blocks
    .replace(/<[^>]+>/g, '')                              // remaining HTML tags
    .replace(/javascript\s*:/gi, '')                      // js: protocol
    .replace(/on\w+\s*=/gi, '');                          // inline event handlers
}

function sanitizeValue(value, key) {
  if (typeof key === 'string' && SKIP_FIELDS.has(key)) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(item => sanitizeValue(item, null));
  if (value !== null && typeof value === 'object') return sanitizeObject(value);
  return value;
}

function sanitizeObject(obj) {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = sanitizeValue(val, key);
  }
  return result;
}

module.exports = function sanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};
