import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
const ROUTE_CONFIG_NAMES = new Set([
  "runtime",
  "dynamic",
  "maxDuration",
  "revalidate",
  "preferredRegion",
  "fetchCache",
  "dynamicParams",
]);

function portablePath(value) {
  return value.split(path.sep).join("/");
}

export function compareRawPaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort(compareRawPaths)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function regularNonSymlinkFile(filePath, label) {
  const metadata = fs.lstatSync(filePath);
  if (metadata.isSymbolicLink()) throw new Error(`${label}_symlink_forbidden`);
  if (!metadata.isFile()) throw new Error(`${label}_must_be_regular_file`);
  return metadata;
}

async function importTypeScriptFile(filePath, provenance) {
  if (!path.isAbsolute(filePath)) throw new Error("typescript_module_path_must_be_absolute");
  const metadata = regularNonSymlinkFile(filePath, "typescript_module");
  const imported = await import(pathToFileURL(filePath).href);
  const ts = imported.default ?? imported;
  if (!ts || typeof ts.createSourceFile !== "function" || typeof ts.version !== "string") {
    throw new Error("typescript_module_shape_invalid");
  }
  const bytes = fs.readFileSync(filePath);
  return {
    ts,
    provenance: {
      source: provenance,
      version: ts.version,
      moduleSha256: sha256(bytes),
      moduleByteLength: bytes.length,
      exactToolchainCreditEligible: provenance === "PROJECT_DEPENDENCY",
      pathDisclosure: provenance === "PROJECT_DEPENDENCY"
        ? "node_modules/typescript/lib/typescript.js"
        : "EXTERNAL_DIAGNOSTIC_MODULE_REDACTED",
      mode: metadata.mode & 0o111 ? "100755" : "100644",
    },
  };
}

export async function loadTypeScriptForRouteAst({ root = process.cwd() } = {}) {
  const localModule = path.join(root, "node_modules", "typescript", "lib", "typescript.js");
  try {
    return await importTypeScriptFile(localModule, "PROJECT_DEPENDENCY");
  } catch (error) {
    const allowDiagnostic = process.env.VELMERE_ALLOW_DIAGNOSTIC_TYPESCRIPT === "1";
    const externalModule = process.env.VELMERE_DIAGNOSTIC_TYPESCRIPT_MODULE;
    if (!allowDiagnostic || typeof externalModule !== "string" || externalModule.length === 0) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNAVAILABLE";
      throw new Error(`typescript_project_dependency_unavailable:${code}`, { cause: error });
    }
    return importTypeScriptFile(path.resolve(externalModule), "DIAGNOSTIC_EXTERNAL_ONLY");
  }
}

function modifierKinds(ts, node) {
  if (typeof ts.canHaveModifiers === "function" && typeof ts.getModifiers === "function") {
    return (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined) ?? [];
  }
  return node.modifiers ?? [];
}

function hasModifier(ts, node, kind) {
  return modifierKinds(ts, node).some((modifier) => modifier.kind === kind);
}

function identifierText(ts, node) {
  return node && ts.isIdentifier(node) ? node.text : null;
}

function exportedNameText(ts, element) {
  if (!element) return null;
  if (element.name && ts.isIdentifier(element.name)) return element.name.text;
  return null;
}

