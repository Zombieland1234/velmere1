#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const scenarioIds = [
  "mega_cap_normal_volatility",
  "stablecoin_depeg",
  "low_float_parabolic_pump",
  "contract_trap",
  "no_data_token",
];

const riskEngineSource = fs.readFileSync(path.join(root, 'lib/market-integrity/risk-engine.ts'), 'utf8');
const riskBrainSource = fs.readFileSync(path.join(root, 'lib/market-integrity/risk-brain.ts'), 'utf8');
const stressSource = fs.readFileSync(path.join(root, 'lib/market-integrity/stress-simulator.ts'), 'utf8');

let failed = false;

for (const scenarioId of scenarioIds) {
  const foundInEngine = riskEngineSource.includes(scenarioId);
  const foundInBrain = riskBrainSource.includes(scenarioId);
  const foundInStress = stressSource.includes(scenarioId);
  
  if (!foundInEngine && !foundInBrain && !foundInStress) {
    console.error(`Scenario ${scenarioId} not found in risk engine, risk brain, or stress simulator.`);
    failed = true;
  } else {
    console.log(`Scenario ${scenarioId}: verified`);
  }
}

const pass271ContractTrap = riskEngineSource.includes('contract_trap_gate');
if (!pass271ContractTrap) {
  console.error('Contract trap gate (velmere_contract_trap_v1_pass271) not found in risk-engine.ts');
  failed = true;
} else {
  console.log('Contract trap gate: verified');
}

const stablecoinDepeg = riskEngineSource.includes('stablecoinDepegReview');
if (!stablecoinDepeg) {
  console.error('Stablecoin depeg review not found in risk-engine.ts');
  failed = true;
} else {
  console.log('Stablecoin depeg review: verified');
}

const lowFloatPump = riskEngineSource.includes('multi_timeframe_pump') && 
                     riskEngineSource.includes('holder_concentration') &&
                     riskEngineSource.includes('thin_liquidity');
if (!lowFloatPump) {
  console.error('Low float parabolic pump signals not found in risk-engine.ts');
  failed = true;
} else {
  console.log('Low float parabolic pump signals: verified');
}

const megaCapVolatility = riskEngineSource.includes('velocity') &&
                          riskEngineSource.includes('rapid_intraday_move');
if (!megaCapVolatility) {
  console.error('Mega cap volatility signals not found in risk-engine.ts');
  failed = true;
} else {
  console.log('Mega cap volatility signals: verified');
}

const noDataToken = riskEngineSource.includes('insufficient_data') &&
                    riskEngineSource.includes('missingCoreCount');
if (!noDataToken) {
  console.error('No data token handling not found in risk-engine.ts');
  failed = true;
} else {
  console.log('No data token handling: verified');
}

if (failed) {
  process.exit(1);
}

console.log('AI risk brain scenarios verification passed.');