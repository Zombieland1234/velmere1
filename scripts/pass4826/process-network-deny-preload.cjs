"use strict";

// Defense in depth for Node processes. This is deliberately named process-level:
// it does not create an OS network namespace and must never be reported as an air-gap.

const { syncBuiltinESMExports } = require("node:module");

const ERROR_CODE = "VELMERE_PROCESS_NETWORK_DENIED";
function denied(operation) {
  const error = new Error(`Process-level network access denied: ${operation}`);
  error.code = ERROR_CODE;
  error.networkIsolationLevel = "process_preload_only";
  throw error;
}

function denyFunction(operation) {
  return function processNetworkDenied() {
    return denied(operation);
  };
}

function replace(target, key, operation = key) {
  if (target && typeof target[key] === "function") target[key] = denyFunction(operation);
}

const net = require("node:net");
replace(net, "connect", "net.connect");
replace(net, "createConnection", "net.createConnection");
replace(net.Socket?.prototype, "connect", "net.Socket.connect");
replace(net.Server?.prototype, "listen", "net.Server.listen");

const tls = require("node:tls");
replace(tls, "connect", "tls.connect");
replace(tls.TLSSocket?.prototype, "connect", "tls.TLSSocket.connect");

for (const protocol of ["http", "https"]) {
  const module = require(`node:${protocol}`);
  replace(module, "request", `${protocol}.request`);
  replace(module, "get", `${protocol}.get`);
}

const http2 = require("node:http2");
replace(http2, "connect", "http2.connect");
replace(http2, "createServer", "http2.createServer");
replace(http2, "createSecureServer", "http2.createSecureServer");

const dns = require("node:dns");
for (const key of [
  "lookup",
  "lookupService",
  "resolve",
  "resolve4",
  "resolve6",
  "resolveAny",
  "resolveCaa",
  "resolveCname",
  "resolveMx",
  "resolveNaptr",
  "resolveNs",
  "resolvePtr",
  "resolveSoa",
  "resolveSrv",
  "resolveTxt",
  "reverse",
]) replace(dns, key, `dns.${key}`);
for (const key of Object.getOwnPropertyNames(dns.Resolver?.prototype ?? {})) {
  if (key !== "constructor") replace(dns.Resolver.prototype, key, `dns.Resolver.${key}`);
}

const dnsPromises = require("node:dns/promises");
for (const key of Object.keys(dnsPromises)) replace(dnsPromises, key, `dns.promises.${key}`);
for (const key of Object.getOwnPropertyNames(dnsPromises.Resolver?.prototype ?? {})) {
  if (key !== "constructor") replace(dnsPromises.Resolver.prototype, key, `dns.promises.Resolver.${key}`);
}

const dgram = require("node:dgram");
replace(dgram, "createSocket", "dgram.createSocket");

if (typeof globalThis.fetch === "function") globalThis.fetch = denyFunction("global.fetch");
if (typeof globalThis.WebSocket === "function") globalThis.WebSocket = denyFunction("global.WebSocket");
if (typeof globalThis.EventSource === "function") globalThis.EventSource = denyFunction("global.EventSource");

syncBuiltinESMExports();
process.env.VELMERE_PROCESS_NETWORK_DENY_ACTIVE = "1";
process.env.VELMERE_NETWORK_ISOLATION_LEVEL = "process_preload_only";
Object.defineProperty(globalThis, "__VELMERE_PROCESS_NETWORK_DENY__", {
  value: Object.freeze({ active: true, level: "process_preload_only", errorCode: ERROR_CODE }),
  configurable: false,
  enumerable: false,
  writable: false,
});