export function parseRouteModuleAst({ ts, root = process.cwd(), relativePath }) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)) {
    throw new Error("route_ast_relative_path_invalid");
  }
  const normalized = portablePath(relativePath);
  if (normalized.split("/").some((segment) => segment === ".." || segment === "")) {
    throw new Error("route_ast_relative_path_unsafe");
  }
  const absolutePath = path.join(root, ...normalized.split("/"));
  const metadata = regularNonSymlinkFile(absolutePath, "route_ast_source");
  const bytes = fs.readFileSync(absolutePath);
  const sourceText = bytes.toString("utf8");
  const scriptKind = normalized.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : normalized.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : normalized.endsWith(".js") || normalized.endsWith(".mjs")
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    normalized,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const parseDiagnostics = (sourceFile.parseDiagnostics ?? []).map((diagnostic) => ({
    code: diagnostic.code,
    start: diagnostic.start ?? null,
    length: diagnostic.length ?? null,
    message: typeof diagnostic.messageText === "string"
      ? diagnostic.messageText
      : "nested_parse_diagnostic",
  }));

  const methodCounts = new Map();
  const methodKinds = new Map();
  const routeConfig = {};
  let namedReExportCount = 0;
  let exportStarCount = 0;

  const addMethod = (name, kind) => {
    if (!HTTP_METHODS.has(name)) return;
    methodCounts.set(name, (methodCounts.get(name) ?? 0) + 1);
    const kinds = methodKinds.get(name) ?? [];
    kinds.push(kind);
    methodKinds.set(name, kinds);
  };

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      if (!hasModifier(ts, statement, ts.SyntaxKind.ExportKeyword)) continue;
      const name = identifierText(ts, statement.name);
      if (name) addMethod(name, "function_declaration");
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      if (!hasModifier(ts, statement, ts.SyntaxKind.ExportKeyword)) continue;
      for (const declaration of statement.declarationList.declarations) {
        const name = identifierText(ts, declaration.name);
        if (!name) continue;
        addMethod(name, "variable_declaration");
        if (ROUTE_CONFIG_NAMES.has(name)) {
          routeConfig[name] = declaration.initializer
            ? declaration.initializer.getText(sourceFile)
            : null;
        }
      }
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause) {
        exportStarCount += 1;
        continue;
      }
      if (!ts.isNamedExports(statement.exportClause)) continue;
      namedReExportCount += 1;
      for (const element of statement.exportClause.elements) {
        const name = exportedNameText(ts, element);
        if (name) addMethod(name, statement.moduleSpecifier ? "named_reexport" : "named_export");
      }
    }
  }

  const duplicateMethods = [...methodCounts.entries()]
    .filter(([, count]) => count !== 1)
    .map(([method, count]) => ({ method, count }))
    .sort((left, right) => compareRawPaths(left.method, right.method));
  const methods = [...methodCounts.keys()].sort(compareRawPaths);
  const exportKinds = Object.fromEntries(
    [...methodKinds.entries()]
      .sort(([left], [right]) => compareRawPaths(left, right))
      .map(([method, kinds]) => [method, [...kinds].sort(compareRawPaths)]),
  );

  return {
    path: normalized,
    byteLength: bytes.length,
    sha256: sha256(bytes),
    mode: metadata.mode & 0o111 ? "100755" : "100644",
    methods,
    exportKinds,
    duplicateMethods,
    routeConfig,
    parseDiagnostics,
    namedReExportCount,
    exportStarCount,
    astEligible: parseDiagnostics.length === 0 && duplicateMethods.length === 0 && exportStarCount === 0,
  };
}

function walkRouteFiles(root, directory, relativeDirectory, output) {
  if (!fs.existsSync(directory)) return;
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => compareRawPaths(left.name, right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`route_ast_discovery_symlink:${relativePath}`);
    if (entry.isDirectory()) {
      walkRouteFiles(root, absolutePath, relativePath, output);
      continue;
    }
    if (entry.isFile() && /^route\.(?:ts|tsx|js|jsx|mjs)$/u.test(entry.name)) {
      output.add(portablePath(relativePath));
    }
  }
}

export function discoverRouteAstPaths({ root = process.cwd() } = {}) {
  const paths = new Set();
  walkRouteFiles(root, path.join(root, "app"), "app", paths);

  const dispatchManifestPath = path.join(root, "config/pass15/route-dispatch-manifest.json");
  if (fs.existsSync(dispatchManifestPath)) {
    const dispatch = JSON.parse(fs.readFileSync(dispatchManifestPath, "utf8"));
    for (const group of ["marketIntegrity", "internalWorkers", "security", "search", "admin"]) {
      const value = dispatch[group];
      if (!value || !Array.isArray(value.routes)) continue;
      if (typeof value.dispatcher === "string") paths.add(portablePath(value.dispatcher));
      for (const route of value.routes) {
        if (typeof route.handlerModule === "string") paths.add(portablePath(route.handlerModule));
        if (typeof route.originalPath === "string" && fs.existsSync(path.join(root, route.originalPath))) {
          paths.add(portablePath(route.originalPath));
        }
      }
    }
  }

  const lazyManifestPath = path.join(root, "config/pass15/lazy-route-shell-manifest.json");
  if (fs.existsSync(lazyManifestPath)) {
    const lazy = JSON.parse(fs.readFileSync(lazyManifestPath, "utf8"));
    for (const route of lazy.routes ?? []) {
      if (typeof route.route === "string") paths.add(portablePath(route.route));
      if (typeof route.handlerModule === "string") paths.add(portablePath(route.handlerModule));
    }
  }

  return [...paths]
    .filter((relativePath) => fs.existsSync(path.join(root, relativePath)))
    .sort(compareRawPaths);
}

