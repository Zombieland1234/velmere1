import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  buildRouteAstRegistryCore,
  canonicalJson,
  compareRawPaths,
  discoverRouteAstPaths,
  parseRouteModuleAst,
  sha256,
  withRouteAstRegistryDigest,
} from "./route-module-ast.mjs";

const require = createRequire(import.meta.url);

function regularNonSymlinkFile(filePath, label) {
  const metadata = fs.lstatSync(filePath);
  if (metadata.isSymbolicLink()) throw new Error(`${label}_symlink_forbidden`);
  if (!metadata.isFile()) throw new Error(`${label}_must_be_regular_file`);
  return metadata;
}

function freezeDigestValid(freeze) {
  if (!freeze || typeof freeze !== "object" || typeof freeze.freezeDigestSha256 !== "string") return false;
  const { freezeDigestSha256, ...core } = freeze;
  return freezeDigestSha256 === sha256(canonicalJson(core));
}

function loadProjectTypeScriptSync(root) {
  const localModule = path.join(root, "node_modules", "typescript", "lib", "typescript.js");
  const metadata = regularNonSymlinkFile(localModule, "typescript_module");
  let ts;
  try {
    const loaded = require(localModule);
    ts = loaded?.default ?? loaded;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNAVAILABLE";
    throw new Error(`typescript_project_dependency_unavailable:${code}`, { cause: error });
  }
  if (!ts || typeof ts.createSourceFile !== "function" || typeof ts.version !== "string") {
    throw new Error("typescript_module_shape_invalid");
  }
  const bytes = fs.readFileSync(localModule);
  return {
    ts,
    provenance: {
      source: "PROJECT_DEPENDENCY",
      version: ts.version,
      moduleSha256: sha256(bytes),
      moduleByteLength: bytes.length,
      exactToolchainCreditEligible: true,
      pathDisclosure: "node_modules/typescript/lib/typescript.js",
      mode: metadata.mode & 0o111 ? "100755" : "100644",
    },
  };
}

export function readVerifiedRouteAstFreezeV2({
  root = process.cwd(),
  freezePath = "config/pass15/route-export-ast-freeze-v2.json",
} = {}) {
  const absoluteFreeze = path.join(root, freezePath);
  regularNonSymlinkFile(absoluteFreeze, "route_ast_freeze_v2");
  const freeze = JSON.parse(fs.readFileSync(absoluteFreeze, "utf8"));
  if (freeze.schemaVersion !== "velmere.pass15.route-export-ast-freeze.v2") {
    throw new Error("route_ast_freeze_v2_schema_mismatch");
  }
  if (!freezeDigestValid(freeze)) throw new Error("route_ast_freeze_v2_digest_mismatch");
  if (freeze.exactAstReparseCredit !== true) throw new Error("route_ast_freeze_v2_exact_credit_missing");

  const { ts, provenance } = loadProjectTypeScriptSync(root);
  if (canonicalJson(provenance) !== canonicalJson(freeze.parser)) {
    throw new Error("route_ast_freeze_v2_parser_provenance_mismatch");
  }

  const currentPaths = discoverRouteAstPaths({ root });
  const rows = currentPaths.map((relativePath) => parseRouteModuleAst({ ts, root, relativePath }));
  const ineligible = rows.filter(
    (row) => row.parseDiagnostics?.length || row.duplicateMethods?.length || row.exportStarCount !== 0 || row.astEligible !== true,
  );
  if (ineligible.length) {
    throw new Error(`route_ast_freeze_v2_ineligible_rows:${ineligible.map((row) => row.path).join(",")}`);
  }

  const core = buildRouteAstRegistryCore({
    revisionId: freeze.revisionId,
    generatedAt: freeze.generatedAt,
    parser: provenance,
    rows,
  });
  const registry = withRouteAstRegistryDigest(core);

  if (registry.fileCount !== freeze.fileCount || rows.length !== freeze.fileCount) {
    throw new Error(`route_ast_freeze_v2_denominator_mismatch:${rows.length}/${freeze.fileCount}`);
  }
  if (registry.methodExportCount !== freeze.methodExportCount) {
    throw new Error(`route_ast_freeze_v2_method_count_mismatch:${registry.methodExportCount}/${freeze.methodExportCount}`);
  }
  if (registry.pathSetSha256 !== freeze.pathSetSha256) throw new Error("route_ast_freeze_v2_path_set_mismatch");
  if (registry.aggregateSha256 !== freeze.aggregateSha256) throw new Error("route_ast_freeze_v2_aggregate_mismatch");
  if (registry.registryDigestSha256 !== freeze.candidateRegistryDigestSha256) {
    throw new Error("route_ast_freeze_v2_candidate_registry_digest_mismatch");
  }
  if (registry.exactAstReparseCredit !== true) throw new Error("route_ast_freeze_v2_runtime_exact_credit_missing");

  const orderedPaths = rows.map((row) => row.path).sort(compareRawPaths);
  if (canonicalJson(orderedPaths) !== canonicalJson(currentPaths)) throw new Error("route_ast_freeze_v2_path_order_mismatch");
  const rowsByPath = new Map(rows.map((row) => [row.path, row]));
  if (rowsByPath.size !== freeze.fileCount) throw new Error("route_ast_freeze_v2_unique_path_denominator_mismatch");

  return {
    registry: {
      ...registry,
      schemaVersion: "velmere.pass15.route-export-ast-registry.runtime-reparse.v2",
      freezeSchemaVersion: freeze.schemaVersion,
      freezeDigestSha256: freeze.freezeDigestSha256,
      evidence: freeze.evidence,
    },
    rowsByPath,
    freeze,
  };
}
