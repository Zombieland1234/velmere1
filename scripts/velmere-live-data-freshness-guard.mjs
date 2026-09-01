#!/usr/bin/env node
import fs from 'node:fs';

const policy = {
  schema: 'velmere.live_data_freshness_policy.v1',
  generatedBy: 'PASS2158',
  sourceClasses: [
    { id: 'market_price', maxAgeSeconds: 90, customerLabelIfStale: 'Data delayed', operatorSeverity: 'P1' },
    { id: 'market_cap_volume', maxAgeSeconds: 300, customerLabelIfStale: 'Market data may be delayed', operatorSeverity: 'P1' },
    { id: 'exchange_status', maxAgeSeconds: 900, customerLabelIfStale: 'Exchange status requires fresh verification', operatorSeverity: 'P1' },
    { id: 'contract_metadata', maxAgeSeconds: 3600, customerLabelIfStale: 'Contract data requires refresh', operatorSeverity: 'P1' },
    { id: 'legal_copy', maxAgeSeconds: 2592000, customerLabelIfStale: 'Policy version review needed', operatorSeverity: 'P2' },
    { id: 'ai_report_sources', maxAgeSeconds: 86400, customerLabelIfStale: 'Sources may be outdated', operatorSeverity: 'P1' },
  ],
  hardRules: [
    'Never present stale market/provider data as live.',
    'Every AI report must include source age/confidence/missing-data notes.',
    'If source quorum fails, downgrade tone and show needs-review state.',
    'Customer copy stays simple; operator logs keep technical details.',
  ],
};
fs.mkdirSync('config', { recursive: true });
fs.writeFileSync('config/velmere-live-data-freshness.policy.json', JSON.stringify(policy, null, 2));

const candidateFiles = [
  'lib/ai/vlm-provider-registry.ts',
  'lib/source-freshness.ts',
  'lib/market-data.ts',
  'components/market-integrity/MarketIntegrityClient.tsx',
  'app/api/search/lens-report/route.ts',
].filter((file) => fs.existsSync(file));
const report = {
  pass: 'PASS2158',
  name: 'Live data freshness guard',
  status: 'STATIC_POLICY_READY_RUNTIME_SOURCE_RECEIPTS_REQUIRED',
  policyFile: 'config/velmere-live-data-freshness.policy.json',
  sourceClasses: policy.sourceClasses,
  candidateFiles,
  blockers: ['Needs live provider receipts and hosted smoke to prove freshness behavior in production.'],
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2158_LIVE_DATA_FRESHNESS_GUARD.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, sourceClasses: policy.sourceClasses.length }, null, 2));
