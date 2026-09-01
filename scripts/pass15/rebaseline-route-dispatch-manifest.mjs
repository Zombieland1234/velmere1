#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { loadTypeScriptForRouteAst, parseRouteModuleAst } from "./route-module-ast.mjs";

const root = process.cwd();
const groups = ["marketIntegrity", "internalWorkers", "security", "search", "admin"];

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const { ts, provenance: parserProvenance } = await loadTypeScriptForRouteAst({ root });

const manifestPath = path.resolve(
  root,
  argumentValue("--manifest") ?? "config/pass15/route-dispatch-manifest.json",
);
const beforeBytes = fs.readFileSync(manifestPath);
const manifest = JSON.parse(beforeBytes.toString("utf8"));
const changes = [];
let routeCount = 0;

for (const groupName of groups) {
  const group = manifest[groupName];
  if (!group || !Array.isArray(group.routes)) {
    throw new Error(`route_dispatch_manifest_group_missing:${groupName}`);
  }
  for (const route of group.routes) {
    routeCount += 1;
    const handlerPath = path.join(root, route.handlerModule);
    const handlerBytes = fs.readFileSync(handlerPath);
    const ast = parseRouteModuleAst({ ts, root, relativePath: route.handlerModule });
    if (!ast.astEligible) throw new Error(`route_dispatch_handler_ast_invalid:${route.handlerModule}`);
    const current = {
      methods: ast.methods,
      handlerSha256: sha256(handlerBytes),
      handlerBytes: handlerBytes.length,
    };
    const before = {
      methods: [...route.methods],
      handlerSha256: route.handlerSha256,
      handlerBytes: route.handlerBytes,
    };
    const changedFields = Object.keys(current).filter(
      (field) => JSON.stringify(before[field]) !== JSON.stringify(current[field]),
    );
    if (changedFields.length > 0) {
      changes.push({
        group: groupName,
        operation: route.operation,
        publicPath: route.publicPath,
        handlerModule: route.handlerModule,
        changedFields,
        before,
        after: current,
      });
      route.methods = current.methods;
      route.handlerSha256 = current.handlerSha256;
      route.handlerBytes = current.handlerBytes;
    }
  }
}

if (routeCount !== manifest.summary?.oldEntrypointsRemoved) {
  throw new Error(
    `route_dispatch_manifest_denominator_mismatch:${routeCount}:${manifest.summary?.oldEntrypointsRemoved}`,
  );
}

const afterBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
const write = process.argv.includes("--write");
if (write && !beforeBytes.equals(afterBytes)) {
  const temporaryPath = `${manifestPath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporaryPath, afterBytes, { flag: "wx", mode: 0o600 });
    fs.renameSync(temporaryPath, manifestPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

const result = {
  schemaVersion: "velmere.pass15.route-dispatch-manifest-rebaseline.v1",
  mode: write ? "write" : "dry_run",
  manifestPath: path.relative(root, manifestPath),
  routeDenominator: routeCount,
  changedRoutes: changes.length,
  changedFields: changes.reduce((sum, row) => sum + row.changedFields.length, 0),
  beforeSha256: sha256(beforeBytes),
  afterSha256: sha256(afterBytes),
  sourceChanged: !beforeBytes.equals(afterBytes),
  parser: parserProvenance,
  exactAstCreditEligible: parserProvenance.exactToolchainCreditEligible,
  changes,
};

console.log(JSON.stringify(result, null, 2));
