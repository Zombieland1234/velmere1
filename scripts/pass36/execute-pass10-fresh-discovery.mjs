import fs from "fs";
import path from "path";

function countFiles(dir, exts) {
  let count = 0;
  if (!fs.existsSync(dir)) return count;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      count += countFiles(full, exts);
    } else if (e.isFile() && exts.some((ext) => e.name.endsWith(ext))) {
      count++;
    }
  }
  return count;
}

function scanForHardcodedSecrets() {
  const leaks = [];
  const privateKeyHeader = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
  const stripeLivePrefix = ["sk", "_live_"].join("");
  const patterns = [
    { name: "PRIVATE_KEY", regex: new RegExp(privateKeyHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) },
    { name: "AWS_SECRET", regex: /(?:AKIA[0-9A-Z]{16}|aws_secret_access_key)/i },
    { name: "HARDCODED_STRIPE_LIVE", regex: new RegExp(`${stripeLivePrefix}[0-9a-zA-Z]{24}`) }
  ];

  const targetDirs = ["app", "lib", "components", "supabase"];

  function walk(current) {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.isFile() && /\.(ts|tsx|js|mjs|json|sql)$/.test(e.name)) {
        try {
          const content = fs.readFileSync(full, "utf8");
          for (const p of patterns) {
            if (p.regex.test(content)) {
              leaks.push({ file: full, pattern: p.name });
            }
          }
        } catch {}
      }
    }
  }

  for (const dir of targetDirs) walk(dir);
  return leaks;
}

const counts = {
  routes: countFiles("app/api", ["route.ts", "route.js"]),
  components: countFiles("components", [".tsx", ".jsx"]),
  serverModules: countFiles("lib/server", [".ts", ".js"]),
  migrations: countFiles("supabase/migrations", [".sql"]),
};
const leaks = scanForHardcodedSecrets();
const out = { generatedAt: new Date().toISOString(), counts, hardcodedSecretFindings: leaks, ok: leaks.length === 0 };
fs.mkdirSync("artifacts/pass36", { recursive: true });
fs.writeFileSync("artifacts/pass36/PASS10_FRESH_DISCOVERY.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
if (!out.ok) process.exitCode = 1;
