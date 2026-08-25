#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import {
  inspectProductionSmokeOutputPreflight,
  productionSmokeRequiredOutputs,
} from "../../lib/build/production-smoke-output-preflight.mjs";
import { inspectApiEdgeRequest } from "../../lib/security/api-edge-boundary.ts";
import {
  applyProductionSmokeNetworkEnvironment,
  buildServerOwnedSmokeHeaders,
  createProductionSmokeNetwork,
  evaluateProductionSmokeCoreHttpContract,
  isProductionSmokeProcessReady,
  productionSmokeNetworkDisclosure,
  requestProductionSmokeEndpoint,
  resolveProductionSmokePort,
} from "./production-smoke-network.mjs";
import {
  inspectProductionSmokeEvidence,
  productionSmokeExpectedAssertionNames,
  productionSmokeExpectedResultIdentities,
} from "./production-smoke-evidence.mjs";
import { createPortableRejectedSymlink } from "../pass36/portable-symlink-negative-fixture.mjs";

let assertions = 0;
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function ok(value, message) {
  assert.ok(value, message);
  assertions += 1;
}

function throws(callback, expected, message) {
  assert.throws(callback, expected, message);
  assertions += 1;
}

async function rejects(callback, expected, message) {
  await assert.rejects(callback, expected, message);
  assertions += 1;
}

