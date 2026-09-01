import fs from "node:fs";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("scripts/current-pass-manifest.json", "utf8"));
const claims = JSON.parse(fs.readFileSync("scripts/legacy-package-script-claims-pass4710.json", "utf8"));
const publicCommands = ["velmere:check", "velmere:checkpoint", "velmere:commands"];
const missing = publicCommands.filter((name) => typeof pkg.scripts?.[name] !== "string");
if (missing.length) throw new Error(`missing_public_commands:${missing.join(",")}`);
const report = {
  schemaVersion: "velmere.command-surface.v2",
  currentPass: manifest.currentPass,
  publicCommands,
  publicCommandCount: publicCommands.length,
  activeScriptCount: Object.keys(pkg.scripts ?? {}).length,
  archivedLegacyScriptCount: claims.removedCount,
  legacyExecutionPolicy: claims.executionPolicy,
  boundary: "Only the supported development/build/current graph remains executable. Historical aliases are checksum-sealed reference data.",
};
console.log(JSON.stringify(report, null, 2));
