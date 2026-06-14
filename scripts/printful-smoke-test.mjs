import fs from "node:fs";
import path from "node:path";

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const env = { ...readEnv(path.join(process.cwd(), ".env.local.printful-ready")), ...readEnv(path.join(process.cwd(), ".env.local")), ...process.env };
const token = env.PRINTFUL_API_TOKEN;
const storeId = env.PRINTFUL_STORE_ID;

if (!token || token.includes("WKLEJ_TUTAJ")) {
  console.error("Brak PRINTFUL_API_TOKEN w .env.local");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
if (storeId) headers["X-PF-Store-Id"] = storeId;

async function call(label, url) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  console.log(`\n[${label}] ${res.status} ${res.statusText}`);
  if (!res.ok) {
    console.log(text.slice(0, 900));
    return null;
  }
  const json = JSON.parse(text);
  console.log(JSON.stringify(json, null, 2).slice(0, 1600));
  return json;
}

await call("stores v2", "https://api.printful.com/v2/stores");
await call("store products v1", "https://api.printful.com/store/products");
