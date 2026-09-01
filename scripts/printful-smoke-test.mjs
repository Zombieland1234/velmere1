import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function correlationHash(...values) {
  const hash = createHash("sha256");
  for (const value of values) {
    hash.update(String(value));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function emit(status, count, error, ...correlationValues) {
  console.log(JSON.stringify({
    status,
    count,
    error,
    correlationHash: correlationHash(...correlationValues),
  }));
}

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    out[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

function normalizeToken(value) {
  if (typeof value !== "string") return null;
  const token = value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : value.trim();
  if (!token || /WKLEJ|YOUR[_ -]?TOKEN|TU[_ -]?TOKEN/i.test(token)) return null;
  return token;
}

function countItems(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.data)) return payload.data.length;
  if (Array.isArray(payload?.result)) return payload.result.length;
  return 0;
}

async function call(headers, url) {
  try {
    const response = await fetch(url, { headers });
    const body = await response.text();
    const correlationValues = [url, response.status, body];

    if (!response.ok) {
      emit(response.status, 0, "http_error", ...correlationValues);
      return false;
    }

    try {
      emit(response.status, countItems(JSON.parse(body)), null, ...correlationValues);
      return true;
    } catch {
      emit(response.status, 0, "invalid_json", ...correlationValues);
      return false;
    }
  } catch (error) {
    emit("transport_error", 0, "transport_error", url, error?.name, error?.code);
    return false;
  }
}

async function main() {
  let env;
  try {
    env = {
      ...readEnv(path.join(process.cwd(), ".env.local.printful-ready")),
      ...readEnv(path.join(process.cwd(), ".env.local")),
      ...process.env,
    };
  } catch (error) {
    emit("configuration_error", 0, "configuration_read_error", error?.name, error?.code);
    return false;
  }

  const token = normalizeToken(env.PRINTFUL_API_TOKEN);
  if (!token) {
    emit("configuration_error", 0, "missing_or_placeholder_token", "printful-smoke-test", "missing-token");
    return false;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (env.PRINTFUL_STORE_ID) headers["X-PF-Store-Id"] = env.PRINTFUL_STORE_ID;

  const results = await Promise.all([
    call(headers, "https://api.printful.com/v2/stores"),
    call(headers, "https://api.printful.com/store/products"),
  ]);
  return results.every(Boolean);
}

if (!(await main())) process.exitCode = 1;
