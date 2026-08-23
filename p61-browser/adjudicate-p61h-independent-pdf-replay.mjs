#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
function arg(name) {
  const index = argv.indexOf(name);
  if (index < 0 || index + 1 >= argv.length) throw new Error(`missing_argument:${name}`);
  return argv[index + 1];
}

const prerequisiteBindingPath = resolve(arg('--prerequisite-binding'));
const prerequisiteRoot = resolve(arg('--prerequisite-root'));
const replayReceiptPath = resolve(arg('--replay-receipt'));
const replayRoot = resolve(arg('--replay-root'));
const sourceEngineeringReceiptPath = resolve(arg('--source-engineering-receipt'));
const nodeModulesRoot = resolve(arg('--node-modules-root'));
const outputPath = resolve(arg('--output'));
const currentRunId = String(process.env.GITHUB_RUN_ID || '').trim();
const currentRunAttempt = String(process.env.GITHUB_RUN_ATTEMPT || '').trim();
const currentSha = String(process.env.GITHUB_SHA || '').trim();

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}
function canonicalJson(value, seen = new WeakSet()) {
  if (typeof value === 'undefined') return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (seen.has(value)) throw new Error('canonical_json_cycle');
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, seen)).join(',')}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], seen)}`).join(',')}}`;
  } finally {
    seen.delete(value);
  }
}
function stableSha(value) {
  return sha256Bytes(Buffer.from(canonicalJson(value), 'utf8'));
}
function toPosix(value) {
  return value.split(sep).join('/');
}
function collectPdfEvidence(value, rows = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectPdfEvidence(item, rows);
    return rows;
  }
  if (value && typeof value === 'object') {
    if (typeof value.path === 'string' && value.path.toLowerCase().endsWith('.pdf')) rows.push(value);
    for (const item of Object.values(value)) collectPdfEvidence(item, rows);
  }
  return rows;
}
function walkPdfs(root) {
  const rows = [];
  const visit = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) rows.push(absolute);
    }
  };
  visit(root);
  return rows.sort();
}
function resolveEvidencePath(root, relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');
  const direct = resolve(root, ...normalized.split('/'));
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  const browserDirect = resolve(root, 'browser', ...normalized.split('/'));
  if (existsSync(browserDirect) && statSync(browserDirect).isFile()) return browserDirect;
  const suffix = normalized.toLowerCase();
  const matches = walkPdfs(root).filter((path) => toPosix(path).toLowerCase().endsWith(suffix));
  return matches.length === 1 ? matches[0] : null;
}
function scorePdf(pathText) {
  const lower = pathText.toLowerCase();
  let score = 0;
  if (lower.includes('basic')) score += 20;
  if (lower.includes('en')) score += 10;
  if (lower.includes('blob')) score += 8;
  if (lower.includes('browser-response') || lower.includes('captured')) score += 6;
  if (lower.includes('primary')) score += 4;
  return score;
}
function selectPdfEvidence(receipt, root) {
  const evidence = [];
  for (const item of collectPdfEvidence(receipt.rows ?? receipt)) {
    const absolute = resolveEvidencePath(root, item.path);
    if (!absolute) continue;
    const bytes = readFileSync(absolute);
    const identity = { path: item.path, absolute, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
    if (typeof item.byteLength === 'number' && item.byteLength !== identity.byteLength) {
      throw new Error(`pdf_receipt_byte_length_mismatch:${item.path}`);
    }
    if (typeof item.sha256 === 'string' && item.sha256 !== identity.sha256) {
      throw new Error(`pdf_receipt_sha256_mismatch:${item.path}`);
    }
    evidence.push({ ...identity, score: scorePdf(item.path) });
  }
  if (evidence.length === 0) {
    for (const absolute of walkPdfs(root)) {
      const bytes = readFileSync(absolute);
      const rel = toPosix(relative(root, absolute));
      evidence.push({ path: rel, absolute, byteLength: bytes.length, sha256: sha256Bytes(bytes), score: scorePdf(rel) });
    }
  }
  evidence.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  if (evidence.length === 0) throw new Error('replay_pdf_evidence_missing');
  return { selected: evidence[0], all: evidence };
}
async function validatePdf(filePath, PDFDocument) {
  const bytes = readFileSync(filePath);
  const latin = bytes.toString('latin1');
  const startsWithPdf = bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  const eofPresent = latin.slice(-2048).includes('%%EOF');
  const fontFile2 = /\/FontFile2\b/.test(latin);
  const fontFile3 = /\/FontFile3\b/.test(latin);
  const toUnicode = /\/ToUnicode\b/.test(latin);
  const encrypted = /\/Encrypt\b/.test(latin);
  const activePatterns = [
    /\/JavaScript\b/,
    /\/JS\b/,
    /\/OpenAction\b/,
    /\/AA\b/,
    /\/Launch\b/,
    /\/EmbeddedFile\b/,
    /\/RichMedia\b/,
  ];
  const activeContentMatches = activePatterns.filter((pattern) => pattern.test(latin)).map((pattern) => pattern.source);
  const document = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: false });
  const pages = document.getPages().map((page, index) => {
    const { width, height } = page.getSize();
    const portraitA4 = Math.abs(width - 595.28) <= 1 && Math.abs(height - 841.89) <= 1;
    const landscapeA4 = Math.abs(width - 841.89) <= 1 && Math.abs(height - 595.28) <= 1;
    return { index: index + 1, width, height, a4: portraitA4 || landscapeA4 };
  });
  const result = {
    path: filePath,
    byteLength: bytes.length,
    sha256: sha256Bytes(bytes),
    startsWithPdf,
    eofPresent,
    pageCount: pages.length,
    pages,
    allPagesA4: pages.length > 0 && pages.every((page) => page.a4),
    embeddedFontProgram: fontFile2 || fontFile3,
    fontFile2,
    fontFile3,
    toUnicode,
    encrypted,
    activeContentMatches,
    metadata: {
      title: document.getTitle() ?? null,
      author: document.getAuthor() ?? null,
      subject: document.getSubject() ?? null,
      creator: document.getCreator() ?? null,
      producer: document.getProducer() ?? null,
      creationDate: document.getCreationDate()?.toISOString() ?? null,
      modificationDate: document.getModificationDate()?.toISOString() ?? null,
    },
  };
  result.pass = (
    result.byteLength > 1000
    && result.startsWithPdf
    && result.eofPresent
    && result.pageCount > 0
    && result.allPagesA4
    && result.embeddedFontProgram
    && result.toUnicode
    && !result.encrypted
    && result.activeContentMatches.length === 0
  );
  return result;
}

