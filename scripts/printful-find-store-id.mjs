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

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function normalizeToken(value) {
  if (typeof value !== "string") return null;
  const token = value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : value.trim();
  if (!token || /WKLEJ|YOUR[_ -]?TOKEN|TU[_ -]?TOKEN/i.test(token)) return null;
  return token;
}

async function main() {
  let token;
  try {
    const root = process.cwd();
    token = normalizeToken(
      process.env.PRINTFUL_API_TOKEN
      || readEnvFile(path.join(root, ".env.local")).PRINTFUL_API_TOKEN
      || readEnvFile(path.join(root, ".env.local.printful-ready")).PRINTFUL_API_TOKEN,
    );
  } catch (error) {
    emit("configuration_error", 0, "configuration_read_error", error?.name, error?.code);
    return false;
  }

  if (!token) {
    emit("configuration_error", 0, "missing_or_placeholder_token", "printful-find-store-id", "missing-token");
    return false;
  }

  const url = "https://api.printful.com/v2/stores";
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const body = await response.text();
    const correlationValues = [url, response.status, body];

    if (!response.ok) {
      emit(response.status, 0, "http_error", ...correlationValues);
      return false;
    }

    try {
      const payload = JSON.parse(body);
      const stores = Array.isArray(payload?.data) ? payload.data : [];
      emit(response.status, stores.length, null, ...correlationValues);
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

if (!(await main())) process.exitCode = 1;
