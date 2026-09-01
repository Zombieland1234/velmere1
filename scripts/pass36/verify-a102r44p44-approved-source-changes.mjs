#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  REV,
  PARENT,
  MANIFEST,
  LEDGER,
  walk,
  compareUtf8,
} from "./r44p44-source-lib.mjs";

const args = process.argv.slice(2);
const parentIndex = args.indexOf("--parent-manifest");
if (parentIndex < 0 || !args[parentIndex + 1]) {
  throw new Error("parent_manifest_required");
}

const root = path.resolve(
  args[0] && args[0] !== "--parent-manifest" ? args[0] : process.cwd(),
);
const fail = (message, extra = {}) => {
  console.log(
    JSON.stringify(
      {
        status: "FAIL_R44P44_APPROVED_SOURCE_CHANGES",
        message,
        ...extra,
      },
      null,
      2,
    ),
  );
  process.exit(1);
};

const parent = JSON.parse(
  fs.readFileSync(path.resolve(args[parentIndex + 1]), "utf8"),
);
const ledger = JSON.parse(
  fs.readFileSync(path.join(root, ...LEDGER.split("/")), "utf8"),
);

if (
  parent.revisionId !== PARENT ||
  ledger.revisionId !== REV ||
  ledger.parentRevisionId !== PARENT
) {
  fail("IDENTITY");
}

const parentMap = new Map(parent.files.map((row) => [row.path, row]));
const currentRows = walk(root, new Set([MANIFEST, LEDGER]));
const currentMap = new Map(currentRows.map((row) => [row.path, row]));
const paths = [...new Set([...parentMap.keys(), ...currentMap.keys()])].sort(
  compareUtf8,
);

const actual = [];
for (const currentPath of paths) {
  const before = parentMap.get(currentPath);
  const after = currentMap.get(currentPath);
  if (
    before &&
    after &&
    before.byteLength === after.byteLength &&
    before.sha256 === after.sha256
  ) {
    continue;
  }
  actual.push({
    path: currentPath,
    changeType: !before ? "ADDED" : !after ? "DELETED" : "MODIFIED",
    parentByteLength: before?.byteLength ?? null,
    parentSha256: before?.sha256 ?? null,
    currentByteLength: after?.byteLength ?? null,
    currentSha256: after?.sha256 ?? null,
  });
}

const expected = ledger.approvedChanges.map((row) => ({
  path: row.path,
  changeType: row.changeType,
  parentByteLength: row.parentByteLength,
  parentSha256: row.parentSha256,
  currentByteLength: row.currentByteLength,
  currentSha256: row.currentSha256,
}));

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  fail("CHANGE_SET_MISMATCH", { actual, expected });
}

const allowedDeletedFontPaths = new Set([
  "public/fonts/velmere/cormorant-garamond-latin-ext-italic.woff2",
  "public/fonts/velmere/cormorant-garamond-latin-ext.woff2",
  "public/fonts/velmere/cormorant-garamond-latin-italic.woff2",
  "public/fonts/velmere/cormorant-garamond-latin.woff2",
  "public/fonts/velmere/jetbrains-mono-latin-ext.woff2",
  "public/fonts/velmere/jetbrains-mono-latin.woff2",
  "public/fonts/velmere/manrope-latin-ext.woff2",
  "public/fonts/velmere/manrope-latin.woff2",
  "public/fonts/velmere/manrope-pdf-latin-plus-ext.ttf",
]);
const deletedPaths = actual
  .filter((row) => row.changeType === "DELETED")
  .map((row) => row.path);
const unexpectedDeletions = deletedPaths.filter(
  (deletedPath) => !allowedDeletedFontPaths.has(deletedPath),
);
const missingRequiredFontDeletions = [...allowedDeletedFontPaths].filter(
  (fontPath) => !deletedPaths.includes(fontPath),
);

if (
  ledger.deletedFiles !== deletedPaths.length ||
  unexpectedDeletions.length > 0 ||
  missingRequiredFontDeletions.length > 0 ||
  ledger.testsRemoved !== 0 ||
  ledger.denominatorCollapse !== false ||
  ledger.globalDecision !== "NO_GO" ||
  ledger.LIVE !== false ||
  ledger.saleEnabled !== false ||
  ledger.productionApproved !== false ||
  ledger.worldClassProven !== false
) {
  fail("POLICY", {
    deletedPaths,
    unexpectedDeletions,
    missingRequiredFontDeletions,
  });
}

console.log(
  JSON.stringify(
    {
      status: "PASS_R44P44_APPROVED_SOURCE_CHANGES",
      changedPathCount: actual.length,
      added: ledger.addedFiles,
      modified: ledger.modifiedFiles,
      deleted: ledger.deletedFiles,
      deletedRawFontAssets: deletedPaths.length,
      testsRemoved: 0,
      denominatorCollapse: false,
    },
    null,
    2,
  ),
);
