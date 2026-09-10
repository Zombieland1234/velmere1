#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const MAX_PASSES = 8;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const COUNTER_FILE = path.join(__dirname, '.pass-counter.json');
const PROGRESS_FILE = path.resolve(__dirname, '..', 'state', 'velmere-progress.json');

const MANDATORY_AREAS = [
  'majorProductsValidated',
  'negativePathsValidated',
  'tierBoundariesValidated',
  'securityMatrixValidated',
  'databaseValidated',
  'paymentsValidated',
  'pdfValidated',
  'smartContractsValidated',
  'providerTruthValidated',
  'angelAdversarialValidated',
  'customer100Validated',
  'secondPassCompleted',
  'thirdHighRiskPassCompleted',
  'finalRegressionCompleted',
  'freshDiscoveryCompleted'
];

function getPassCount() {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
      return typeof data.count === 'number' ? data.count : 0;
    }
  } catch {
    // fallback w przypadku bledu
  }
  return 0;
}

function savePassCount(count) {
  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count, lastUpdated: new Date().toISOString() }, null, 2), 'utf8');
  } catch (err) {
    process.stderr.write('[stop-guard] Nie udalo sie zapisac licznika: ' + err.message + '\n');
  }
}

function verifyAreaEvidence(areaName, areaValue) {
  // Zakaz polegania na 'true' bez dowodow
  if (areaValue === true) {
    return { ok: false, reason: 'obszar \'' + areaName + '\' uzywa wylacznie deklaratywnego \'true\' bez wymaganego pliku dowodowego' };
  }
  if (!areaValue || areaValue === false) {
    return { ok: false, reason: 'obszar \'' + areaName + '\' jest niekompletny lub niezweryfikowany (stan: ' + JSON.stringify(areaValue) + ')' };
  }

  if (typeof areaValue !== 'object') {
    return { ok: false, reason: 'obszar \'' + areaName + '\' ma nieprawidlowy format (wymagany obiekt dowodowy)' };
  }

  if (areaValue.status !== 'verified') {
    return { ok: false, reason: 'obszar \'' + areaName + '\' status to \'' + areaValue.status + '\' (wymagane: \'verified\')' };
  }

  if (!Array.isArray(areaValue.evidence) || areaValue.evidence.length === 0) {
    return { ok: false, reason: 'obszar \'' + areaName + '\' nie zawiera listy plikow dowodowych' };
  }

  for (const relPath of areaValue.evidence) {
    if (typeof relPath !== 'string' || !relPath.trim()) {
      return { ok: false, reason: 'obszar \'' + areaName + '\' zawiera nieprawidlowa sciezke dowodu' };
    }
    const fullPath = path.resolve(PROJECT_ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
      return { ok: false, reason: 'brak pliku dowodowego na dysku dla \'' + areaName + '\': ' + relPath };
    }
    try {
      const stats = fs.statSync(fullPath);
      if (stats.size < 50) {
        return { ok: false, reason: 'plik dowodowy jest pusty lub trywialny (<50 bajtow) dla \'' + areaName + '\': ' + relPath };
      }
      if (relPath.endsWith('.json')) {
        JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      }
    } catch (parseErr) {
      return { ok: false, reason: 'plik dowodowy jest uszkodzony dla \'' + areaName + '\' (' + relPath + '): ' + parseErr.message };
    }
  }

  return { ok: true };
}

function verifyProgressLedger() {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return { ok: false, reason: 'brak pliku stanu .agents/state/velmere-progress.json na dysku' };
  }

  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch (err) {
    return { ok: false, reason: 'uszkodzony JSON w .agents/state/velmere-progress.json: ' + err.message };
  }

  const failures = [];

  for (const area of MANDATORY_AREAS) {
    const check = verifyAreaEvidence(area, ledger[area]);
    if (!check.ok) {
      failures.push(check.reason);
    }
  }

  if (ledger.internalBlockersRemaining === true) {
    failures.push('istnieja nierozwiazane blokery wewnetrzne (internalBlockersRemaining == true)');
  }

  if (failures.length > 0) {
    return { ok: false, reason: failures.join('; ') };
  }

  return { ok: true, ledger };
}

async function main() {
  let inputData = '';
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let payload = {};
  if (inputData.trim()) {
    try {
      payload = JSON.parse(inputData);
    } catch {
      process.stdout.write(JSON.stringify({
        decision: 'continue',
        reason: 'STOP REJECTED: Nieprawidlowy format wejscia JSON na stdin straznika.'
      }) + '\n');
      return;
    }
  }

  const terminationReason = payload.terminationReason || payload.reason || '';

  // 1. Zezwolenie na wyjscie w przypadku bledu srodowiska, anulowania lub limitu krokow
  const allowReasons = ['error', 'cancelled', 'max_steps_exceeded'];
  if (allowReasons.includes(terminationReason)) {
    process.stdout.write(JSON.stringify({ decision: 'allow' }) + '\n');
    return;
  }

  // 2. Bezpiecznik petli nieskonczonej (Anti-Infinite-Loop Safety Limit)
  const currentCount = getPassCount();
  if (currentCount >= MAX_PASSES) {
    process.stdout.write(JSON.stringify({
      decision: 'allow',
      reason: 'STOP GUARD SAFETY LIMIT REACHED: Osiagnieto limit bezpieczenstwa ' + MAX_PASSES + ' petli straznika. To jest bezpiecznik przed petla nieskonczona, A NIE deklaracja zakonczenia projektu. Dowody w repozytorium pozostaja wiazace.'
    }) + '\n');
    return;
  }

  // 3. Weryfikacja dowodowa stanu postepu (Evidence-Aware Verification)
  const progressCheck = verifyProgressLedger();
  if (!progressCheck.ok) {
    const nextCount = currentCount + 1;
    savePassCount(nextCount);
    process.stdout.write(JSON.stringify({
      decision: 'continue',
      reason: 'STOP REJECTED (Pass ' + nextCount + '/' + MAX_PASSES + '): Obowiazkowe dowody sa niekompletne lub nieweryfikowalne: ' + progressCheck.reason
    }) + '\n');
    return;
  }

  // 4. Jezeli model probuje zakonczyc (model_stop), a licznik < MAX_PASSES
  // wymuszamy dodatkowy pas weryfikacji regresyjnej / discovery
  if (terminationReason === 'model_stop' || !terminationReason) {
    const nextCount = currentCount + 1;
    savePassCount(nextCount);
    process.stdout.write(JSON.stringify({
      decision: 'continue',
      reason: 'STOP REJECTED (Pass ' + nextCount + '/' + MAX_PASSES + '): Dowody zweryfikowane, ale model musi przeprowadzic kolejny niezalezny pas audytu/regresji.'
    }) + '\n');
    return;
  }

  process.stdout.write(JSON.stringify({ decision: 'allow' }) + '\n');
}

main().catch(err => {
  process.stderr.write('[stop-guard] Krytyczny blad straznika: ' + err.message + '\n');
  process.stdout.write(JSON.stringify({ decision: 'allow' }) + '\n');
});
