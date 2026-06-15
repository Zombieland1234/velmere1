import fs from "node:fs";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`PASS2034 FAIL: ${message}`);
    process.exitCode = 1;
  }
}

const pkg = readJson("package.json");
const lock = readJson("package-lock.json");
const nextConfig = fs.readFileSync("next.config.mjs", "utf8");
const nextEnv = fs.readFileSync("next-env.d.ts", "utf8");
const tsconfig = readJson("tsconfig.json");

assert(pkg.dependencies?.ws, "package.json must declare ws as a direct dependency for isows/viem webpack resolution");
assert(lock.packages?.[""]?.dependencies?.ws, "package-lock root must include ws dependency");
assert(lock.packages?.["node_modules/ws"]?.version, "package-lock must contain a top-level node_modules/ws package");
assert(nextConfig.includes("ws: false"), "next.config.mjs must disable ws fallback for client/browser bundles");
assert(!nextEnv.includes(".next/dev/types/routes.d.ts"), "next-env.d.ts must not import .next/dev generated routes before build");
assert(!tsconfig.include?.includes(".next/dev/types/**/*.ts"), "tsconfig include must not require .next/dev generated types on fresh Vercel builds");

if (process.exitCode) process.exit(process.exitCode);
console.log("PASS2034 OK · ws dependency + browser fallback + next-env generated-type guard verified");
