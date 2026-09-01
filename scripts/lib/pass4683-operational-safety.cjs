'use strict';

const crypto = require('crypto');
const SENSITIVE_KEY = /(authorization|cookie|token|secret|password|api[-_]?key|private[-_]?key|session)/i;
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const MAX_STRING_LENGTH = 500;
const MAX_EVENT_BYTES = 8192;
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 80;

function sanitizeRequestId(value) {
  const candidate = String(value ?? '').trim();
  return SAFE_REQUEST_ID.test(candidate) ? candidate : crypto.randomUUID();
}

function replaceControlCharacters(value) {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127 ? ' ' : character;
  }).join('');
}

function redactOperationalValue(value, key = '', depth = 0, seen = new WeakSet()) {
  if (SENSITIVE_KEY.test(String(key))) return '[REDACTED]';
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'string') return replaceControlCharacters(value).slice(0, MAX_STRING_LENGTH);
  if (typeof value === 'function' || typeof value === 'symbol') return `[${typeof value}]`;
  if (depth >= MAX_DEPTH) return '[MAX_DEPTH]';
  if (typeof value === 'object') {
    if (seen.has(value)) return '[CIRCULAR]';
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map((entry) => redactOperationalValue(entry, '', depth + 1, seen));
    const output = {};
    for (const [entryKey, entryValue] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
      output[entryKey] = redactOperationalValue(entryValue, entryKey, depth + 1, seen);
    }
    return output;
  }
  return String(value).slice(0, MAX_STRING_LENGTH);
}

function serializeOperationalEvent(event, details = {}, at = new Date().toISOString()) {
  const safe = redactOperationalValue({ event: String(event).slice(0, 120), at, ...details });
  let encoded = JSON.stringify(safe);
  if (Buffer.byteLength(encoded, 'utf8') > MAX_EVENT_BYTES) {
    encoded = JSON.stringify({ event: safe.event, at: safe.at, truncated: true, originalBytes: Buffer.byteLength(encoded, 'utf8') });
  }
  return encoded;
}

module.exports = {
  MAX_EVENT_BYTES,
  redactOperationalValue,
  sanitizeRequestId,
  serializeOperationalEvent,
};
