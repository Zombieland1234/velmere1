import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoots = ["app", "lib"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const definitionFile = "lib/security/api-guard.ts";

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relative = path.join(relativeDirectory, entry.name).replaceAll(path.sep, "/");
    if (entry.isDirectory()) return walk(relative);
    return sourceExtensions.has(path.extname(entry.name)) ? [relative] : [];
  });
}

function routeArea(relative) {
  const match = relative.match(/^app\/api\/([^/]+)/);
  return match?.[1] ?? "shared_library";
}

function apiGuardModule(value) {
  return typeof value === "string" && /(?:^|\/)security\/api-guard$/.test(value);
}

function writeRateLimitModule(value) {
  return typeof value === "string" && /(?:^|\/)security\/write-api-rate-limit$/.test(value);
}

function durableRateLimitFacadeModule(value) {
  return apiGuardModule(value) || writeRateLimitModule(value);
}

function sourceKind(relative) {
  if (relative.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (relative.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (relative.endsWith(".js") || relative.endsWith(".mjs") || relative.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function importedBindings(sourceFile) {
  const legacy = new Set(["applySoftRateLimit"]);
  const durable = new Set();
  const namespaces = new Set();
  const violations = [];

  const addBinding = (imported, local, node, kind = "import") => {
    if (imported === "applySoftRateLimit") {
      legacy.add(local);
      violations.push({ kind: `legacy_${kind}`, line: lineOf(sourceFile, node) });
    }
    if (imported === "applyApiRateLimit" || imported === "applyWriteApiRateLimit") durable.add(local);
  };

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && durableRateLimitFacadeModule(statement.moduleSpecifier.text)) {
      const clause = statement.importClause;
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          addBinding((element.propertyName ?? element.name).text, element.name.text, element);
        }
      } else if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        namespaces.add(clause.namedBindings.name.text);
      }
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) &&
        apiGuardModule(statement.moduleSpecifier.text) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        if ((element.propertyName ?? element.name).text === "applySoftRateLimit") {
          violations.push({ kind: "legacy_reexport", line: lineOf(sourceFile, element) });
        }
      }
    }

    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const initializer = declaration.initializer;
      if (!initializer || !ts.isCallExpression(initializer) || !ts.isIdentifier(initializer.expression) ||
          initializer.expression.text !== "require" || initializer.arguments.length !== 1 ||
          !ts.isStringLiteral(initializer.arguments[0]) || !durableRateLimitFacadeModule(initializer.arguments[0].text)) continue;
      if (ts.isIdentifier(declaration.name)) {
        namespaces.add(declaration.name.text);
      } else if (ts.isObjectBindingPattern(declaration.name)) {
        for (const element of declaration.name.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const imported = element.propertyName && ts.isIdentifier(element.propertyName)
            ? element.propertyName.text
            : element.name.text;
          addBinding(imported, element.name.text, element, "require");
        }
      }
    }
  }
  return { legacy, durable, namespaces, violations };
}

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteral(node.argumentExpression)) {
    return node.argumentExpression.text;
  }
  return null;
}

function namespaceName(node) {
  if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && ts.isIdentifier(node.expression)) {
    return node.expression.text;
  }
  return null;
}

function callBinding(call, bindings) {
  if (ts.isIdentifier(call.expression)) {
    if (bindings.legacy.has(call.expression.text)) return "legacy";
    if (bindings.durable.has(call.expression.text)) return "durable";
    return null;
  }
  const namespace = namespaceName(call.expression);
  if (!namespace || !bindings.namespaces.has(namespace)) return null;
  const property = propertyName(call.expression);
  if (property === "applySoftRateLimit") return "legacy";
  if (property === "applyApiRateLimit" || property === "applyWriteApiRateLimit") return "durable";
  return null;
}

