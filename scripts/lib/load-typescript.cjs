const path = require("node:path");

function candidatePaths() {
  const candidates = ["typescript"];
  const explicit = String(process.env.VELMERE_TYPESCRIPT_MODULE || "").trim();
  if (explicit) candidates.push(explicit);

  const executableDir = path.dirname(process.execPath);
  candidates.push(path.resolve(executableDir, "../lib/node_modules/typescript/lib/typescript.js"));
  candidates.push(path.resolve(executableDir, "../node_modules/typescript/lib/typescript.js"));

  for (const entry of String(process.env.NODE_PATH || "").split(path.delimiter)) {
    if (entry.trim()) candidates.push(path.join(entry.trim(), "typescript/lib/typescript.js"));
  }
  return [...new Set(candidates)];
}

function loadTypeScript() {
  const failures = [];
  for (const candidate of candidatePaths()) {
    try {
      const loaded = require(candidate);
      if (loaded && typeof loaded.transpileModule === "function") return loaded;
      failures.push(`${candidate}: module loaded without transpileModule`);
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(
    `TypeScript module unavailable. Run npm ci or set VELMERE_TYPESCRIPT_MODULE. Tried: ${failures.join(" | ")}`,
  );
}

module.exports = { candidatePaths, loadTypeScript };