export function buildRouteAstRegistryCore({ revisionId, generatedAt, parser, rows }) {
  const orderedRows = [...rows].sort((left, right) => compareRawPaths(left.path, right.path));
  const paths = orderedRows.map((row) => row.path);
  const duplicatePaths = paths.filter((value, index) => index > 0 && value === paths[index - 1]);
  if (duplicatePaths.length) throw new Error(`route_ast_registry_duplicate_paths:${duplicatePaths.join(",")}`);
  return {
    schemaVersion: "velmere.pass15.route-export-ast-registry.v1",
    revisionId,
    generatedAt,
    parser,
    truthBoundary:
      "TypeScript AST-derived export and route-config inventory. A DIAGNOSTIC_EXTERNAL_ONLY parser may build local evidence but grants no exact toolchain, browser, LIVE or sale credit; final A78R1/A79R1 must reparse with the project dependency on exact final bytes.",
    fileCount: orderedRows.length,
    methodExportCount: orderedRows.reduce((sum, row) => sum + row.methods.length, 0),
    pathSetSha256: sha256(paths.join("\n")),
    aggregateSha256: sha256(
      orderedRows
        .map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.methods.join(",")}\0${canonicalJson(row.routeConfig)}`)
        .join("\n"),
    ),
    rows: orderedRows,
    exactAstReparseCredit: parser.exactToolchainCreditEligible === true,
  };
}

export function withRouteAstRegistryDigest(core) {
  return { ...core, registryDigestSha256: sha256(canonicalJson(core)) };
}

export function routeAstRegistryDigestValid(registry) {
  if (!registry || typeof registry !== "object" || typeof registry.registryDigestSha256 !== "string") return false;
  const { registryDigestSha256, ...core } = registry;
  return registryDigestSha256 === sha256(canonicalJson(core));
}

export function readVerifiedRouteAstRegistry({
  root = process.cwd(),
  registryPath = "config/pass15/route-export-ast-registry.json",
} = {}) {
  const absolutePath = path.join(root, registryPath);
  regularNonSymlinkFile(absolutePath, "route_ast_registry");
  const registry = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  if (!routeAstRegistryDigestValid(registry)) throw new Error("route_ast_registry_digest_mismatch");
  if (!Array.isArray(registry.rows) || registry.fileCount !== registry.rows.length) {
    throw new Error("route_ast_registry_denominator_mismatch");
  }
  const rowsByPath = new Map();
  let previous = null;
  for (const row of registry.rows) {
    if (!row || typeof row.path !== "string" || !Array.isArray(row.methods)) {
      throw new Error("route_ast_registry_row_invalid");
    }
    if (previous !== null && compareRawPaths(previous, row.path) >= 0) {
      throw new Error("route_ast_registry_order_or_duplicate_invalid");
    }
    previous = row.path;
    const absoluteSource = path.join(root, row.path);
    const metadata = regularNonSymlinkFile(absoluteSource, "route_ast_registered_source");
    const bytes = fs.readFileSync(absoluteSource);
    if (bytes.length !== row.byteLength || sha256(bytes) !== row.sha256) {
      throw new Error(`route_ast_registry_source_mismatch:${row.path}`);
    }
    const expectedMode = metadata.mode & 0o111 ? "100755" : "100644";
    if (row.mode !== expectedMode) throw new Error(`route_ast_registry_mode_mismatch:${row.path}`);
    if (row.parseDiagnostics?.length || row.duplicateMethods?.length || row.exportStarCount !== 0 || row.astEligible !== true) {
      throw new Error(`route_ast_registry_row_not_ast_eligible:${row.path}`);
    }
    rowsByPath.set(row.path, row);
  }
  const currentPaths = discoverRouteAstPaths({ root });
  const declaredPaths = registry.rows.map((row) => row.path);
  if (canonicalJson(currentPaths) !== canonicalJson(declaredPaths)) {
    throw new Error("route_ast_registry_path_set_drift");
  }
  if (sha256(declaredPaths.join("\n")) !== registry.pathSetSha256) {
    throw new Error("route_ast_registry_path_set_digest_mismatch");
  }
  const aggregate = sha256(
    registry.rows
      .map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.methods.join(",")}\0${canonicalJson(row.routeConfig)}`)
      .join("\n"),
  );
  if (aggregate !== registry.aggregateSha256) throw new Error("route_ast_registry_aggregate_mismatch");
  return { registry, rowsByPath };
}
