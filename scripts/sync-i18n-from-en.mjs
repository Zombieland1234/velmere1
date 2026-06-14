import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const messagesDir = join(dirname(fileURLToPath(import.meta.url)), "../messages");

function flatten(value, prefix = "") {
  if (Array.isArray(value)) return { [prefix]: value };
  if (!value || typeof value !== "object") return { [prefix]: value };
  return Object.entries(value).reduce((acc, [key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    Object.assign(acc, flatten(child, next));
    return acc;
  }, {});
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = current[parts[i]] ?? {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

const en = JSON.parse(await readFile(join(messagesDir, "en.json"), "utf8"));
const flatEn = flatten(en);

for (const locale of ["pl", "de"]) {
  const file = join(messagesDir, `${locale}.json`);
  const json = JSON.parse(await readFile(file, "utf8"));
  const flat = flatten(json);
  for (const key of Object.keys(flatEn)) {
    if (!(key in flat)) {
      setPath(json, key, flatEn[key]);
    }
  }
  await writeFile(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  console.log(`Synced missing keys into ${locale}.json`);
}
