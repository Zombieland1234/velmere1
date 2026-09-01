#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  A94R1_IMMUTABLE_LOG_FIXTURE_PATH,
  A94R1_MANIFEST_PATH,
  A94R1_PACKAGE_MANIFEST_PATH,
  collectA94R1PackagedTreeRows,
  collectA94R1SourceRows,
  compareA94R1Paths,
  inspectA94R1RuntimeNodeModules,
  isA94R1SourceExcluded,
} from "./a94r1-source-boundary.mjs";

let assertions = 0;
function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
}

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function write(root, relativePath, content = relativePath) {
  const absolutePath = path.join(root, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

function provisionRuntimeNodeModules(root) {
  write(
    root,
    "node_modules/typescript/bin/tsc",
    "#!/usr/bin/env node\n",
  );
}

const temporaryRoot = mkdtempSync(
  path.join(os.tmpdir(), "velmere-a94r1-source-boundary-"),
);
try {
  write(temporaryRoot, "A-root.txt");
  write(temporaryRoot, "a-root.txt");
  write(
    temporaryRoot,
    A94R1_IMMUTABLE_LOG_FIXTURE_PATH,
    "immutable parser fixture\n",
  );
  write(temporaryRoot, A94R1_MANIFEST_PATH, "{}\n");
  write(
    temporaryRoot,
    A94R1_PACKAGE_MANIFEST_PATH,
    "{}\n",
  );
  provisionRuntimeNodeModules(temporaryRoot);

  equal(
    compareA94R1Paths("A-root.txt", "a-root.txt"),
    -1,
    "raw comparator orders uppercase before lowercase",
  );
  equal(
    isA94R1SourceExcluded(
      A94R1_IMMUTABLE_LOG_FIXTURE_PATH,
    ),
    false,
    "the exact immutable A42 log fixture remains source",
  );
  equal(
    isA94R1SourceExcluded("fixtures/other/mutable.log"),
    true,
    "other log files remain excluded",
  );

  const sourceInventory =
    collectA94R1SourceRows(temporaryRoot);
  const sourcePaths = sourceInventory.rows.map((row) => row.path);
  check(
    sourcePaths.includes(A94R1_IMMUTABLE_LOG_FIXTURE_PATH),
    "source inventory contains the immutable A42 fixture",
  );
  check(
    sourcePaths.indexOf("A-root.txt") <
      sourcePaths.indexOf("a-root.txt"),
    "source inventory uses raw deterministic ordering",
  );
  equal(
    sourceInventory.rejected.length,
    0,
    "valid source fixture has no rejected entries",
  );

  const packagedInventory =
    collectA94R1PackagedTreeRows(temporaryRoot);
  const packagedPaths = packagedInventory.rows.map(
    (row) => row.path,
  );
  check(
    packagedPaths.includes(A94R1_MANIFEST_PATH),
    "physical tree fingerprint includes the descendant manifest",
  );
  check(
    packagedPaths.includes(A94R1_PACKAGE_MANIFEST_PATH),
    "physical tree fingerprint includes the package self-manifest",
  );
  check(
    packagedPaths.includes(A94R1_IMMUTABLE_LOG_FIXTURE_PATH),
    "physical tree fingerprint includes the immutable fixture",
  );
  equal(
    packagedInventory.requiredMissing.length,
    0,
    "all required physical package paths are present",
  );
  equal(
    packagedInventory.forbidden.length,
    0,
    "valid physical package tree has no forbidden outputs",
  );
  check(
    packagedPaths.every(
      (entry, index) =>
        index === 0 ||
        compareA94R1Paths(
          packagedPaths[index - 1],
          entry,
        ) < 0,
    ),
    "physical package rows are strictly raw ordered",
  );

  const realNodeModules =
    inspectA94R1RuntimeNodeModules(temporaryRoot);
  equal(
    realNodeModules.passed,
    true,
    "real node_modules directory with regular tsc is accepted",
  );

  write(temporaryRoot, "artifacts/forbidden.json", "{}\n");
  write(temporaryRoot, "fixtures/other/mutable.log", "mutable\n");
  const forbiddenInventory =
    collectA94R1PackagedTreeRows(temporaryRoot);
  check(
    forbiddenInventory.forbidden.some(
      (row) =>
        row.path === "artifacts" &&
        row.reason === "forbidden_output:artifacts",
    ),
    "generated artifacts directory is forbidden",
  );
  check(
    forbiddenInventory.forbidden.some(
      (row) =>
        row.path === "fixtures/other/mutable.log" &&
        row.reason === "mutable_log_forbidden",
    ),
    "a non-allowlisted mutable log is forbidden",
  );
  rmSync(path.join(temporaryRoot, "artifacts"), {
    recursive: true,
    force: true,
  });
  rmSync(path.join(temporaryRoot, "fixtures/other"), {
    recursive: true,
    force: true,
  });

  rmSync(path.join(temporaryRoot, "node_modules"), {
    recursive: true,
    force: true,
  });
  write(temporaryRoot, "node_modules", "not a directory\n");
  equal(
    inspectA94R1RuntimeNodeModules(temporaryRoot).reason,
    "node_modules_must_be_directory",
    "a file cannot stand in for node_modules",
  );
  rmSync(path.join(temporaryRoot, "node_modules"), {
    force: true,
  });
  mkdirSync(
    path.join(temporaryRoot, "runtime-modules-target"),
    { recursive: true },
  );
  symlinkSync(
    "runtime-modules-target",
    path.join(temporaryRoot, "node_modules"),
    "dir",
  );
  equal(
    inspectA94R1RuntimeNodeModules(temporaryRoot).reason,
    "node_modules_symlink_forbidden",
    "a node_modules symlink is rejected before dependency use",
  );

  console.log(
    JSON.stringify(
      {
        schemaVersion:
          "velmere.pass36.a94r1.source-clean-boundary-test.v1",
        status: "PASS_LOCAL_BEHAVIOR",
        assertions,
        immutableLogFixtures: [
          A94R1_IMMUTABLE_LOG_FIXTURE_PATH,
        ],
        physicalRequiredPaths: [
          A94R1_MANIFEST_PATH,
          A94R1_PACKAGE_MANIFEST_PATH,
          A94R1_IMMUTABLE_LOG_FIXTURE_PATH,
        ],
        truthBoundary:
          "This is a local temporary-filesystem boundary test. It does not grant exact-release, browser, staging, LIVE or sale credit.",
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
