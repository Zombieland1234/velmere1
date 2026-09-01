#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  loadTypeScriptForRouteAst,
  parseRouteModuleAst,
} from "./route-module-ast.mjs";

const root = process.cwd();
const manifestPath = path.join(root, "config/pass15/lazy-route-shell-manifest.json");
const profilePath = path.join(root, "config/pass15/lazy-build-surface-profile.json");
const manifestBefore = fs.readFileSync(manifestPath);
const profileBefore = fs.readFileSync(profilePath);
const manifest = JSON.parse(manifestBefore.toString("utf8"));
const profile = JSON.parse(profileBefore.toString("utf8"));
const profileByRoute = new Map((profile.wrappedRoutes ?? []).map((row) => [row.route, row]));
const { ts, provenance } = await loadTypeScriptForRouteAst({ root });
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const changes = [];
const retained = [];
const removed = [];

function registryReplacementFor(handlerModule) {
  const directory = path.join(root, "lib/server/route-registries");
  if (!fs.existsSync(directory)) return null;
  const target = `@/${handlerModule.replace(/\.ts$/u, "")}`;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const relative = `lib/server/route-registries/${entry.name}`;
    const text = fs.readFileSync(path.join(directory, entry.name), "utf8");
    if (text.includes(`import("${target}")`) || text.includes(`import('${target}')`)) return relative;
  }
  return null;
}

for (const row of manifest.routes ?? []) {
  const shellPath = path.join(root, row.route);
  const handlerPath = path.join(root, row.handlerModule);
  if (!fs.existsSync(handlerPath)) throw new Error(`lazy_handler_missing:${row.handlerModule}`);
  if (!fs.existsSync(shellPath)) {
    const replacement = registryReplacementFor(row.handlerModule);
    if (!replacement) throw new Error(`lazy_shell_missing_without_registry_replacement:${row.route}`);
    removed.push({ route: row.route, handlerModule: row.handlerModule, supersededBy: replacement });
    changes.push({ route: row.route, change: "removed_superseded_direct_shell", supersededBy: replacement });
    continue;
  }
  const shellAst = parseRouteModuleAst({ ts, root, relativePath: row.route });
  const handlerAst = parseRouteModuleAst({ ts, root, relativePath: row.handlerModule });
  if (!shellAst.astEligible || !handlerAst.astEligible) throw new Error(`lazy_route_ast_invalid:${row.route}`);
  if (JSON.stringify(shellAst.methods) !== JSON.stringify(handlerAst.methods)) {
    throw new Error(`lazy_shell_handler_method_mismatch:${row.route}:${JSON.stringify(shellAst.methods)}:${JSON.stringify(handlerAst.methods)}`);
  }
  const next = {
    ...row,
    methods: shellAst.methods,
    handlerSha256: handlerAst.sha256,
    handlerBytes: handlerAst.byteLength,
    shellSha256: shellAst.sha256,
    shellBytes: shellAst.byteLength,
  };
  const changedFields = ["methods", "handlerSha256", "handlerBytes", "shellSha256", "shellBytes"]
    .filter((field) => JSON.stringify(row[field]) !== JSON.stringify(next[field]));
  if (changedFields.length) changes.push({ route: row.route, change: "rebound_current_ast_and_bytes", changedFields });
  retained.push(next);
}

const retainedRoutes = new Set(retained.map((row) => row.route));
const wrappedRoutes = (profile.wrappedRoutes ?? []).filter((row) => retainedRoutes.has(row.route));
for (const route of retainedRoutes) {
  if (!profileByRoute.has(route)) throw new Error(`lazy_profile_missing:${route}`);
}
const beforeEagerBytes = retained.reduce((sum, row) => sum + Number(row.beforeEagerBytes ?? 0), 0);
const afterEagerBytes = wrappedRoutes.reduce((sum, row) => sum + Number(row.after?.eagerBytes ?? 0), 0);
manifest.routes = retained;
manifest.summary = {
  ...(manifest.summary ?? {}),
  routesWrapped: retained.length,
  beforeEagerBytes,
  supersededDirectShellsRemoved: removed.length,
  methodDiscovery: "HASH_BOUND_TYPESCRIPT_AST_REGISTRY",
};
profile.wrappedRoutes = wrappedRoutes;
profile.wrappedRouteSummary = {
  routes: retained.length,
  beforeEagerBytes,
  afterEagerBytes,
  eagerByteReduction: beforeEagerBytes - afterEagerBytes,
  supersededDirectShellsRemoved: removed.length,
};

const manifestAfter = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
const profileAfter = Buffer.from(`${JSON.stringify(profile, null, 2)}\n`, "utf8");
if (process.argv.includes("--write")) {
  for (const [filePath, bytes] of [[manifestPath, manifestAfter], [profilePath, profileAfter]]) {
    const temporary = `${filePath}.tmp-${process.pid}`;
    try {
      fs.writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
      fs.renameSync(temporary, filePath);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
}
console.log(JSON.stringify({
  schemaVersion: "velmere.pass15.lazy-route-shell-rebaseline.v2",
  status: process.argv.includes("--write") ? "UPDATED" : "DRY_RUN",
  parser: provenance,
  retainedRoutes: retained.length,
  removedSupersededRoutes: removed,
  changes,
  manifestBeforeSha256: sha256(manifestBefore),
  manifestAfterSha256: sha256(manifestAfter),
  profileBeforeSha256: sha256(profileBefore),
  profileAfterSha256: sha256(profileAfter),
}, null, 2));
