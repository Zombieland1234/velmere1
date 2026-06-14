const devConnect = " ws: http://localhost:*";
const prodUpgrade = "upgrade-insecure-requests";

export function buildContentSecurityPolicy({ isDev = false } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    [
      "img-src 'self' data: blob:",
      "https://assets.coingecko.com",
      "https://coin-images.coingecko.com",
      "https://static.coingecko.com",
      "https://dd.dexscreener.com",
      "https://cdn.dexscreener.com",
      "https://images.unsplash.com",
      "https://s2.coinmarketcap.com",
      "https://raw.githubusercontent.com",
      "https://tokens.1inch.io",
    ].join(" "),
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      "https://generativelanguage.googleapis.com",
      "https://api.stripe.com",
      "https://api.printful.com",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://relay.walletconnect.com",
      "wss://relay.walletconnect.com",
      "https://explorer-api.walletconnect.com",
      isDev ? devConnect : "",
    ].filter(Boolean).join(" "),
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'self' blob: https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : [prodUpgrade]),
  ].join("; ");
}

export function buildSecurityHeaders({ isDev = false } = {}) {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy({ isDev }) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(self), picture-in-picture=(self), publickey-credentials-get=(self), usb=(), clipboard-read=(), clipboard-write=(self)" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "Origin-Agent-Cluster", value: "?1" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ];
}

export function buildSecurityReadinessSnapshot() {
  return {
    schemaVersion: "velmere-security-readiness-v1",
    mode: "security_headers_api_guard_preview",
    generatedAt: new Date().toISOString(),
    implemented: [
      "Content-Security-Policy",
      "HSTS",
      "frame deny",
      "nosniff",
      "referrer policy",
      "permissions policy",
      "COOP",
      "CORP",
      "origin agent cluster",
      "DNS prefetch off",
      "cross-domain policy none",
      "API JSON no-store helper",
      "API method/query/rate-limit guard",
      "token icon SSRF/content-type/size guard",
    ],
    notImplemented: [
      "full WAF",
      "bot management",
      "durable distributed rate-limit store",
      "penetration test",
      "CSP nonce rollout",
      "production SIEM",
    ],
    boundary:
      "Security hardening reduces common web risk but is not a guarantee. Production still needs secret review, dependency scanning, provider settings and real browser/security testing.",
  };
}
