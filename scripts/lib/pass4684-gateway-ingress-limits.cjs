'use strict';

const DEFAULT_MAX_BODY_BYTES = 16 * 1024 * 1024;

function parseBoundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function assertDistinctGatewayPorts({ publicPort, pagesPort, apiPort }) {
  const ports = [publicPort, pagesPort, apiPort];
  if (new Set(ports).size !== ports.length) {
    throw new Error('gateway_port_collision');
  }
  return true;
}

function buildGatewayIngressLimits(env = process.env) {
  const maxBodyBytes = parseBoundedInteger(
    env.VELMERE_GATEWAY_MAX_BODY_BYTES,
    DEFAULT_MAX_BODY_BYTES,
    64 * 1024,
    64 * 1024 * 1024,
  );
  const maxHeadersCount = parseBoundedInteger(
    env.VELMERE_GATEWAY_MAX_HEADERS_COUNT,
    128,
    16,
    1024,
  );
  const maxConnections = parseBoundedInteger(
    env.VELMERE_GATEWAY_MAX_CONNECTIONS,
    2048,
    32,
    100_000,
  );
  return { maxBodyBytes, maxHeadersCount, maxConnections };
}

function declaredBodyLength(headers) {
  const raw = headers?.['content-length'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return null;
  if (!/^\d+$/.test(String(value))) return Number.NaN;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function createIngressBodyBudget(maxBodyBytes, headers = {}) {
  const limit = parseBoundedInteger(maxBodyBytes, DEFAULT_MAX_BODY_BYTES, 64 * 1024, 64 * 1024 * 1024);
  const declared = declaredBodyLength(headers);
  let received = 0;
  let exceeded = Number.isNaN(declared) || (declared !== null && declared > limit);
  return {
    limit,
    declared,
    observe(chunk) {
      if (exceeded) return false;
      received += Buffer.byteLength(chunk);
      if (received > limit) exceeded = true;
      return !exceeded;
    },
    snapshot() {
      return { limit, declared, received, exceeded };
    },
  };
}

module.exports = {
  DEFAULT_MAX_BODY_BYTES,
  parseBoundedInteger,
  assertDistinctGatewayPorts,
  buildGatewayIngressLimits,
  declaredBodyLength,
  createIngressBodyBudget,
};
