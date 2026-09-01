import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const REVISION_PATTERN = /PASS36_A(\d+)R(\d+)_/u;
const MANIFEST_NAME_PATTERN = /^a(\d+)(?:r(\d+))?-current-root-descendant-manifest\.json$/u;
const MANIFEST_SUFFIX = "-current-root-descendant-manifest.json";
const HISTORICAL_SPARSE_EDGE_LEDGER_PATH = "config/pass36/a102r41-historical-descendant-sparse-edge-ledger.json";
const R41_REVISION = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const R40_REVISION = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
const R36_REVISION = "VELMERE_PASS36_A102R36_ACTION_REQUIRED_WINDOWS_ESLINT_RUNNER_PROCESS_EXEC_PATH_PORTABILITY_AND_EXACT_LINT_CLOSURE_NO_REAL_CREDIT";
const R38_REVISION = "VELMERE_PASS36_A102R38_ACTION_REQUIRED_PRODUCTION_SMOKE_UNIQUE_ASSERTION_RESULT_DENOMINATOR_AND_SOURCE_AUTHORITY_RECONCILIATION_NO_LIVE_CREDIT";
const R36_PATH = "config/pass36/a102r36-current-root-descendant-manifest.json";
const R38_PATH = "config/pass36/a102r38-current-root-descendant-manifest.json";
const R38_STATE_PATH = "config/pass36/a102r38-action-required-current-state.json";
const R36_RAW_SHA256 = "843d66a0184fdb095a94245010575fa206fa4f565c539ef0271a8821520c71ec";
const R38_RAW_SHA256 = "f70520a4e6eb8b3d453769daab67682311a4ea97dea0a18ce33a8b25175e254b";
const R36_MANIFEST_DIGEST = "dc5fb4fe1bfbfe3e9c8c04eea96b9f416ca63bc9b73799e9a6993654fda8f87e";
const R38_MANIFEST_DIGEST = "363eca391415039d1f0e3df57830eac14b641160035f100e5317c832a6d0bf3c";
const R38_STATE_RAW_SHA256 = "9fb364d47de449ca43e95b8af8f2b7b63c838efa3abb784774a0e37c361a3a7f";

