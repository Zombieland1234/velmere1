#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDynamicApiRouteResolutions, read } from "./context.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const phaseRoot = path.join(root, "scripts/preflight");
const requested = new Set();
const pattern = /read\(\s*"(app\/api\/(?:security|market-integrity|search|admin)\/[^"\n]+\/route\.ts)"\s*,?\s*\)/gu;
for (const name of fs.readdirSync(phaseRoot).filter((entry) => /^phase-.*\.mjs$/u.test(entry)).sort()) {
  const source = fs.readFileSync(path.join(phaseRoot, name), "utf8");
  for (const match of source.matchAll(pattern)) {
    const routePath = match[1];
    if (!fs.existsSync(path.join(root, routePath))) requested.add(routePath);
  }
}

const failures = [];
for (const routePath of [...requested].sort()) {
  try {
    const source = read(routePath);
    if (!source.includes("VELMERE_DYNAMIC_ROUTE_GUARD_SURFACE")) failures.push(`${routePath}:resolution_banner_missing`);
    const operation = routePath.split("/").at(-2);
    if (!source.includes(`operation=${operation}`)) failures.push(`${routePath}:operation_binding_missing`);
  } catch (error) {
    failures.push(`${routePath}:${error instanceof Error ? error.message : String(error)}`);
  }
}

let unknownRejected = false;
try {
  read("app/api/security/not-a-real-operation/route.ts");
} catch (error) {
  unknownRejected = String(error).includes("dynamic_route_registry_entry_missing");
}
if (!unknownRejected) failures.push("unknown_operation_not_rejected_fail_closed");

const resolutions = getDynamicApiRouteResolutions();
if (resolutions.length !== requested.size) failures.push(`resolution_count:${resolutions.length}/${requested.size}`);
if (failures.length) {
  console.error(JSON.stringify({ status: "FAIL", requestedCount: requested.size, resolutionCount: resolutions.length, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  schemaVersion: "velmere.dynamic-api-route-guard-resolution.v1",
  status: "OFFLINE-PROVEN",
  requestedCount: requested.size,
  resolutionCount: resolutions.length,
  resolutions,
  unknownOperationFailClosed: true,
}, null, 2));
