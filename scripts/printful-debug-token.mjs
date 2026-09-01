import { createHash } from "node:crypto";
import fs from "node:fs";

const ENV_PATH = ".env.local";
const ENDPOINTS = [
  "https://api.printful.com/stores",
  "https://api.printful.com/v2/stores",
];

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

function readToken() {
  if (!fs.existsSync(ENV_PATH)) return null;

  const line = fs
    .readFileSync(ENV_PATH, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trim().startsWith("PRINTFUL_API_TOKEN="));

  if (!line) return null;
  let token = line.slice(line.indexOf("=") + 1).trim();
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1).trim();
  }
  if (token.toLowerCase().startsWith("bearer ")) token = token.slice(7).trim();

  if (!token || /WKLEJ|YOUR[_ -]?TOKEN|TU[_ -]?TOKEN/i.test(token)) return null;
  return token;
}

function countItems(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.data)) return payload.data.length;
  if (Array.isArray(payload?.result)) return payload.result.length;
  return 0;
}

async function testEndpoint(token, url) {
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
  let token;
  try {
    token = readToken();
  } catch (error) {
    emit("configuration_error", 0, "configuration_read_error", error?.name, error?.code);
    return false;
  }

  if (!token) {
    emit("configuration_error", 0, "missing_or_placeholder_token", "printful-debug-token", "missing-token");
    return false;
  }

  const results = [];
  for (const endpoint of ENDPOINTS) results.push(await testEndpoint(token, endpoint));
  return results.every(Boolean);
}

if (!(await main())) process.exitCode = 1;