function hasDecisionProperty(node, variableName, property) {
  let found = false;
  const visit = (candidate) => {
    if (found) return;
    if (ts.isPropertyAccessExpression(candidate) && ts.isIdentifier(candidate.expression) &&
        candidate.expression.text === variableName && candidate.name.text === property) {
      found = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

function containsResponseReturn(node, variableName) {
  let found = false;
  const visit = (candidate) => {
    if (found) return;
    if (ts.isReturnStatement(candidate) && candidate.expression && hasDecisionProperty(candidate.expression, variableName, "response")) {
      found = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

function guardedDecision(sourceFile, declaration, variableName) {
  let block = declaration.parent;
  while (block && !ts.isBlock(block) && !ts.isSourceFile(block)) block = block.parent;
  if (!block || !Array.isArray(block.statements)) return false;
  const declarationEnd = declaration.end;
  for (const statement of block.statements) {
    if (statement.pos < declarationEnd) continue;
    if (ts.isIfStatement(statement) && hasDecisionProperty(statement.expression, variableName, "ok") &&
        (containsResponseReturn(statement.thenStatement, variableName) ||
          (statement.elseStatement && containsResponseReturn(statement.elseStatement, variableName)))) return true;
    if (ts.isReturnStatement(statement) && statement.expression &&
        hasDecisionProperty(statement.expression, variableName, "ok") &&
        hasDecisionProperty(statement.expression, variableName, "response")) return true;
  }
  return false;
}

function inspectSource(relative, source) {
  const sourceFile = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, sourceKind(relative));
  const bindings = importedBindings(sourceFile);
  const violations = bindings.violations.map((item) => ({ ...item, file: relative }));
  const legacyCalls = [];
  const durableCalls = [];

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const binding = callBinding(node, bindings);
      if (binding === "legacy" && relative !== definitionFile) {
        const item = { kind: "legacy_call", file: relative, line: lineOf(sourceFile, node) };
        violations.push(item);
        legacyCalls.push(item);
      }
      if (binding === "durable") {
        const item = { file: relative, line: lineOf(sourceFile, node) };
        durableCalls.push(item);
        const awaitExpression = node.parent && ts.isAwaitExpression(node.parent) ? node.parent : null;
        if (!awaitExpression) {
          violations.push({ ...item, kind: "durable_call_not_directly_awaited" });
        } else {
          const variableDeclaration = awaitExpression.parent && ts.isVariableDeclaration(awaitExpression.parent)
            ? awaitExpression.parent
            : null;
          if (!variableDeclaration || !ts.isIdentifier(variableDeclaration.name)) {
            violations.push({ ...item, kind: "durable_decision_ignored_or_not_bound" });
          } else if (!guardedDecision(sourceFile, variableDeclaration, variableDeclaration.name.text)) {
            violations.push({ ...item, kind: "durable_denial_response_not_returned" });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const edgeConsumer = /export\s+const\s+runtime\s*=\s*["']edge["']/.test(source) &&
    /(?:from\s*["'][^"']*(?:api-guard|write-api-rate-limit)["']|require\s*\(\s*["'][^"']*(?:api-guard|write-api-rate-limit)["'])/.test(source);
  if (edgeConsumer) violations.push({ kind: "edge_api_guard_consumer", file: relative, line: 1 });

  return { violations, legacyCalls, durableCalls, edgeConsumer };
}

export function inspectSoftRateLimitMigration(options = {}) {
  const sourceFiles = sourceRoots.flatMap(walk).sort();
  const inspected = sourceFiles.map((relative) => inspectSource(
    relative,
    fs.readFileSync(path.join(root, relative), "utf8"),
  ));
  const fixtureSources = [
    ...(options.fixtureSource ? [options.fixtureSource] : []),
    ...(Array.isArray(options.fixtureSources) ? options.fixtureSources : []),
  ];
  fixtureSources.forEach((source, index) => {
    inspected.push(inspectSource(`app/api/__preflight_fixture_${index}__/route.ts`, source));
  });

  const violations = inspected.flatMap((item) => item.violations);
  const callSites = inspected.flatMap((item) => item.legacyCalls);
  const durableCallSites = inspected.flatMap((item) => item.durableCalls);
  const edgeApiGuardConsumers = sourceFiles.filter((_relative, index) => inspected[index]?.edgeConsumer);
  const routeViolations = violations.filter((item) => item.file.startsWith("app/api/"));
  const sharedViolations = violations.filter((item) => !item.file.startsWith("app/api/"));
  const files = [...new Set(violations.map((item) => item.file))];
  const callsByArea = {};
  for (const item of violations) {
    const area = routeArea(item.file);
    callsByArea[area] = (callsByArea[area] ?? 0) + 1;
  }
  const violationsByKind = {};
  for (const item of violations) violationsByKind[item.kind] = (violationsByKind[item.kind] ?? 0) + 1;
  const ok = violations.length === 0;
  return {
    schemaVersion: "velmere.soft-rate-limit-migration-preflight.v2",
    analyzer: "typescript_ast_import_alias_and_control_flow",
    ok,
    status: ok ? "READY" : "BLOCKED_P0",
    blocker: ok ? null : "Rate-limit migration contains a legacy, unawaited, ignored, unguarded, re-exported or Edge-incompatible call site.",
    remediation: ok ? null : "Use awaited applyApiRateLimit/applyWriteApiRateLimit, bind its decision and return its denial response before route work.",
    callSiteCount: callSites.length,
    durableCallSiteCount: durableCallSites.length,
    migrationViolationCount: violations.length,
    affectedFileCount: files.length,
    routeCallSiteCount: callSites.filter((item) => item.file.startsWith("app/api/")).length,
    sharedLibraryCallSiteCount: callSites.filter((item) => !item.file.startsWith("app/api/")).length,
    routeViolationCount: routeViolations.length,
    sharedViolationCount: sharedViolations.length,
    callsByArea: Object.fromEntries(Object.entries(callsByArea).sort(([left], [right]) => left.localeCompare(right))),
    violationsByKind: Object.fromEntries(Object.entries(violationsByKind).sort(([left], [right]) => left.localeCompare(right))),
    edgeApiGuardConsumers,
    nodeBuiltinImportedByApiGuard: /from\s*["']node:/.test(fs.readFileSync(path.join(root, definitionFile), "utf8")),
    files,
    violations,
  };
}

const selfTestDetection = process.argv.includes("--self-test-detection");
const receipt = inspectSoftRateLimitMigration({
  fixtureSources: selfTestDetection ? [
    'import { applySoftRateLimit as compat } from "@/lib/security/api-guard"; export async function GET(request) { const decision = await compat(request); return decision.ok ? new Response() : decision.response; }',
    'import { applyApiRateLimit } from "@/lib/security/api-guard"; export async function GET(request) { applyApiRateLimit(request); return new Response(); }',
    'import { applyApiRateLimit as limit } from "@/lib/security/api-guard"; export async function GET(request) { await limit(request); return new Response(); }',
    'import * as guard from "@/lib/security/api-guard"; export async function GET(request) { const decision = await guard.applySoftRateLimit(request); return decision.response; }',
    'import { applyApiRateLimit } from "@/lib/security/api-guard"; export async function GET(request) { const decision = await applyApiRateLimit(request); return new Response(String(decision.ok)); }',
    'import { applyWriteApiRateLimit as limitWrite } from "@/lib/security/write-api-rate-limit"; export async function POST(request) { const decision = await limitWrite(request); return new Response(String(decision.ok)); }',
  ] : [],
});
console.log(JSON.stringify(receipt, null, 2));

const expectBlocked = process.argv.includes("--expect-blocked");
if (selfTestDetection || expectBlocked) {
  const requiredMutationKinds = [
    "legacy_import",
    "legacy_call",
    "durable_call_not_directly_awaited",
    "durable_decision_ignored_or_not_bound",
    "durable_denial_response_not_returned",
  ];
  if (receipt.ok || receipt.status !== "BLOCKED_P0" ||
      (selfTestDetection && requiredMutationKinds.some((kind) => !receipt.violationsByKind[kind]))) process.exitCode = 1;
} else if (!receipt.ok) {
  process.exitCode = 1;
}
