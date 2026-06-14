import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const checks = [
  ["lib/market-integrity/pass464-fundamental-quality.ts", [
    "PASS464_FUNDAMENTAL_QUALITY",
    "buildPass464EquityQuality",
    "buildPass464FundQuality",
    "buildPass464EtfAnalytics",
    "Financial statements require a source.",
    "Missing statement fields remain source-required",
  ]],
  ["lib/market-integrity/pass459-alpha-vantage-provider.ts", [
    "INCOME_STATEMENT",
    "BALANCE_SHEET",
    "CASH_FLOW",
    "SEC_USER_AGENT",
    "PASS464 fundamental quality gate",
    "PASS464 holdings concentration",
  ]],
  ["lib/market-integrity/pass458-provider-truth-router.ts", [
    "fundamentalCap",
    "PASS464 fundamental quality cap",
  ]],
  ["app/api/market-integrity/real-markets/route.ts", [
    "fundamentalQuality:",
  ]],
  ["app/api/market-integrity/cross-asset/route.ts", [
  ]],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
    "data-pass464-fundamental-quality-ready",
    "data-pass464-fundamental-quality",
    "fundamentalQualityGate",
    "Fundamental quality",
  ]],
  ["lib/search/intelligence-search-contract.ts", [
    "fundamentalQualityScore",
    "fundamentalConfidenceCap",
    "fundamentalFreeCashFlowTtm",
    "etfTop10Concentration",
    "etfOverlapPercent",
  ]],
  ["lib/market-integrity/pass459-provider-truth-pdf-runtime.ts", [
    "PASS464 statement/holdings gate",
    "PASS464 carries filing freshness",
    "fundamentalState",
  ]],
  ["lib/market-integrity/pass460-provider-consensus-pdf-runtime.ts", [
    "fundamentalEvidenceCap",
    "PASS464 filing/statement/holdings quality",
  ]],
  ["app/api/search/lens-report/route.ts", [
    "PASS464: filing freshness, FCF/leverage and ETF concentration",
  ]],
];

let failed = false;
for (const [relative, markers] of checks) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    console.error(`missing ${relative}`);
    failed = true;
    continue;
  }
  const source = fs.readFileSync(full, "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) {
      console.error(`missing marker ${JSON.stringify(marker)} in ${relative}`);
      failed = true;
    }
  }
}

const runtime = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import { buildPass464EquityQuality, buildPass464FundQuality } from './lib/market-integrity/pass464-fundamental-quality.ts';
    const q = (date, values = {}) => ({ fiscalDateEnding: date, reportedCurrency: 'USD', ...values });
    const equity = buildPass464EquityQuality({
      overview: { LatestQuarter: '2026-03-31', EBITDA: '100' },
      incomeStatement: { quarterlyReports: [
        q('2026-03-31', { totalRevenue: '100', netIncome: '10', operatingIncome: '20' }),
        q('2025-12-31', { totalRevenue: '100', netIncome: '10', operatingIncome: '20' }),
        q('2025-09-30', { totalRevenue: '100', netIncome: '10', operatingIncome: '20' }),
        q('2025-06-30', { totalRevenue: '100', netIncome: '10', operatingIncome: '20' }),
      ]},
      balanceSheet: { quarterlyReports: [q('2026-03-31', {
        cashAndShortTermInvestments: '50', shortTermDebt: '20', longTermDebt: '30',
        totalAssets: '500', totalLiabilities: '250', totalShareholderEquity: '250',
        totalCurrentAssets: '150', totalCurrentLiabilities: '100'
      })]},
      cashFlow: { quarterlyReports: [
        q('2026-03-31', { operatingCashflow: '30', capitalExpenditures: '5' }),
        q('2025-12-31', { operatingCashflow: '30', capitalExpenditures: '5' }),
        q('2025-09-30', { operatingCashflow: '30', capitalExpenditures: '5' }),
        q('2025-06-30', { operatingCashflow: '30', capitalExpenditures: '5' }),
      ]},
      secFiling: { filingDate: '2026-05-01', form: '10-Q' },
      now: Date.parse('2026-06-07T00:00:00Z'),
    });
    if (equity.freeCashFlowTtm !== 100 || equity.totalDebt !== 50 || equity.currentRatio !== 1.5) throw new Error('equity math regression');

    const partial = buildPass464EquityQuality({
      overview: { LatestQuarter: '2026-03-31', EBITDA: '100' },
      incomeStatement: { quarterlyReports: [q('2026-03-31', { totalRevenue: '100' }), q('2025-12-31', { totalRevenue: '100' }), q('2025-09-30', { totalRevenue: '100' })] },
      balanceSheet: { quarterlyReports: [q('2026-03-31', { shortTermDebt: '20' })] },
      cashFlow: { quarterlyReports: [] },
      now: Date.parse('2026-06-07T00:00:00Z'),
    });
    if (partial.revenueTtm !== null || partial.totalDebt !== null || partial.freeCashFlowTtm !== null) throw new Error('missing data converted to synthetic value');

    const fund = buildPass464FundQuality({
      holdings: [
        { symbol: 'AAA', description: 'AAA', weight: 30 },
        { symbol: 'BBB', description: 'BBB', weight: 20 },
        { symbol: 'CCC', description: 'CCC', weight: 10 },
      ],
      sectors: [
        { sector: 'Tech', weight: 40 },
        { sector: 'Finance', weight: 20 },
        { sector: 'Health', weight: 15 },
      ],
      benchmarkSymbol: 'SPY',
      benchmarkHoldings: [
        { symbol: 'AAA', description: 'AAA', weight: 15 },
        { symbol: 'BBB', description: 'BBB', weight: 5 },
      ],
    });
    if (fund.etf.concentrationTop3 !== 60 || fund.etf.overlapPercent !== 20 || fund.etf.overlapState !== 'source_bound') throw new Error('ETF analytics regression');
    console.log('PASS464 runtime semantics ok');
  `],
  { cwd: root, encoding: "utf8" },
);
if (runtime.status !== 0) {
  console.error(runtime.stdout);
  console.error(runtime.stderr);
  failed = true;
} else {
  process.stdout.write(runtime.stdout);
}

if (failed) process.exit(1);
console.log(`PASS464 fundamental quality verified · ${checks.length} files + runtime semantics`);
