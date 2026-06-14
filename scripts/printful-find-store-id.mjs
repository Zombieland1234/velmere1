import fs from "node:fs";
import path from "node:path";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }
  return env;
}

const root = process.cwd();
const localEnv = readEnvFile(path.join(root, ".env.local"));
const exampleEnv = readEnvFile(path.join(root, ".env.local.printful-ready"));
const token = process.env.PRINTFUL_API_TOKEN || localEnv.PRINTFUL_API_TOKEN || exampleEnv.PRINTFUL_API_TOKEN;

if (!token || token.includes("WKLEJ_TUTAJ")) {
  console.error("Brak PRINTFUL_API_TOKEN. Wklej token do .env.local albo .env.local.printful-ready i uruchom ponownie.");
  process.exit(1);
}

const response = await fetch("https://api.printful.com/v2/stores", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

const text = await response.text();
if (!response.ok) {
  console.error(`Printful zwrócił ${response.status}:`);
  console.error(text);
  process.exit(1);
}

const payload = JSON.parse(text);
const stores = payload.data ?? [];

console.log("\nDostępne sklepy Printful dla tego tokena:\n");
for (const store of stores) {
  console.log(`ID: ${store.id} | NAME: ${store.name ?? "bez nazwy"} | TYPE: ${store.type ?? "?"}`);
}

if (stores.length === 1) {
  console.log(`\nMasz jeden sklep. Wpisz do .env.local:`);
  console.log(`PRINTFUL_STORE_ID=${stores[0].id}`);
  console.log(`PRINTFUL_STORE_NAME=${stores[0].name ?? ""}`);
} else if (stores.length > 1) {
  const marcin = stores.find((store) => String(store.name ?? "").toLowerCase().includes("marcin"));
  if (marcin) {
    console.log(`\nWygląda na dobry sklep:`);
    console.log(`PRINTFUL_STORE_ID=${marcin.id}`);
    console.log(`PRINTFUL_STORE_NAME=${marcin.name ?? ""}`);
  } else {
    console.log("\nWybierz sklep Manual/API w EUR, np. Marcin's Store, i wpisz jego ID do PRINTFUL_STORE_ID.");
  }
} else {
  console.log("Nie znaleziono sklepów. Sprawdź scopes tokena albo czy token ma dostęp do store.");
}
