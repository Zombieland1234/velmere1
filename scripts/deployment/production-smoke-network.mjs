const SMOKE_HOST = "localhost";
const FORWARDED_PROTO = "https";

export function resolveProductionSmokePort(raw) {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`invalid production smoke port:${String(raw)}`);
  }
  return port;
}

export function createProductionSmokeNetwork(rawPort) {
  const port = resolveProductionSmokePort(rawPort);
  return Object.freeze({
    port,
    host: SMOKE_HOST,
    transportOrigin: `http://${SMOKE_HOST}:${port}`,
    canonicalOrigin: `https://${SMOKE_HOST}:${port}`,
    forwardedProto: FORWARDED_PROTO,
    transport: "http_loopback",
    tlsTermination: "simulated_reverse_proxy",
    realTlsExecuted: false,
  });
}

export function applyProductionSmokeNetworkEnvironment(
  inheritedEnvironment,
  network,
) {
  return {
    ...inheritedEnvironment,
    NODE_ENV: "production",
    HOSTNAME: network.host,
    PORT: String(network.port),
    VELMERE_CANONICAL_ORIGIN: network.canonicalOrigin,
    NEXT_PUBLIC_SITE_URL: network.canonicalOrigin,
    VELMERE_ALLOWED_ORIGINS: network.canonicalOrigin,
  };
}

export function buildServerOwnedSmokeHeaders(input, network) {
  const headers = new Headers(input);
  // The smoke runner owns this header and models a TLS-terminating reverse
  // proxy. Individual probes cannot downgrade or replace the logical scheme.
  headers.set("x-forwarded-proto", network.forwardedProto);
  return headers;
}

export async function requestProductionSmokeEndpoint(
  network,
  pathname,
  {
    method = "GET",
    body,
    headers,
    redirect = "follow",
    requestTimeoutMs = 15_000,
  } = {},
) {
  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//")
  ) {
    throw new Error("production smoke pathname must be an origin-relative path");
  }
  if (
    !Number.isFinite(requestTimeoutMs) ||
    requestTimeoutMs < 1 ||
    requestTimeoutMs > 120_000
  ) {
    throw new Error("invalid production smoke request timeout");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(`${network.transportOrigin}${pathname}`, {
      method,
      body,
      headers: buildServerOwnedSmokeHeaders(headers, network),
      redirect,
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      path: pathname,
      method,
      status: response.status,
      redirected: response.redirected,
      finalUrl: response.url,
      durationMs: Date.now() - started,
      bytes: Buffer.byteLength(text),
      bodyPrefix: text.slice(0, 300),
      headers: {
        contentType: response.headers.get("content-type"),
        location: response.headers.get("location"),
        xFrameOptions: response.headers.get("x-frame-options"),
        xContentTypeOptions: response.headers.get("x-content-type-options"),
        contentSecurityPolicy: response.headers.get("content-security-policy"),
        referrerPolicy: response.headers.get("referrer-policy"),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export function isProductionSmokeProcessReady(probe) {
  return Boolean(
    probe &&
    Number.isInteger(probe.status) &&
    probe.status >= 100 &&
    probe.status <= 599,
  );
}

function responsePathname(response) {
  try {
    return new URL(response?.finalUrl).pathname;
  } catch {
    return null;
  }
}

export function evaluateProductionSmokeCoreHttpContract({
  session,
  en,
  robots,
  worker,
  stripe,
}) {
  return [
    {
      name: "auth_session_200",
      ok:
        session?.status === 200 &&
        session.headers?.contentType?.includes("application/json"),
      evidence: session,
    },
    {
      name: "en_locale_root_200",
      ok:
        en?.status === 200 &&
        en.redirected === false &&
        responsePathname(en) === "/en",
      evidence: en,
    },
    {
      name: "robots_localized_200",
      ok:
        robots?.status === 200 &&
        robots.redirected === true &&
        responsePathname(robots) === "/pl/robots.txt",
      evidence: robots,
    },
    {
      name: "worker_without_envelope_401",
      ok:
        worker?.method === "POST" &&
        worker.status === 401 &&
        worker.bodyPrefix?.includes("unauthorized_worker_mutation"),
      evidence: worker,
    },
    {
      name: "stripe_without_signature_400",
      ok: stripe?.method === "POST" && stripe.status === 400,
      evidence: stripe,
    },
  ];
}

export function productionSmokeNetworkDisclosure(network) {
  return {
    transportOrigin: network.transportOrigin,
    logicalCanonicalOrigin: network.canonicalOrigin,
    forwardedProto: network.forwardedProto,
    transport: network.transport,
    tlsTermination: network.tlsTermination,
    realTlsExecuted: network.realTlsExecuted,
    claimBoundary:
      "Local HTTP loopback with a server-owned forwarded HTTPS scheme models application behavior behind a TLS-terminating reverse proxy. Real TLS negotiation, certificates and external proxy behavior are not tested.",
  };
}
