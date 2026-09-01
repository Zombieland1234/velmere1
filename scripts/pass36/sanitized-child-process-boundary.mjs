import crypto from "node:crypto";

const SAFE_ENV_NAMES = new Set([
  "ALLUSERSPROFILE", "APPDATA", "CI", "COMSPEC", "FORCE_COLOR", "LANG", "LC_ALL",
  "LOCALAPPDATA", "NUMBER_OF_PROCESSORS", "OS", "PATH", "PATHEXT", "PROCESSOR_ARCHITECTURE",
  "PROGRAMDATA", "PROGRAMFILES", "PROGRAMFILES(X86)", "SYSTEMDRIVE", "SYSTEMROOT", "TEMP", "TMP", "TZ", "WINDIR",
]);
const SECRET_NAME = /(?:secret|token|password|passwd|credential|private[_-]?key|api[_-]?key|service[_-]?role|database[_-]?url|connection[_-]?string|webhook[_-]?key|dsn)/iu;
const TOKEN_PATTERNS = [
  /\bsk_(?:live|test)_[A-Za-z0-9_-]{8,}\b/gu,
  /\bwhsec_[A-Za-z0-9_-]{8,}\b/gu,
  /\b(?:eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/gu,
  /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/gu,
];

const fingerprint = (value) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);

export function buildSanitizedChildEnv(ambient = process.env, additions = {}) {
  const output = {};
  for (const [observedName, value] of Object.entries(ambient)) {
    const name = observedName.toUpperCase();
    if (SAFE_ENV_NAMES.has(name) && typeof value === "string") output[name] = value;
  }
  for (const [name, value] of Object.entries(additions)) {
    if (!SAFE_ENV_NAMES.has(name) || SECRET_NAME.test(name) || typeof value !== "string") throw new Error(`unsafe_child_environment_addition:${name}`);
    output[name] = value;
  }
  output.FORCE_COLOR = "0";
  return output;
}

export function sanitizeChildOutput(value, ambient = process.env) {
  let sanitized = String(value ?? "");
  const matches = [];
  const sensitiveValues = [...new Set(Object.entries(ambient)
    .filter(([name, item]) => SECRET_NAME.test(name) && typeof item === "string" && item.length >= 8)
    .map(([, item]) => item))]
    .sort((a, b) => b.length - a.length);
  for (const secret of sensitiveValues) {
    if (!sanitized.includes(secret)) continue;
    const marker = `[REDACTED_ENV_VALUE_${fingerprint(secret)}]`;
    sanitized = sanitized.split(secret).join(marker);
    matches.push({ class: "ambient-secret-value", fingerprint: fingerprint(secret) });
  }
  for (const pattern of TOKEN_PATTERNS) {
    sanitized = sanitized.replace(pattern, (matched) => {
      matches.push({ class: "token-pattern", fingerprint: fingerprint(matched) });
      return `[REDACTED_TOKEN_${fingerprint(matched)}]`;
    });
  }
  return { sanitized, sensitiveOutputDetected: matches.length > 0, matches };
}

export function forbiddenAmbientNames(ambient = process.env) {
  return Object.keys(ambient).filter((name) => SECRET_NAME.test(name)).sort();
}
