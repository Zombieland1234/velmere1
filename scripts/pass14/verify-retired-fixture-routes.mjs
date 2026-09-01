#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "config/pass14/retired-fixture-routes.json"), "utf8"));
const issues = [];
for (const row of manifest.routes ?? []) {
  if (fs.existsSync(path.join(root, row.oldPath))) issues.push(`production_route_still_exists:${row.oldPath}`);
  const fixturePath = path.join(root, row.fixtureModule);
  if (!fs.existsSync(fixturePath)) issues.push(`fixture_module_missing:${row.fixtureModule}`);
  else {
    const source = fs.readFileSync(fixturePath, "utf8");
    if (!source.includes("blockProductionFixtureRoute(")) issues.push(`fixture_guard_missing:${row.fixtureModule}`);
  }
}
const appRouteCount = (() => {
  let count = 0;
  const walk = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name === "route.ts") count += 1;
    }
  };
  walk(path.join(root, "app", "api"));
  return count;
})();
const result = {
  schemaVersion: "velmere.pass14.retired-fixture-route-verification.v1",
  generatedAt: new Date().toISOString(),
  ok: issues.length === 0,
  retiredRouteCount: manifest.routeCount,
  currentAppApiRouteCount: appRouteCount,
  issues,
  productionTruth: "Removed fixture URLs remain unavailable in production. Real replacements are still missing and must not be counted as implemented."
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
