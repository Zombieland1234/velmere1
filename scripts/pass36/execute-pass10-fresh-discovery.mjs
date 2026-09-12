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

  for (const d of targetDirs) {
    walk(d);
  }
  return leaks;
}

async function main() {
  console.log("=== PASS 10: FRESH WHOLE-REPOSITORY DISCOVERY ===");
  fs.mkdirSync("artifacts/discovery", { recursive: true });

  const appFiles = countFiles("app", [".ts", ".tsx"]);
  const libFiles = countFiles("lib", [".ts", ".tsx"]);
  const componentFiles = countFiles("components", [".ts", ".tsx"]);
  const scriptFiles = countFiles("scripts", [".ts", ".js", ".mjs"]);
  const migrationFiles = countFiles("supabase/migrations", [".sql"]);

  console.log(`Repository Inventory:`);
  console.log(` - app/: ${appFiles} files`);
  console.log(` - lib/: ${libFiles} files`);
  console.log(` - components/: ${componentFiles} files`);
  console.log(` - scripts/: ${scriptFiles} files`);
  console.log(` - migrations: ${migrationFiles} files`);

  console.log(`Scanning for hardcoded secrets...`);
  const secretLeaks = scanForHardcodedSecrets(".");
  console.log(`Secret leaks detected: ${secretLeaks.length}`);

  const passed = secretLeaks.length === 0 && appFiles > 50 && libFiles > 100;
  const receipt = {
    schemaVersion: "velmere.pass10.fresh-discovery.receipt.v1",
    executedAt: new Date().toISOString(),
    inventory: {
      app: appFiles,
      lib: libFiles,
      components: componentFiles,
      scripts: scriptFiles,
      migrations: migrationFiles
    },
    secretLeaksCount: secretLeaks.length,
    secretLeaks,
    passed
  };

  const receiptPath = path.resolve("artifacts/discovery/PASS10_FRESH_DISCOVERY_RECEIPT.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  console.log(`Saved Pass 10 Receipt to: ${receiptPath}`);
  if (!passed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
