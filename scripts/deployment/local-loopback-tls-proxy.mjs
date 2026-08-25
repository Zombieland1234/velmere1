#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const exactLoopback = "127.0.0.1";
const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function parsePort(name) {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < 1024 || value > 65535) {
    throw new TypeError(`${name}_must_be_a_non_privileged_port`);
  }
  return value;
}

function exactRegularFile(name) {
  const value = String(process.env[name] ?? "");
  if (!path.isAbsolute(value)) throw new TypeError(`${name}_must_be_absolute`);
  const metadata = fs.lstatSync(value);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new TypeError(`${name}_must_be_a_regular_file`);
  }
  return value;
}

const listenPort = parsePort("VELMERE_LOCAL_TLS_PORT");
const targetPort = parsePort("VELMERE_LOCAL_HTTP_TARGET_PORT");
if (listenPort === targetPort) throw new TypeError("tls_and_http_ports_must_differ");
const keyPath = exactRegularFile("VELMERE_LOCAL_TLS_KEY_PATH");
const certPath = exactRegularFile("VELMERE_LOCAL_TLS_CERT_PATH");
const publicHost = `${exactLoopback}:${listenPort}`;
const upstreamLogicalProto = String(process.env.VELMERE_LOCAL_UPSTREAM_LOGICAL_PROTO ?? "https").trim();
if (!new Set(["http", "https"]).has(upstreamLogicalProto)) {
  throw new TypeError("VELMERE_LOCAL_UPSTREAM_LOGICAL_PROTO_must_be_http_or_https");
}

const server = https.createServer({
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
  minVersion: "TLSv1.2",
}, (request, response) => {
  const headers = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (!hopByHopHeaders.has(name) && name !== "forwarded" && !name.startsWith("x-forwarded-")) {
      headers[name] = value;
    }
  }
  headers.host = publicHost;
  headers["x-forwarded-host"] = publicHost;
  headers["x-forwarded-proto"] = upstreamLogicalProto;
  headers["x-forwarded-for"] = exactLoopback;

  const upstream = http.request({
    hostname: exactLoopback,
    port: targetPort,
    method: request.method,
    path: request.url,
    headers,
  }, (upstreamResponse) => {
    const outgoingHeaders = {};
    for (const [name, value] of Object.entries(upstreamResponse.headers)) {
      if (!hopByHopHeaders.has(name)) outgoingHeaders[name] = value;
    }
    response.writeHead(upstreamResponse.statusCode ?? 502, outgoingHeaders);
    upstreamResponse.pipe(response);
  });
  upstream.on("error", () => {
    if (!response.headersSent) {
      response.writeHead(502, {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
        "x-content-type-options": "nosniff",
      });
    }
    response.end("loopback upstream unavailable");
  });
  request.on("aborted", () => upstream.destroy());
  request.pipe(upstream);
});

server.on("clientError", (_error, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});
server.listen(listenPort, exactLoopback, () => {
  process.stdout.write(`${JSON.stringify({
    status: "READY",
    listenOrigin: `https://${publicHost}`,
    targetOrigin: `http://${exactLoopback}:${targetPort}`,
    certificateTrust: "LOCAL_SELF_SIGNED_BROWSER_HARNESS_ONLY",
    upstreamLogicalProto,
    productionRuntimeParity: upstreamLogicalProto === "https",
    productionTlsCredit: false,
    externalNetworkReachable: false,
  })}\n`);
});

const stop = () => server.close(() => process.exit(0));
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
