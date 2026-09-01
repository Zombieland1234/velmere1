#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadTypeScriptForRouteAst, parseRouteModuleAst } from "./route-module-ast.mjs";

let assertions = 0;
function equal(actual, expected, message) {
  assertions += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}:expected=${JSON.stringify(expected)}:actual=${JSON.stringify(actual)}`);
  }
}
function truthy(value, message) {
  assertions += 1;
  if (!value) throw new Error(message);
}

const suiteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-route-ast-"));
try {
  const fixture = path.join(suiteRoot, "app/api/test/route.ts");
  fs.mkdirSync(path.dirname(fixture), { recursive: true });
  fs.writeFileSync(fixture, `
// export async function DELETE() {}
const decoy = "export const PATCH = () => null";
const template = \`export function HEAD() {}\`;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET() { return new Response("ok"); }
const post = async () => new Response("ok");
export { post as POST };
`, "utf8");
  const { ts, provenance } = await loadTypeScriptForRouteAst({ root: process.cwd() });
  const parsed = parseRouteModuleAst({ ts, root: suiteRoot, relativePath: "app/api/test/route.ts" });
  equal(parsed.methods, ["GET", "POST"], "AST ignores comments, strings and template-literal method decoys");
  equal(parsed.routeConfig, { runtime: '"nodejs"', dynamic: '"force-dynamic"', maxDuration: "30" }, "AST captures exported route config literals");
  equal(parsed.parseDiagnostics, [], "fixture parses without diagnostics");
  equal(parsed.duplicateMethods, [], "fixture has no duplicate method exports");
  equal(parsed.exportStarCount, 0, "fixture has no ambiguous star re-export");
  truthy(parsed.astEligible, "fixture is AST eligible");

  const duplicate = path.join(suiteRoot, "app/api/duplicate/route.ts");
  fs.mkdirSync(path.dirname(duplicate), { recursive: true });
  fs.writeFileSync(duplicate, "export function GET() {}\nexport { GET };\n", "utf8");
  const duplicateParsed = parseRouteModuleAst({ ts, root: suiteRoot, relativePath: "app/api/duplicate/route.ts" });
  equal(duplicateParsed.duplicateMethods, [{ method: "GET", count: 2 }], "duplicate export is fail-closed");
  equal(duplicateParsed.astEligible, false, "duplicate export cannot be registry eligible");

  const star = path.join(suiteRoot, "app/api/star/route.ts");
  fs.mkdirSync(path.dirname(star), { recursive: true });
  fs.writeFileSync(star, "export * from './handler';\n", "utf8");
  const starParsed = parseRouteModuleAst({ ts, root: suiteRoot, relativePath: "app/api/star/route.ts" });
  equal(starParsed.exportStarCount, 1, "star export is counted");
  equal(starParsed.astEligible, false, "star export cannot silently establish methods");

  console.log(JSON.stringify({
    schemaVersion: "velmere.pass15.route-method-ast-equivalence.test.v1",
    status: provenance.exactToolchainCreditEligible ? "PASS_EXACT_PROJECT_TYPESCRIPT_AST_TEST" : "PASS_DIAGNOSTIC_EXTERNAL_TYPESCRIPT_AST_TEST_NO_EXACT_CREDIT",
    assertions,
    parser: provenance,
    truthBoundary: "AST behavior and generated-registry semantics only. A diagnostic external TypeScript module does not grant exact A78R1/A79R1 toolchain, build, browser, LIVE or sale credit.",
  }, null, 2));
} finally {
  fs.rmSync(suiteRoot, { recursive: true, force: true });
}
