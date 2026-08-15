#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import process from 'node:process';

const listenHost = String(process.env.P61_PROXY_LISTEN_HOST || '127.0.0.1');
const listenPort = Number(process.env.P61_PROXY_LISTEN_PORT || 3443);
const publicHost = String(process.env.P61_PROXY_PUBLIC_HOST || `localhost:${listenPort}`);
const upstreamHost = String(process.env.P61_PROXY_UPSTREAM_HOST || '127.0.0.1');
const upstreamPort = Number(process.env.P61_PROXY_UPSTREAM_PORT || 3110);
const pfxPath = String(process.env.P61_PROXY_PFX_PATH || '').trim();
const pfxPassphrase = String(process.env.P61_PROXY_PFX_PASSPHRASE || '');

if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535) throw new Error(`invalid_listen_port:${listenPort}`);
if (!Number.isInteger(upstreamPort) || upstreamPort < 1 || upstreamPort > 65535) throw new Error(`invalid_upstream_port:${upstreamPort}`);
if (!pfxPath || !fs.existsSync(pfxPath)) throw new Error(`pfx_missing:${pfxPath}`);
if (!pfxPassphrase) throw new Error('pfx_passphrase_missing');
if (!/^[a-z0-9.-]+:\d{1,5}$/iu.test(publicHost)) throw new Error(`public_host_invalid:${publicHost}`);

const hopByHop = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function filteredHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !hopByHop.has(name.toLowerCase())));
}

const server = https.createServer(
  { pfx: fs.readFileSync(pfxPath), passphrase: pfxPassphrase, minVersion: 'TLSv1.2' },
  (request, response) => {
    const headers = filteredHeaders(request.headers);
    headers.host = publicHost;
    headers['x-forwarded-host'] = publicHost;
    headers['x-forwarded-proto'] = 'https';
    delete headers.forwarded;

    const upstream = http.request({
      hostname: upstreamHost,
      port: upstreamPort,
      method: request.method,
      path: request.url,
      headers,
    }, (upstreamResponse) => {
      const responseHeaders = filteredHeaders(upstreamResponse.headers);
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.statusMessage, responseHeaders);
      upstreamResponse.pipe(response);
    });

    upstream.on('error', (error) => {
      if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: false, mode: 'p61_https_proxy_upstream_error', error: `${error.name}: ${error.message}` }));
    });
    request.pipe(upstream);
  },
);

server.on('clientError', (error, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  console.error(`P61_PROXY_CLIENT_ERROR ${error.name}: ${error.message}`);
});

server.listen(listenPort, listenHost, () => {
  console.log(JSON.stringify({
    schemaVersion: 'velmere.p61.local-https-canonical-origin-proxy.v1',
    status: 'READY',
    listen: `https://${publicHost}`,
    upstream: `http://${upstreamHost}:${upstreamPort}`,
    forwardedProfile: { host: publicHost, proto: 'https' },
  }));
});

function shutdown(signal) {
  console.log(`P61_PROXY_SHUTDOWN ${signal}`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
