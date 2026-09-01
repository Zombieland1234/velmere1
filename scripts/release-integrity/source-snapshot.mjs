import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const DEFAULT_ROOTS = [
  ".github",
  ".velmere/quarantine/pass6-domain-snapshot",
  "app",
  "components",
  "config",
  "data",
  "db",
  "evaluation",
  "fixtures",
  "lib",
  "messages",
  "public",
  "scripts",
  "store",
  "supabase",
  "tests",
];
const DEFAULT_EXPLICIT = [
  "package.json",
  "package-lock.json",
  "next.config.mjs",
  "middleware.ts",
  "tsconfig.json",
  "vercel.json",
  "eslint.config.mjs",
  "tailwind.config.ts",
  "postcss.config.mjs",
  "i18n.ts",
  "navigation.ts",
  "routing.ts",
  "proxy.ts",
  ".env.example",
  ".velmere/orphan-quarantine-pass6.json",
  "ENV_PRODUCTION_READY.example",
  "README.md",
  ".gitattributes",
  ".gitignore",
  ".npmrc",
  ".node-version",
  ".nvmrc",
];
const DEFAULT_ROOT_FILE_PATTERNS = [
  /^tsconfig(?:\..+)?\.json$/,
  /^(?:playwright|postcss)\.config\.(?:js|mjs|cjs|ts)$/,
];
const DEFAULT_IGNORED = new Set(["node_modules", ".next", ".git", "artifacts"]);

export function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256File(file) {
  return sha256Buffer(fs.readFileSync(file));
}

function normalize(relative) {
  return relative.split(path.sep).join("/");
}

export function listSourceFiles(root, options = {}) {
  const roots = options.roots ?? DEFAULT_ROOTS;
  const explicit = options.explicit ?? DEFAULT_EXPLICIT;
  const ignored = new Set([...(options.ignored ?? DEFAULT_IGNORED)]);
  const rootFilePatterns = options.rootFilePatterns ?? DEFAULT_ROOT_FILE_PATTERNS;
  const files = [];

  function walk(relative) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.statSync(absolute);
    if (stat.isFile()) {
      files.push(normalize(relative));
      return;
    }
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      if (entry.isDirectory() && ignored.has(entry.name)) continue;
      walk(path.join(relative, entry.name));
    }
  }

  for (const item of roots) walk(item);
  for (const item of explicit) {
    if (fs.existsSync(path.join(root, item))) files.push(normalize(item));
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (rootFilePatterns.some((pattern) => pattern.test(entry.name))) {
      files.push(normalize(entry.name));
    }
  }
  return [...new Set(files)].sort();
}

export function computeSourceSnapshot(root, options = {}) {
  const files = listSourceFiles(root, options);
  const hash = createHash("sha256");
  let bytes = 0;
  const entries = [];
  for (const relative of files) {
    const absolute = path.join(root, relative);
    const content = fs.readFileSync(absolute);
    const fileSha256 = sha256Buffer(content);
    bytes += content.length;
    entries.push({ path: relative, bytes: content.length, sha256: fileSha256 });
    hash.update(relative);
    hash.update("\0");
    hash.update(fileSha256);
    hash.update("\n");
  }
  return {
    schemaVersion: "velmere.release-integrity.source-snapshot.v1",
    files: files.length,
    bytes,
    sha256: hash.digest("hex"),
    entries: options.includeEntries === true ? entries : undefined,
  };
}

export function computeTreeDigest(root, relativeRoots) {
  const files = [];
  function walk(relative) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.statSync(absolute);
    if (stat.isFile()) {
      files.push(normalize(relative));
      return;
    }
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      walk(path.join(relative, entry.name));
    }
  }
  for (const relative of relativeRoots) walk(relative);
  files.sort();
  const hash = createHash("sha256");
  let bytes = 0;
  for (const relative of files) {
    const content = fs.readFileSync(path.join(root, relative));
    bytes += content.length;
    hash.update(relative);
    hash.update("\0");
    hash.update(sha256Buffer(content));
    hash.update("\n");
  }
  return { files: files.length, bytes, sha256: hash.digest("hex") };
}

export function writeJsonAtomic(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode });
  fs.renameSync(temp, file);
}
