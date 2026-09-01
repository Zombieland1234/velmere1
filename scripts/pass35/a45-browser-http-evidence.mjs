import crypto from "node:crypto";

const MAX_URL_CHARS = 16_384;
const MAX_QUERY_KEYS = 32;
const MAX_QUERY_KEY_CHARS = 64;
const MAX_TEXT_BYTES = 8_192;
const MAX_TEXT_INPUT_CHARS = 32_768;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SENSITIVE_TOKEN = /(?:@|\b(?:token|session|account|customer|payment|stripe|wallet|email|secret|credential|authorization|cookie|api[_-]?key|client[_-]?secret)[_-]?|^(?:acct|acc|cus|pi|pm|seti|cs|sess|whsec|sk|pk)_[a-z0-9_-]+$|^[0-9]{6,}$|^[a-f0-9]{12,}$|^[a-z0-9_-]{20,}$)/iu;
const SECRET_TEXT = /(?:bearer\s+[a-z0-9._~+/=-]{8,}|(?:sk|pk|whsec|sess|cus|pi|pm|cs|acct|acc)_[a-z0-9_-]{6,}|[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:token|session|password|secret|cookie|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+)/giu;
const URL_TEXT = /https?:\/\/[^\s<>"']+/giu;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalized(value) {
  return String(value ?? "").normalize("NFKC");
}

function isControlOrBidiCodePoint(codePoint) {
  return (codePoint >= 0x00 && codePoint <= 0x1f)
    || (codePoint >= 0x7f && codePoint <= 0x9f)
    || (codePoint >= 0x202a && codePoint <= 0x202e)
    || (codePoint >= 0x2066 && codePoint <= 0x2069);
}

function containsControlOrBidi(value) {
  return [...value].some((character) => isControlOrBidiCodePoint(character.codePointAt(0)));
}

function stripControlOrBidi(value) {
  return [...value].filter((character) => !isControlOrBidiCodePoint(character.codePointAt(0))).join("");
}

function redactedToken(value, prefix) {
  return `~${prefix}-${sha256(normalized(value)).slice(0, 12)}`;
}

function sanitizedPathname(pathname) {
  return pathname
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      let decoded;
      try { decoded = decodeURIComponent(segment); } catch { return redactedToken(segment, "malformed"); }
      const canonical = normalized(decoded);
      if (containsControlOrBidi(canonical) || UUID.test(canonical) || SENSITIVE_TOKEN.test(canonical) || canonical.length > 48) {
        return redactedToken(canonical, "redacted");
      }
      return encodeURIComponent(canonical).replaceAll("%2D", "-").replaceAll("%2E", ".").replaceAll("%5F", "_").replaceAll("%7E", "~");
    })
    .join("/");
}

function sanitizedQueryKey(value) {
  const canonical = normalized(value).slice(0, MAX_QUERY_KEY_CHARS);
  if (canonical === "_rsc") return canonical;
  if (!canonical || containsControlOrBidi(canonical) || SENSITIVE_TOKEN.test(canonical) || !/^[a-z][a-z0-9_.-]{0,63}$/iu.test(canonical)) {
    return redactedToken(canonical || "empty", "query-key");
  }
  return canonical.toLowerCase();
}

function originEvidence(parsed) {
  const host = parsed.hostname.toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "[::1]";
  const rawOrigin = `${parsed.protocol}//${parsed.host}`;
  if (loopback) return { origin: rawOrigin, originClass: "loopback", originSha256: sha256(rawOrigin) };
  const originSha256 = sha256(rawOrigin);
  return { origin: `${parsed.protocol}//external-origin-${originSha256.slice(0, 16)}`, originClass: "external-redacted", originSha256 };
}

export function sanitizeA45HttpEvidenceUrl(rawValue) {
  const boundedRaw = String(rawValue ?? "").slice(0, MAX_URL_CHARS);
  try {
    const parsed = new URL(boundedRaw);
    if (!new Set(["http:", "https:"]).has(parsed.protocol)) throw new Error("unsupported_protocol");
    const origin = originEvidence(parsed);
    const queryKeys = [...new Set([...parsed.searchParams.keys()].slice(0, MAX_QUERY_KEYS).map(sanitizedQueryKey))].sort();
    const endpoint = `${origin.origin}${sanitizedPathname(parsed.pathname)}${queryKeys.length ? `?${queryKeys.join("&")}` : ""}`;
    return {
      url: endpoint,
      urlSha256: sha256(endpoint),
      digestScope: "sanitized-endpoint-only",
      originClass: origin.originClass,
      originSha256: origin.originSha256,
      queryKeys,
      queryKeyCount: queryKeys.length,
      queryKeyLimitApplied: parsed.searchParams.size > MAX_QUERY_KEYS,
      rawQueryValuesIncluded: false,
      credentialsIncluded: false,
      fragmentIncluded: false,
      sensitivePathSegmentsIncluded: false,
      externalHostnameIncluded: false,
    };
  } catch {
    const endpoint = "unparseable-response-url";
    return {
      url: endpoint,
      urlSha256: sha256(endpoint),
      digestScope: "sanitized-endpoint-only",
      originClass: "unparseable",
      originSha256: null,
      queryKeys: [],
      queryKeyCount: 0,
      queryKeyLimitApplied: false,
      rawQueryValuesIncluded: false,
      credentialsIncluded: false,
      fragmentIncluded: false,
      sensitivePathSegmentsIncluded: false,
      externalHostnameIncluded: false,
    };
  }
}

export function sanitizeA45EvidenceText(rawValue, category = "browser_error") {
  const raw = String(rawValue ?? "");
  const inputTruncated = raw.length > MAX_TEXT_INPUT_CHARS;
  const original = normalized(raw.slice(0, MAX_TEXT_INPUT_CHARS));
  let sanitized = original.replace(URL_TEXT, (value) => sanitizeA45HttpEvidenceUrl(value).url);
  let redactionCount = 0;
  sanitized = sanitized.replace(SECRET_TEXT, (value) => {
    redactionCount += 1;
    return redactedToken(value, "secret");
  });
  sanitized = stripControlOrBidi(sanitized);
  let bytes = Buffer.from(sanitized, "utf8");
  const truncated = bytes.length > MAX_TEXT_BYTES;
  if (truncated) bytes = bytes.subarray(0, MAX_TEXT_BYTES);
  const bounded = bytes.toString("utf8");
  return {
    category,
    originalBytes: Buffer.byteLength(original),
    inputCharacterLimit: MAX_TEXT_INPUT_CHARS,
    inputTruncated,
    retainedBytes: Buffer.byteLength(bounded),
    truncated,
    redactionCount,
    rawTextIncluded: false,
    sanitizedTextIncluded: false,
  };
}