const observedRequests = [];
const server = createServer((request, response) => {
  observedRequests.push({
    method: request.method,
    url: request.url,
    host: request.headers.host,
    forwardedProto: request.headers["x-forwarded-proto"],
  });
  if (request.url === "/redirect") {
    response.writeHead(307, { location: "/ready" });
    response.end();
    return;
  }
  if (request.url === "/ready") {
    response.writeHead(200, {
      "content-type": "application/json",
      "referrer-policy": "strict-origin-when-cross-origin",
    });
    response.end('{"ready":true}');
    return;
  }
  response.writeHead(503, { "content-type": "application/json" });
  response.end('{"ready":false}');
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "localhost", resolve);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const network = createProductionSmokeNetwork(address.port);
  const expectedTransportOrigin = `http://localhost:${address.port}`;
  const expectedCanonicalOrigin = `https://localhost:${address.port}`;

  equal(network.transportOrigin, expectedTransportOrigin, "HTTP loopback transport");
  equal(network.canonicalOrigin, expectedCanonicalOrigin, "logical HTTPS origin");
  equal(network.forwardedProto, "https", "forwarded HTTPS scheme");
  equal(network.realTlsExecuted, false, "real TLS is not claimed");

  const environment = applyProductionSmokeNetworkEnvironment({
    NODE_ENV: "development",
    HOSTNAME: "attacker.invalid",
    PORT: "1",
    VELMERE_CANONICAL_ORIGIN: "https://attacker.invalid",
    NEXT_PUBLIC_SITE_URL: "https://attacker.invalid",
    VELMERE_ALLOWED_ORIGINS: "https://attacker.invalid",
    PRESERVED_VALUE: "preserved",
  }, network);
  equal(environment.NODE_ENV, "production", "production environment");
  equal(environment.HOSTNAME, "localhost", "loopback host");
  equal(environment.PORT, String(address.port), "bound port");
  equal(environment.VELMERE_CANONICAL_ORIGIN, expectedCanonicalOrigin, "canonical origin");
  equal(environment.NEXT_PUBLIC_SITE_URL, expectedCanonicalOrigin, "public site URL");
  equal(environment.VELMERE_ALLOWED_ORIGINS, expectedCanonicalOrigin, "allowed origin");
  equal(environment.PRESERVED_VALUE, "preserved", "unrelated environment preserved");

  const serverOwnedHeaders = buildServerOwnedSmokeHeaders({
    "x-forwarded-proto": "http",
    "x-test-header": "present",
  }, network);
  equal(serverOwnedHeaders.get("x-forwarded-proto"), "https", "caller cannot downgrade proxy scheme");
  equal(serverOwnedHeaders.get("x-test-header"), "present", "probe header preserved");

  const direct = await requestProductionSmokeEndpoint(network, "/ready", {
    headers: { "x-forwarded-proto": "http" },
  });
  equal(direct.status, 200, "real HTTP request succeeds");
  equal(direct.redirected, false, "direct request is not redirected");
  equal(
    direct.headers.referrerPolicy,
    "strict-origin-when-cross-origin",
    "referrer policy is captured",
  );
  equal(observedRequests.at(-1)?.host, `localhost:${address.port}`, "transport Host header");
  equal(observedRequests.at(-1)?.forwardedProto, "https", "server-owned forwarded scheme reaches server");

  const redirected = await requestProductionSmokeEndpoint(network, "/redirect");
  equal(redirected.status, 200, "redirect target succeeds");
  equal(redirected.redirected, true, "redirect is recorded");
  equal(new URL(redirected.finalUrl).pathname, "/ready", "redirect target path");

  equal(isProductionSmokeProcessReady({ status: 503 }), true, "HTTP 503 still proves process readiness");
  equal(isProductionSmokeProcessReady({ status: 200 }), true, "HTTP 200 proves process readiness");
  equal(isProductionSmokeProcessReady(null), false, "missing response is not ready");
  equal(isProductionSmokeProcessReady({ status: 99 }), false, "invalid HTTP status is not ready");

  throws(() => resolveProductionSmokePort(0), /invalid production smoke port/u, "port zero rejected");
  throws(() => resolveProductionSmokePort(65_536), /invalid production smoke port/u, "oversized port rejected");
  throws(() => resolveProductionSmokePort("not-a-port"), /invalid production smoke port/u, "non-numeric port rejected");
  await rejects(
    () => requestProductionSmokeEndpoint(network, "https://attacker.invalid/ready"),
    /origin-relative path/u,
    "absolute URL rejected",
  );
  await rejects(
    () => requestProductionSmokeEndpoint(network, "//attacker.invalid/ready"),
    /origin-relative path/u,
    "network-path reference rejected",
  );
  await rejects(
    () => requestProductionSmokeEndpoint(network, "/ready", { requestTimeoutMs: 0 }),
    /invalid production smoke request timeout/u,
    "invalid timeout rejected",
  );

  const requestHeaders = {
    host: `localhost:${address.port}`,
    "x-forwarded-proto": "https",
  };
  const canonicalRequest = new Request(`${expectedCanonicalOrigin}/api/auth/session`, {
    headers: requestHeaders,
  });
  const unconfigured = inspectApiEdgeRequest(canonicalRequest, {
    NODE_ENV: "production",
  });
  equal(unconfigured.ok, false, "production edge rejects missing canonical origin");
  equal(unconfigured.status, 503, "missing canonical origin is unavailable");
  equal(unconfigured.mode, "api_canonical_origin_not_configured", "missing canonical origin mode");

  const configured = inspectApiEdgeRequest(canonicalRequest, environment);
  equal(configured.ok, true, "configured logical HTTPS request is accepted");

  const trustedProxyEnvironment = {
    ...environment,
    VELMERE_TRUSTED_PROXY_PROFILE: "vercel",
    VERCEL: "1",
    VERCEL_ENV: "preview",
  };
  const trustedProxyTransportRequest = new Request(
    `${expectedTransportOrigin}/api/auth/session`,
    {
      headers: {
        host: `localhost:${address.port}`,
        "x-forwarded-host": `localhost:${address.port}`,
        "x-forwarded-proto": "https",
      },
    },
  );
  const trustedProxyTransport = inspectApiEdgeRequest(
    trustedProxyTransportRequest,
    trustedProxyEnvironment,
  );
  equal(trustedProxyTransport.ok, true, "verified proxy reconstructs the logical HTTPS origin");
  equal(trustedProxyTransport.ok && trustedProxyTransport.canonicalOrigin, expectedCanonicalOrigin, "verified proxy canonical origin");
  const untrustedProxyTransport = inspectApiEdgeRequest(
    trustedProxyTransportRequest,
    environment,
  );
  equal(untrustedProxyTransport.ok, false, "forwarded origin is not trusted without the verified profile");

  const protoConflict = inspectApiEdgeRequest(
    new Request(`${expectedCanonicalOrigin}/api/auth/session`, {
      headers: {
        host: `localhost:${address.port}`,
        "x-forwarded-proto": "http",
      },
    }),
    environment,
  );
  equal(protoConflict.ok, false, "proxy scheme conflict is rejected");
  equal(protoConflict.status, 400, "proxy scheme conflict status");
  equal(protoConflict.mode, "api_forwarded_proto_conflict", "proxy scheme conflict mode");

  const invalidOriginConfiguration = inspectApiEdgeRequest(canonicalRequest, {
    ...environment,
    VELMERE_CANONICAL_ORIGIN: expectedTransportOrigin,
  });
  equal(invalidOriginConfiguration.ok, false, "HTTP production origin configuration is rejected");
  equal(invalidOriginConfiguration.status, 503, "invalid origin configuration status");
  equal(invalidOriginConfiguration.mode, "api_canonical_origin_configuration_invalid", "invalid origin configuration mode");

  const wrongHost = inspectApiEdgeRequest(
    new Request("https://attacker.invalid/api/auth/session", {
      headers: {
        host: "attacker.invalid",
        "x-forwarded-proto": "https",
      },
    }),
    environment,
  );
  equal(wrongHost.ok, false, "untrusted host is rejected");
  equal(wrongHost.status, 403, "untrusted host status");
  equal(wrongHost.mode, "api_host_not_allowed", "untrusted host mode");

  const expectedAssertionNames = productionSmokeExpectedAssertionNames();
  const expectedResultIdentities = productionSmokeExpectedResultIdentities();
  equal(expectedAssertionNames.length, 55, "production smoke assertion denominator");
  equal(new Set(expectedAssertionNames).size, 55, "production smoke assertion names unique");
  equal(expectedResultIdentities.length, 16, "production smoke result denominator");
  equal(new Set(expectedResultIdentities).size, 16, "production smoke result identities unique");

  const evidenceFixture = inspectProductionSmokeEvidence({
    assertions: expectedAssertionNames.map((name) => ({ name, ok: true })),
    results: expectedResultIdentities.map((identity) => {
      const separator = identity.indexOf(" ");
      return { method: identity.slice(0, separator), path: identity.slice(separator + 1) };
    }),
  });
  equal(evidenceFixture.ok, true, "exact evidence identity sets pass");
  equal(evidenceFixture.assertionSet.duplicates.length, 0, "assertion duplicate denominator zero");
  equal(evidenceFixture.resultSet.duplicates.length, 0, "result duplicate denominator zero");

  const duplicateAssertionEvidence = inspectProductionSmokeEvidence({
    assertions: [
      ...expectedAssertionNames.slice(0, -1).map((name) => ({ name, ok: true })),
      { name: expectedAssertionNames[0], ok: true },
    ],
    results: expectedResultIdentities.map((identity) => {
      const separator = identity.indexOf(" ");
      return { method: identity.slice(0, separator), path: identity.slice(separator + 1) };
    }),
  });
  equal(duplicateAssertionEvidence.ok, false, "duplicate assertion identity fails closed");
  equal(duplicateAssertionEvidence.assertionSet.duplicates.length, 1, "duplicate assertion is explicit");
  ok(
    duplicateAssertionEvidence.assertionSet.missing.includes("source_immutable"),
    "duplicate cannot hide a missing assertion",
  );

  const duplicateResultEvidence = inspectProductionSmokeEvidence({
    assertions: expectedAssertionNames.map((name) => ({ name, ok: true })),
    results: [
      ...expectedResultIdentities.slice(0, -1).map((identity) => {
        const separator = identity.indexOf(" ");
        return { method: identity.slice(0, separator), path: identity.slice(separator + 1) };
      }),
      { method: "GET", path: "/icon.svg" },
    ],
  });
  equal(duplicateResultEvidence.ok, false, "duplicate HTTP result identity fails closed");
  equal(duplicateResultEvidence.resultSet.duplicates.length, 1, "duplicate HTTP result is explicit");
  ok(
    duplicateResultEvidence.resultSet.missing.includes("GET /de/real-markets"),
    "duplicate result cannot hide a missing route",
  );

  const coreFixture = {
    session: {
      status: 200,
      headers: { contentType: "application/json; charset=utf-8" },
    },
    en: {
      status: 200,
      redirected: false,
      finalUrl: `${expectedTransportOrigin}/en`,
    },
    robots: {
      status: 200,
      redirected: true,
      finalUrl: `${expectedTransportOrigin}/pl/robots.txt`,
    },
    worker: {
      method: "POST",
      status: 401,
      bodyPrefix: '{"error":"unauthorized_worker_mutation"}',
    },
    stripe: {
      method: "POST",
      status: 400,
      bodyPrefix: '{"error":"missing_signature"}',
    },
  };
  const passingCore = evaluateProductionSmokeCoreHttpContract(coreFixture);
  equal(passingCore.length, 5, "core HTTP assertion denominator");
  ok(passingCore.every((row) => row.ok), "canonical core results pass");

  const redirectedEnglish = evaluateProductionSmokeCoreHttpContract({
    ...coreFixture,
    en: { ...coreFixture.en, redirected: true },
  });
  equal(redirectedEnglish.find((row) => row.name === "en_locale_root_200")?.ok, false, "English locale redirect fails");

  const workerGet = evaluateProductionSmokeCoreHttpContract({
    ...coreFixture,
    worker: { ...coreFixture.worker, method: "GET" },
  });
  equal(workerGet.find((row) => row.name === "worker_without_envelope_401")?.ok, false, "worker GET cannot satisfy POST boundary");

  const sessionUnavailable = evaluateProductionSmokeCoreHttpContract({
    ...coreFixture,
    session: { ...coreFixture.session, status: 503 },
  });
  equal(sessionUnavailable.find((row) => row.name === "auth_session_200")?.ok, false, "session 503 fails application assertion");

  const malformedFinalUrl = evaluateProductionSmokeCoreHttpContract({
    ...coreFixture,
    en: { ...coreFixture.en, finalUrl: "not-a-url" },
  });
  equal(malformedFinalUrl.find((row) => row.name === "en_locale_root_200")?.ok, false, "malformed final URL fails safely");

  const disclosure = productionSmokeNetworkDisclosure(network);
  equal(disclosure.realTlsExecuted, false, "receipt denies real TLS execution");
  equal(disclosure.tlsTermination, "simulated_reverse_proxy", "receipt names simulated proxy");
  ok(disclosure.claimBoundary.includes("not tested"), "receipt states the external TLS boundary");

  const preflightRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-production-smoke-preflight-"));
  try {
    const outputContract = {
      buildIdPath: path.join(preflightRoot, "BUILD_ID"),
      routesManifestPath: path.join(preflightRoot, "routes-manifest.json"),
      requiredServerManifestPath: path.join(preflightRoot, "required-server-files.json"),
      standaloneServerPath: path.join(preflightRoot, "standalone", "server.js"),
      standaloneNextBootstrapPath: path.join(preflightRoot, "standalone", "next", "dist", "server", "lib", "start-server.js"),
      standaloneStartServerPath: path.join(preflightRoot, "standalone", "next", "dist", "server", "lib", "router-server.js"),
      standaloneSwcInteropDefaultPath: path.join(preflightRoot, "standalone", "node_modules", "@swc", "helpers", "esm", "_interop_require_default.js"),
      standaloneSwcInteropWildcardPath: path.join(preflightRoot, "standalone", "node_modules", "@swc", "helpers", "esm", "_interop_require_wildcard.js"),
      standaloneBuildIdPath: path.join(preflightRoot, "standalone", ".next-test", "BUILD_ID"),
      standaloneStaticPath: path.join(preflightRoot, "standalone", ".next-test", "static"),
      standalonePublicPath: path.join(preflightRoot, "standalone", "public"),
    };
    const required = productionSmokeRequiredOutputs(outputContract);
    equal(required.length, 11, "production smoke preflight denominator");
    for (const entry of required) {
      fs.mkdirSync(path.dirname(entry.path), { recursive: true });
      if (entry.kind === "directory") {
        fs.mkdirSync(entry.path, { recursive: true });
        fs.writeFileSync(path.join(entry.path, "asset.bin"), entry.label);
      } else {
        fs.writeFileSync(entry.path, entry.label);
      }
    }
    const passingPreflight = inspectProductionSmokeOutputPreflight(outputContract, {
      reportedPath: (value) => path.relative(preflightRoot, value),
    });
    equal(passingPreflight.ok, true, "plain files and non-empty asset directories pass");
    equal(passingPreflight.passed, 11, "all preflight outputs pass");

    fs.rmSync(outputContract.standaloneStaticPath, { recursive: true });
    fs.writeFileSync(outputContract.standaloneStaticPath, "not-a-directory");
    const wrongDirectoryType = inspectProductionSmokeOutputPreflight(outputContract);
    equal(wrongDirectoryType.ok, false, "file cannot satisfy static directory contract");
    ok(
      wrongDirectoryType.errors.some((value) => value.includes("expected_directory")),
      "wrong static type is explicit",
    );

    fs.rmSync(outputContract.standaloneStaticPath);
    fs.mkdirSync(outputContract.standaloneStaticPath);
    const emptyDirectory = inspectProductionSmokeOutputPreflight(outputContract);
    equal(emptyDirectory.ok, false, "empty static directory is rejected");
    ok(
      emptyDirectory.errors.some((value) => value.includes("empty directory")),
      "empty directory failure is explicit",
    );

    fs.writeFileSync(path.join(outputContract.standaloneStaticPath, "asset.bin"), "static");
    fs.rmSync(outputContract.buildIdPath);
    fs.mkdirSync(outputContract.buildIdPath);
    const wrongFileType = inspectProductionSmokeOutputPreflight(outputContract);
    equal(wrongFileType.ok, false, "directory cannot satisfy file contract");
    ok(
      wrongFileType.errors.some((value) => value.includes("expected_file")),
      "wrong file type is explicit",
    );

    fs.rmSync(outputContract.buildIdPath, { recursive: true });
    const missingFile = inspectProductionSmokeOutputPreflight(outputContract);
    equal(missingFile.ok, false, "missing required file is rejected");
    ok(
      missingFile.errors.some((value) => value.includes("required output missing")),
      "missing output failure is explicit",
    );

    const rejectedLink = createPortableRejectedSymlink(
      outputContract.buildIdPath,
      outputContract.routesManifestPath,
    );
    try {
      const symlinkFile = inspectProductionSmokeOutputPreflight(outputContract);
      equal(symlinkFile.ok, false, "symlink cannot satisfy required output");
      ok(
        symlinkFile.errors.some((value) => value.includes("symlink rejected")),
        "symlink failure is explicit",
      );
    } finally {
      rejectedLink.cleanup();
    }
  } finally {
    fs.rmSync(preflightRoot, { recursive: true, force: true });
  }
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

console.log(JSON.stringify({
  status: "PASS",
  assertions,
  behavior: {
    realHttpServer: true,
    apiEdgeBoundary: true,
    negativeOriginAndProto: true,
    sourceTextInspection: false,
  },
}, null, 2));
