import { existsSync, readFileSync } from 'node:fs';

const checks = [];
const add = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const read = (file) => readFileSync(file, 'utf8');

const pkg = JSON.parse(read('package.json'));
const helperPath = 'lib/market-integrity/pass1234-lens-shieldmap-evidence-parity.ts';
const reportPath = 'lib/search/lens-report.ts';
const routePath = 'app/api/search/lens-report/route.ts';
const browserPath = 'components/search/VelmereIntelligenceSearchClient.tsx';
const mapPath = 'components/market-integrity/ShieldMapClient.tsx';
const docPath = 'docs/progress/PASS1234_1253_LENS_SHIELDMAP_PARITY.md';

const helper = existsSync(helperPath) ? read(helperPath) : '';
const report = read(reportPath);
const route = read(routePath);
const browser = read(browserPath);
const map = read(mapPath);
const doc = existsSync(docPath) ? read(docPath) : '';

add('PASS1234 helper exists', existsSync(helperPath));
add('Helper declares shared Lens/ShieldMap parity version', helper.includes('pass1234-lens-shieldmap-evidence-parity') && helper.includes('lens_pdf_and_shield_map_share_one_evidence_story'));
add('Helper locks Browser role and Shield Map role', helper.includes('pdf_reader_not_second_shield') && helper.includes('evidence_graph_not_price_table'));
add('Helper exposes canonical seven evidence nodes', ['sources', 'facts', 'signals', 'conflicts', 'missing', 'confidence', 'verdict'].every((id) => helper.includes(`id: "${id}"`)));
add('LensReport type includes pass1234 manifest', report.includes('pass1234: Pass1234LensShieldMapEvidenceParity') && report.includes('const pass1234 = buildPass1234LensShieldMapEvidenceParity'));
add('LensReport validator requires pass1234 parity contract', report.includes('Boolean(report.pass1234)') && report.includes('same_report_manifest_same_depth_same_checksum'));
add('PDF route writes pass1234 content marker and headers', route.includes('Lens/Map parity') && route.includes('x-velmere-lens-shieldmap-parity') && route.includes('x-velmere-shield-map-role'));
add('Browser reader shows visible pass1234 parity strip', browser.includes('data-pass1234-reader-map-parity="visible"') && browser.includes('pdfPreview.report.pass1234.copy.stripTitle'));
add('Browser article carries pass1234 manifest attributes', browser.includes('data-pass1234-lens-shieldmap-parity') && browser.includes('data-pass1234-evidence-manifest'));
add('Shield Map imports and builds pass1234 graph', map.includes('buildPass1234LensShieldMapEvidenceParity') && map.includes('const pass1234EvidenceGraph = useMemo'));
add('Shield Map exposes pass1234 role and manifest attributes', map.includes('data-pass1234-shieldmap-role={pass1234EvidenceGraph.shieldMapRole}') && map.includes('data-pass1234-evidence-manifest={pass1234EvidenceGraph.manifestKey}'));
add('Shield Map legend uses canonical pass1234 nodes instead of hard-coded English list', map.includes('pass1234EvidenceGraph.nodes.map((item)') && !map.includes('["Sources", "Facts", "Signals", "Conflicts", "Missing Data", "Confidence", "VLM Verdict"].map'));
add('Progress document exists and keeps full build honest', existsSync(docPath) && doc.includes('Full install/typecheck/lint/build/browser click | NOT PROVEN HERE'));
add('Package wires this verifier script', pkg.scripts?.['verify:pass1234-1253-lens-shieldmap-parity'] === 'node scripts/verify-pass1234-1253-lens-shieldmap-parity.mjs');

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}`);
if (failed.length) {
  console.error(`\nPASS1234-1253 Lens/ShieldMap parity verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1234-1253 Lens/ShieldMap parity verifier passed: ${checks.length}/${checks.length}`);