export const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
export const canonicalJson = (value) => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`
    : JSON.stringify(value);
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const digestValid = (document) => {
  if (!document || typeof document !== "object") return false;
  const core = { ...document };
  delete core.manifestDigestSha256;
  return document.manifestDigestSha256 === sha256(canonicalJson(core));
};

const exactKeys = (value, expected) => (
  value
  && typeof value === "object"
  && !Array.isArray(value)
  && canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort())
);

export function inspectHistoricalSparseEdgeLedger(root) {
  const absoluteLedgerPath = path.join(root, HISTORICAL_SPARSE_EDGE_LEDGER_PATH);
  if (!fs.existsSync(absoluteLedgerPath)) {
    return {
      present: false,
      ok: true,
      path: HISTORICAL_SPARSE_EDGE_LEDGER_PATH,
      edges: [],
      errors: [],
      classification: "NO_EXCEPTION_LEDGER_PRESENT",
    };
  }
  const errors = [];
  const require = (condition, id, detail = null) => {
    if (!condition) errors.push({ id, detail });
  };
  let ledger = null;
  try {
    ledger = readJson(root, HISTORICAL_SPARSE_EDGE_LEDGER_PATH);
  } catch (error) {
    errors.push({ id: "ledger-json", detail: error instanceof Error ? error.message : String(error) });
  }
  if (!ledger) {
    return { present: true, ok: false, path: HISTORICAL_SPARSE_EDGE_LEDGER_PATH, edges: [], errors };
  }
  require(exactKeys(ledger, [
    "schemaVersion", "revisionId", "parentRevisionId", "edgeCount", "edges", "wildcardEdgesAllowed",
    "additionalEdgesAllowed", "historicalManifestRewriteAllowed", "passCredit", "live",
    "saleEnabled", "productionApproved", "worldClassProven", "ledgerDigestSha256",
  ]), "ledger-top-level-keys");
  const core = { ...ledger };
  delete core.ledgerDigestSha256;
  require(
    /^[a-f0-9]{64}$/u.test(String(ledger.ledgerDigestSha256 ?? ""))
      && ledger.ledgerDigestSha256 === sha256(canonicalJson(core)),
    "ledger-self-digest",
    ledger.ledgerDigestSha256 ?? null,
  );
  require(ledger.schemaVersion === "velmere.pass36.a102r41.historical-descendant-sparse-edge-ledger.v1", "ledger-schema");
  require(ledger.revisionId === R41_REVISION, "ledger-revision", ledger.revisionId ?? null);
  require(ledger.parentRevisionId === R40_REVISION, "ledger-parent-revision", ledger.parentRevisionId ?? null);
  require(ledger.edgeCount === 1 && Array.isArray(ledger.edges) && ledger.edges.length === 1, "ledger-single-edge");
  require(ledger.wildcardEdgesAllowed === false && ledger.additionalEdgesAllowed === false, "ledger-no-wildcards-or-additional-edges");
  require(ledger.historicalManifestRewriteAllowed === false, "ledger-no-history-rewrite");
  require(
    ledger.passCredit === false
      && ledger.live === false
      && ledger.saleEnabled === false
      && ledger.productionApproved === false
      && ledger.worldClassProven === false,
    "ledger-no-promotion",
  );
  const edge = Array.isArray(ledger.edges) && ledger.edges.length === 1 ? ledger.edges[0] : null;
  require(exactKeys(edge, [
    "parent", "child", "absentInternalRevisionNumbers", "externalCheckpoint",
    "externalPackageMayDefineSourceAuthority", "fabricateMissingManifestForbidden",
    "rewriteHistoricalManifestForbidden", "passCredit", "live", "saleEnabled",
    "productionApproved", "worldClassProven",
  ]), "edge-keys");
  require(exactKeys(edge?.parent, ["revisionId", "path", "rawSha256", "manifestDigestSha256"]), "edge-parent-keys");
  require(exactKeys(edge?.child, ["revisionId", "path", "rawSha256", "manifestDigestSha256"]), "edge-child-keys");
  require(
    edge?.parent?.revisionId === R36_REVISION
      && edge?.parent?.path === R36_PATH
      && edge?.parent?.rawSha256 === R36_RAW_SHA256
      && edge?.parent?.manifestDigestSha256 === R36_MANIFEST_DIGEST,
    "edge-parent-exact",
    edge?.parent ?? null,
  );
  require(
    edge?.child?.revisionId === R38_REVISION
      && edge?.child?.path === R38_PATH
      && edge?.child?.rawSha256 === R38_RAW_SHA256
      && edge?.child?.manifestDigestSha256 === R38_MANIFEST_DIGEST,
    "edge-child-exact",
    edge?.child ?? null,
  );
  require(canonicalJson(edge?.absentInternalRevisionNumbers) === canonicalJson([37]), "edge-exact-absence");
  require(
    edge?.externalPackageMayDefineSourceAuthority === false
      && edge?.fabricateMissingManifestForbidden === true
      && edge?.rewriteHistoricalManifestForbidden === true
      && edge?.passCredit === false
      && edge?.live === false
      && edge?.saleEnabled === false
      && edge?.productionApproved === false
      && edge?.worldClassProven === false,
    "edge-no-authority-or-promotion",
  );
  const external = edge?.externalCheckpoint;
  require(exactKeys(external, [
    "revisionId", "sourceArchiveFileName", "sourceArchiveByteLength", "sourceArchiveSha256",
    "sourcePayloadFileCount", "sourcePayloadByteLength", "sourceTreeSha256",
    "materialsArchiveFileName", "materialsArchiveByteLength", "materialsArchiveSha256",
    "observedInternalSourceAuthorityRevisionId", "classification",
  ]), "edge-external-checkpoint-keys");
  require(
    external?.revisionId === "VELMERE_PASS36_A102R37R4_ACTION_REQUIRED_DUAL_LOCAL_BUILD_PARITY_DIAGNOSTIC_BROWSER57_PASS_EXACT_CHROME_WINDOWS_STAGING_PENDING_NO_LIVE_CREDIT"
      && external?.sourceArchiveByteLength === 49999759
      && external?.sourceArchiveSha256 === "da02611bc1baba82927df003889de1125b38d1d65ee0317128a4e2a6fecdec1e"
      && external?.sourcePayloadFileCount === 5414
      && external?.sourcePayloadByteLength === 122435425
      && external?.sourceTreeSha256 === "5b0a53eb29b8ea770314520f71f27f2867611fc01b3a8cb6c41a46f0830ba757"
      && external?.materialsArchiveByteLength === 793725
      && external?.materialsArchiveSha256 === "b2b5e236f2b494fe18025daa35404ae5754cf07cd21caa07ccf74b6116af3e88"
      && external?.observedInternalSourceAuthorityRevisionId === R36_REVISION
      && external?.classification === "EXTERNAL_EVIDENCE_CHECKPOINT_OVER_A102R36_SOURCE_BYTES_NOT_INTERNAL_SOURCE_AUTHORITY",
    "edge-external-checkpoint-exact",
    external ?? null,
  );
  for (const [relativePath, rawSha256, manifestDigestSha256, revisionId] of [
    [R36_PATH, R36_RAW_SHA256, R36_MANIFEST_DIGEST, R36_REVISION],
    [R38_PATH, R38_RAW_SHA256, R38_MANIFEST_DIGEST, R38_REVISION],
  ]) {
    const absolutePath = path.join(root, relativePath);
    require(fs.existsSync(absolutePath), `edge-file-present:${relativePath}`);
    if (fs.existsSync(absolutePath)) {
      const bytes = fs.readFileSync(absolutePath);
      let document = null;
      try { document = JSON.parse(bytes.toString("utf8")); } catch { /* recorded below */ }
      require(sha256(bytes) === rawSha256, `edge-file-raw-sha256:${relativePath}`);
      require(document?.revisionId === revisionId, `edge-file-revision:${relativePath}`);
      require(document?.manifestDigestSha256 === manifestDigestSha256 && digestValid(document), `edge-file-manifest-digest:${relativePath}`);
    }
  }
  const r37Names = fs.existsSync(path.join(root, "config/pass36"))
    ? fs.readdirSync(path.join(root, "config/pass36")).filter((name) => /^a102r37(?:r\d+)?-current-root-descendant-manifest\.json$/iu.test(name))
    : [];
  require(r37Names.length === 0, "edge-no-fabricated-r37-manifest", r37Names);
  try {
    const r38StateBytes = fs.readFileSync(path.join(root, R38_STATE_PATH));
    require(sha256(r38StateBytes) === R38_STATE_RAW_SHA256, "edge-r38-state-raw-sha256");
    const r38State = JSON.parse(r38StateBytes.toString("utf8"));
    require(canonicalJson(r38State.inputExternalCheckpoint) === canonicalJson(external), "edge-external-checkpoint-state-binding");
  } catch (error) {
    errors.push({ id: "edge-r38-state-binding", detail: error instanceof Error ? error.message : String(error) });
  }
  return {
    present: true,
    ok: errors.length === 0,
    path: HISTORICAL_SPARSE_EDGE_LEDGER_PATH,
    edges: errors.length === 0 ? [edge] : [],
    errors,
    classification: errors.length === 0 ? "EXACT_SINGLE_HISTORICAL_EXCEPTION" : "INVALID_EXCEPTION_LEDGER",
  };
}

function sparseTransitionValid(parentRecord, childRecord, ledger) {
  if (!ledger.present || !ledger.ok) return false;
  return ledger.edges.some((edge) => (
    edge.parent.revisionId === parentRecord.document?.revisionId
    && edge.parent.path === parentRecord.relativePath
    && edge.parent.manifestDigestSha256 === parentRecord.document?.manifestDigestSha256
    && edge.child.revisionId === childRecord.document?.revisionId
    && edge.child.path === childRecord.relativePath
    && edge.child.manifestDigestSha256 === childRecord.document?.manifestDigestSha256
  ));
}

export const revisionCoordinates = (revisionId) => {
  const match = String(revisionId ?? "").match(REVISION_PATTERN);
  return match
    ? { passNumber: Number(match[1]), revisionNumber: Number(match[2]) }
    : null;
};
export const passNumberFromRevision = (revisionId) => revisionCoordinates(revisionId)?.passNumber ?? null;
export const descendantManifestPath = (passNumber) => `config/pass36/a${passNumber}-current-root-descendant-manifest.json`;
export const descendantManifestPathForRevision = (revisionId) => {
  const coordinates = revisionCoordinates(revisionId);
  if (!coordinates) return null;
  const revisionSuffix = coordinates.revisionNumber === 0 ? "" : `r${coordinates.revisionNumber}`;
  return `config/pass36/a${coordinates.passNumber}${revisionSuffix}${MANIFEST_SUFFIX}`;
};

function manifestPathSafe(root, relativePath, expectedRevisionId = null) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || path.isAbsolute(relativePath)
    || relativePath.includes("\\")
    || path.posix.normalize(relativePath) !== relativePath
  ) return false;
  const expectedPath = expectedRevisionId
    ? descendantManifestPathForRevision(expectedRevisionId)
    : null;
  if (expectedPath && relativePath !== expectedPath) return false;
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  return resolvedPath.startsWith(`${resolvedRoot}${path.sep}`);
}

function inventoryDescendantManifests(root) {
  const configDirectory = path.join(root, "config/pass36");
  if (!fs.existsSync(configDirectory)) {
    return { records: [], unsafeNames: [], unreadable: [] };
  }
  const records = [];
  const unsafeNames = [];
  const unreadable = [];
  for (const name of fs.readdirSync(configDirectory).sort()) {
    const exactMatch = name.match(MANIFEST_NAME_PATTERN);
    const looksLikeManifest = name.toLowerCase().endsWith(MANIFEST_SUFFIX);
    if (!exactMatch) {
      if (looksLikeManifest) unsafeNames.push(name);
      continue;
    }
    const relativePath = `config/pass36/${name}`;
    try {
      const document = readJson(root, relativePath);
      const coordinates = revisionCoordinates(document?.revisionId);
      records.push({
        relativePath,
        document,
        coordinates,
        fileNameAligned:
          coordinates !== null
          && descendantManifestPathForRevision(document.revisionId) === relativePath,
      });
    } catch (error) {
      unreadable.push({
        relativePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { records, unsafeNames, unreadable };
}

function transitionValid(parent, child) {
  const parentCoordinates = revisionCoordinates(parent?.revisionId);
  const childCoordinates = revisionCoordinates(child?.revisionId);
  if (!parentCoordinates || !childCoordinates) return false;
  if (
    childCoordinates.passNumber === parentCoordinates.passNumber
    && childCoordinates.revisionNumber === parentCoordinates.revisionNumber + 1
  ) return true;
  if (
    childCoordinates.passNumber === parentCoordinates.passNumber + 1
    && childCoordinates.revisionNumber === 0
  ) return true;
  return (
    parent?.checkpointClass !== "ACTION_REQUIRED_NON_PASS"
    && child?.checkpointClass === "ACTION_REQUIRED_NON_PASS"
    && child?.completedThrough === parentCoordinates.passNumber
    && childCoordinates.passNumber > parentCoordinates.passNumber
  );
}

function actionRequiredTruth(document) {
  const coordinates = revisionCoordinates(document?.revisionId);
  const completedThrough = document?.completedThrough;
  const uncreditedPasses = coordinates && Number.isInteger(completedThrough)
    && completedThrough < coordinates.passNumber
    ? Array.from(
        { length: coordinates.passNumber - completedThrough },
        (_, index) => completedThrough + index + 1,
      )
    : [];
  const credits = Object.fromEntries(
    uncreditedPasses.map((passNumber) => [
      `a${passNumber}PassCredit`,
      document?.claims?.[`a${passNumber}PassCredit`],
    ]),
  );
  const promotionClaims = {
    liveProven: document?.claims?.liveProven,
    saleEnabled: document?.claims?.saleEnabled,
    productionApproved: document?.claims?.productionApproved,
    worldClassProven: document?.claims?.worldClassProven,
  };
  return {
    uncreditedPasses,
    credits,
    promotionClaims,
    passed:
      document?.checkpointClass === "ACTION_REQUIRED_NON_PASS"
      && uncreditedPasses.length > 0
      && Object.values(credits).every((value) => value === false)
      && Object.values(promotionClaims).every((value) => value === false),
  };
}

export function verifyHistoricalDescendantChain(root, startManifestPath, currentRevisionId) {
  const checks = [];
  const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
  const inventory = inventoryDescendantManifests(root);
  const sparseLedger = inspectHistoricalSparseEdgeLedger(root);
  add("chain:sparse-edge-ledger-integrity", sparseLedger.ok, {
    present: sparseLedger.present,
    path: sparseLedger.path,
    classification: sparseLedger.classification,
    errors: sparseLedger.errors,
  });
  add("chain:inventory-safe-names", inventory.unsafeNames.length === 0, inventory.unsafeNames);
  add("chain:inventory-readable", inventory.unreadable.length === 0, inventory.unreadable);
  add(
    "chain:inventory-filename-revision-binding",
    inventory.records.every((record) => record.fileNameAligned),
    inventory.records
      .filter((record) => !record.fileNameAligned)
      .map((record) => ({ path: record.relativePath, revisionId: record.document?.revisionId ?? null })),
  );

  const revisionGroups = new Map();
  for (const record of inventory.records) {
    const revisionId = record.document?.revisionId;
    if (typeof revisionId !== "string") continue;
    const group = revisionGroups.get(revisionId) ?? [];
    group.push(record.relativePath);
    revisionGroups.set(revisionId, group);
  }
  const duplicateRevisions = [...revisionGroups.entries()]
    .filter(([, paths]) => paths.length !== 1)
    .map(([revisionId, paths]) => ({ revisionId, paths }));
  add("chain:inventory-revision-unique", duplicateRevisions.length === 0, duplicateRevisions);

  const startPathSafe = manifestPathSafe(root, startManifestPath);
  add("chain:start-path-safe", startPathSafe, startManifestPath);
  const startRecord = startPathSafe
    ? inventory.records.find((record) => record.relativePath === startManifestPath)
    : null;
  add("chain:start-present", Boolean(startRecord), startManifestPath);
  const start = startRecord?.document ?? null;
  const startCoordinates = revisionCoordinates(start?.revisionId);
  const currentCoordinates = revisionCoordinates(currentRevisionId);
  add("chain:start-digest", digestValid(start), start?.manifestDigestSha256 ?? null);
  add("chain:start-revision-path-binding", Boolean(start) && descendantManifestPathForRevision(start.revisionId) === startManifestPath, {
    expected: start ? descendantManifestPathForRevision(start.revisionId) : null,
    observed: startManifestPath,
  });
  add("chain:start-pass", Boolean(startCoordinates), start?.revisionId ?? null);
  add(
    "chain:current-pass",
    Boolean(
      startCoordinates
      && currentCoordinates
      && currentCoordinates.passNumber >= startCoordinates.passNumber,
    ),
    currentRevisionId,
  );

  const currentStatePath = path.join(root, "config/pass35/current-revision.json");
  const currentState = fs.existsSync(currentStatePath)
    ? readJson(root, "config/pass35/current-revision.json")
    : null;
  const authorityManifestPath = currentState?.currentRootDescendantManifestPath;
  add(
    "chain:authority-source-revision",
    currentState?.sourceRevisionId === currentRevisionId,
    { expected: currentRevisionId, observed: currentState?.sourceRevisionId ?? null },
  );
  add(
    "chain:authority-manifest-path-safe",
    manifestPathSafe(root, authorityManifestPath, currentRevisionId),
    {
      expected: descendantManifestPathForRevision(currentRevisionId),
      observed: authorityManifestPath ?? null,
    },
  );
  const currentRecords = inventory.records.filter(
    (record) => record.document?.revisionId === currentRevisionId,
  );
  add(
    "chain:current-revision-unique",
    currentRecords.length === 1,
    currentRecords.map((record) => record.relativePath),
  );
  add(
    "chain:authority-manifest-exact",
    currentRecords.length === 1 && currentRecords[0].relativePath === authorityManifestPath,
    {
      authorityManifestPath: authorityManifestPath ?? null,
      discovered: currentRecords.map((record) => record.relativePath),
    },
  );

  let previousRecord = startRecord ?? null;
  const rows = startRecord
    ? [{
        passNumber: startCoordinates?.passNumber ?? null,
        revisionNumber: startCoordinates?.revisionNumber ?? null,
        revisionId: start.revisionId,
        digest: start.manifestDigestSha256,
        path: startRecord.relativePath,
      }]
    : [];
  const visitedPaths = new Set(startRecord ? [startRecord.relativePath] : []);
  let step = 0;
  while (
    previousRecord
    && previousRecord.document.revisionId !== currentRevisionId
    && step <= inventory.records.length
  ) {
    step += 1;
    const previous = previousRecord.document;
    const declaredChildren = inventory.records.filter((record) => {
      const coordinates = record.coordinates;
      return (
        coordinates
        && startCoordinates
        && currentCoordinates
        && coordinates.passNumber >= startCoordinates.passNumber
        && coordinates.passNumber <= currentCoordinates.passNumber
        && record.document?.parentRevisionId === previous.revisionId
      );
    });
    add(
      `chain:step-${step}:child-unique`,
      declaredChildren.length === 1,
      declaredChildren.map((record) => ({
        path: record.relativePath,
        revisionId: record.document?.revisionId ?? null,
      })),
    );
    if (declaredChildren.length !== 1) break;
    const childRecord = declaredChildren[0];
    const child = childRecord.document;
    const childCoordinates = childRecord.coordinates;
    const patchRevision = (childCoordinates?.revisionNumber ?? 0) > 0;
    if (patchRevision) {
      add(
        `chain:step-${step}:intermediate-patch-unique`,
        declaredChildren.length === 1,
        { patchRevision: true, revisionId: child.revisionId },
      );
    }
    add(`chain:step-${step}:digest`, digestValid(child), child.manifestDigestSha256 ?? null);
    add(
      `chain:step-${step}:parent-digest`,
      child.parentDescendantManifestDigestSha256 === previous.manifestDigestSha256,
      {
        expected: previous.manifestDigestSha256,
        observed: child.parentDescendantManifestDigestSha256 ?? null,
      },
    );
    add(
      `chain:step-${step}:transition`,
      transitionValid(previous, child) || sparseTransitionValid(previousRecord, childRecord, sparseLedger),
      {
        parentRevisionId: previous.revisionId,
        childRevisionId: child.revisionId,
        childCheckpointClass: child.checkpointClass ?? null,
        childCompletedThrough: child.completedThrough ?? null,
        historicalSparseEdgeApplied: sparseTransitionValid(previousRecord, childRecord, sparseLedger),
      },
    );
    if (child.checkpointClass === "ACTION_REQUIRED_NON_PASS") {
      const checkpointTruth = actionRequiredTruth(child);
      add(`chain:step-${step}:checkpoint-truth`, checkpointTruth.passed, {
        completedThrough: child.completedThrough ?? null,
        uncreditedPasses: checkpointTruth.uncreditedPasses,
        credits: checkpointTruth.credits,
        promotionClaims: checkpointTruth.promotionClaims,
      });
      if (previous.checkpointClass === "ACTION_REQUIRED_NON_PASS") {
        add(
          `chain:step-${step}:checkpoint-completed-through-stable`,
          child.completedThrough === previous.completedThrough,
          {
            parent: previous.completedThrough ?? null,
            child: child.completedThrough ?? null,
          },
        );
      }
    } else {
      add(
        `chain:step-${step}:no-promotion`,
        child.claims?.saleEnabled === false && child.claims?.liveProven === false,
        child.claims ?? null,
      );
    }
    previousRecord = childRecord;
    visitedPaths.add(childRecord.relativePath);
    rows.push({
      passNumber: childCoordinates?.passNumber ?? null,
      revisionNumber: childCoordinates?.revisionNumber ?? null,
      revisionId: child.revisionId,
      digest: child.manifestDigestSha256,
      path: childRecord.relativePath,
      patchRevision,
    });
  }
  add(
    "chain:walk-bounded",
    step <= inventory.records.length,
    { steps: step, inventoryRecords: inventory.records.length },
  );

  const relevantUnbound = inventory.records
    .filter((record) => {
      const coordinates = record.coordinates;
      return (
        coordinates
        && startCoordinates
        && currentCoordinates
        && (
          coordinates.passNumber > startCoordinates.passNumber
          || (
            coordinates.passNumber === startCoordinates.passNumber
            && coordinates.revisionNumber >= startCoordinates.revisionNumber
          )
        )
        && (
          coordinates.passNumber < currentCoordinates.passNumber
          || (
            coordinates.passNumber === currentCoordinates.passNumber
            && coordinates.revisionNumber <= currentCoordinates.revisionNumber
          )
        )
        && !visitedPaths.has(record.relativePath)
      );
    })
    .map((record) => ({
      path: record.relativePath,
      revisionId: record.document?.revisionId ?? null,
      parentRevisionId: record.document?.parentRevisionId ?? null,
    }));
  add("chain:no-unbound-relevant-manifests", relevantUnbound.length === 0, relevantUnbound);

  const current = previousRecord?.document ?? start ?? {};
  add(
    "chain:current-revision",
    current?.revisionId === currentRevisionId,
    { expected: currentRevisionId, observed: current?.revisionId ?? null },
  );
  return {
    checks,
    rows,
    start,
    current,
    ok: checks.every((row) => row.passed),
  };
}

export function verifyCurrentAuthority(root) {
  const current = readJson(root, "config/pass35/current-revision.json");
  const authority = readJson(root, current.currentReleaseAuthorityPath ?? "config/pass36/current-release-authority.json");
  const active = fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim();
  const checks = [
    { id: "authority:current-source", passed: authority.authorityRevisionId === current.sourceRevisionId && authority.currentSource?.revisionId === current.sourceRevisionId, detail: authority.currentSource },
    { id: "authority:mirror", passed: current.currentReleaseAuthorityRevisionId === current.sourceRevisionId, detail: current.currentReleaseAuthorityRevisionId },
    { id: "authority:descendant", passed: current.currentRootDescendantManifestRevisionId === current.sourceRevisionId, detail: current.currentRootDescendantManifestRevisionId },
    { id: "authority:active", passed: active === current.sourceRevisionId, detail: active },
    { id: "authority:no-promotion", passed: current.saleEnabled === false && current.liveProven === false && authority.claims?.saleEnabled === false && authority.claims?.liveProven === false, detail: { current: { saleEnabled: current.saleEnabled, liveProven: current.liveProven }, authority: authority.claims } },
  ];
  return { current, authority, active, checks, ok: checks.every((row) => row.passed) };
}