const receipt = {
  schemaVersion: 'velmere.p61h.cross-run-independent-pdf-replay.v1',
  status: 'IN_PROGRESS',
  decision: 'IN_PROGRESS',
  currentExecution: {
    runId: currentRunId || null,
    runAttempt: currentRunAttempt || null,
    githubSha: currentSha || null,
  },
  hardGates: {
    prerequisiteBrowserThreeOfThree: false,
    separateWorkflowRun: false,
    currentSourceEngineeringPass: false,
    replayBrowserThreeOfThree: false,
    replayBasicPreviewAndBlob: false,
    replayInternalPdfParity: false,
    referencePdfStructuralValidation: false,
    replayPdfStructuralValidation: false,
    crossRunByteIdentity: false,
  },
  truthBoundary: 'PASS proves one separate-workflow replay of the Browser-generated Basic PDF on the same exact P60 projection plus the controlled P61G renderer hash transition, including byte identity, A4 geometry, embedded font program, ToUnicode and no detected active-content markers. The lane remains fixture-only and grants no live data, production rate-limit, external legal opinion, customer value, sale, GO, LIVE or WORLD_CLASS credit.',
};

try {
  for (const required of [prerequisiteBindingPath, replayReceiptPath, sourceEngineeringReceiptPath]) {
    if (!existsSync(required)) throw new Error(`required_receipt_missing:${required}`);
  }
  const prerequisite = JSON.parse(readFileSync(prerequisiteBindingPath, 'utf8'));
  const replayReceipt = JSON.parse(readFileSync(replayReceiptPath, 'utf8'));
  const sourceEngineering = JSON.parse(readFileSync(sourceEngineeringReceiptPath, 'utf8'));

  receipt.prerequisite = {
    receiptPath: prerequisiteBindingPath,
    receiptSha256: sha256File(prerequisiteBindingPath),
    runId: String(prerequisite?.run?.id ?? ''),
    runHeadSha: prerequisite?.run?.headSha ?? null,
    browserDecision: prerequisite?.browserReceipt?.decision ?? null,
    referencePdf: prerequisite?.referencePdf ?? null,
  };
  receipt.hardGates.prerequisiteBrowserThreeOfThree = (
    prerequisite.status === 'PASS'
    && prerequisite?.browserReceipt?.distinctTierSpecificPhysicalExecutions === 3
    && prerequisite?.browserReceipt?.exactBasicPreviewAndBlob === true
  );
  receipt.hardGates.separateWorkflowRun = Boolean(
    currentRunId
    && receipt.prerequisite.runId
    && currentRunId !== receipt.prerequisite.runId
  );
  receipt.hardGates.currentSourceEngineeringPass = (
    sourceEngineering.status === 'PASS'
    && sourceEngineering.decision === 'PASS_P61G_OFFICIAL_MANROPE_RENDERER_ONLY_NATIVE_WINDOWS_SEMANTIC_LINT_DUAL_BUILD'
  );
  receipt.hardGates.replayBrowserThreeOfThree = (
    replayReceipt.status === 'PASS'
    && replayReceipt?.summary?.distinctTierSpecificPhysicalExecutions === 3
  );
  receipt.hardGates.replayBasicPreviewAndBlob = replayReceipt?.summary?.exactBasicPreviewAndBlob === true;

  const referenceRelative = prerequisite?.referencePdf?.path;
  if (typeof referenceRelative !== 'string') throw new Error('prerequisite_reference_path_missing');
  const referencePath = resolve(prerequisiteRoot, ...referenceRelative.split('/'));
  if (!existsSync(referencePath)) throw new Error(`reference_pdf_missing:${referencePath}`);
  const referenceBytes = readFileSync(referencePath);
  if (
    referenceBytes.length !== prerequisite.referencePdf.byteLength
    || sha256Bytes(referenceBytes) !== prerequisite.referencePdf.sha256
  ) {
    throw new Error('reference_pdf_binding_mismatch');
  }

  const replayEvidence = selectPdfEvidence(replayReceipt, replayRoot);
  const selectedReplay = replayEvidence.selected;
  const basicRelevant = replayEvidence.all.filter((row) => row.score >= 30);
  const internalHashes = [...new Set(basicRelevant.map((row) => row.sha256))];
  receipt.replayEvidence = {
    selected: {
      path: selectedReplay.path,
      byteLength: selectedReplay.byteLength,
      sha256: selectedReplay.sha256,
    },
    basicRelevant: basicRelevant.map((row) => ({ path: row.path, byteLength: row.byteLength, sha256: row.sha256 })),
    distinctBasicHashes: internalHashes,
  };
  receipt.hardGates.replayInternalPdfParity = basicRelevant.length >= 2 && internalHashes.length === 1;

  const requireFromProjection = createRequire(pathToFileURL(join(nodeModulesRoot, 'package.json')).href);
  const { PDFDocument } = requireFromProjection('pdf-lib');
  receipt.referencePdfValidation = await validatePdf(referencePath, PDFDocument);
  receipt.replayPdfValidation = await validatePdf(selectedReplay.absolute, PDFDocument);
  receipt.hardGates.referencePdfStructuralValidation = receipt.referencePdfValidation.pass;
  receipt.hardGates.replayPdfStructuralValidation = receipt.replayPdfValidation.pass;
  receipt.hardGates.crossRunByteIdentity = (
    referenceBytes.length === selectedReplay.byteLength
    && sha256Bytes(referenceBytes) === selectedReplay.sha256
    && referenceBytes.equals(readFileSync(selectedReplay.absolute))
  );

  const failed = Object.entries(receipt.hardGates).filter(([, value]) => value !== true).map(([name]) => name);
  receipt.failedHardGates = failed;
  if (failed.length > 0) throw new Error(`p61h_hard_gates_failed:${failed.join(',')}`);

  receipt.status = 'PASS';
  receipt.decision = 'PASS_P61H_INDEPENDENT_PDF_REPLAY_ONE_OF_ONE_CROSS_RUN_BYTE_IDENTICAL';
  receipt.summary = {
    browserThreeSkuPrerequisite: '3/3 PASS',
    independentPdfReplay: '1/1 PASS',
    crossRunByteIdentical: true,
    customerOutputCredit: 'WITHHELD_FIXTURE_ONLY',
    saleEligible: '0/17',
    globalDecision: 'NO_GO',
  };
} catch (error) {
  receipt.status = 'FAIL';
  receipt.decision = 'FAIL_CLOSED_P61H_INDEPENDENT_PDF_REPLAY';
  receipt.error = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`;
  receipt.failedHardGates = Object.entries(receipt.hardGates).filter(([, value]) => value !== true).map(([name]) => name);
}

const core = structuredClone(receipt);
delete core.integritySha256;
receipt.integritySha256 = stableSha(core);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(receipt, null, 2));
process.exit(receipt.status === 'PASS' ? 0 : 1);
