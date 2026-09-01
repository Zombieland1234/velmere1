#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const reportsDir = 'reports';
fs.mkdirSync(reportsDir, { recursive: true });
const validation = readJson(path.join(reportsDir, 'PASS2146_RUNTIME_RECEIPT_VALIDATION.json'));
const promotionBoard = readJson(path.join(reportsDir, 'PASS2134_PROMOTION_BOARD.json')) || {};
const ownerCommandBoard = readJson(path.join(reportsDir, 'PASS2144_OWNER_COMMAND_BOARD.json')) || {};
const allRuntimeReceiptsValid = validation?.status === 'VALIDATION_PASS_ALL_REQUIRED_RUNTIME_RECEIPTS';
const oldBoardLocked = promotionBoard.status === 'LOCKED_BELOW_90' || promotionBoard.honestOverallCeiling < 90;
const result = {
  pass: 'PASS2147',
  name: 'Promotion unlock evaluator',
  status: allRuntimeReceiptsValid ? 'PROMOTION_UNLOCKED_ABOVE_90_READY_FOR_OWNER_REVIEW' : 'PROMOTION_LOCKED_BELOW_90_RUNTIME_RECEIPTS_MISSING',
  honestOverallCeiling: allRuntimeReceiptsValid ? 91.0 : 89.995,
  canPromoteAbove90: allRuntimeReceiptsValid,
  lockedReasons: allRuntimeReceiptsValid ? [] : (validation?.missing || ['runtime_receipt_validation_missing']),
  previousPromotionBoardStatus: promotionBoard.status || 'unknown',
  previousBoardWasLocked: oldBoardLocked,
  ownerCommandBoardStatus: ownerCommandBoard.status || 'unknown',
  noFakePromotionRule: 'Do not exceed 90% unless all required runtime receipts are accepted and validated.',
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(reportsDir, 'PASS2147_PROMOTION_UNLOCK_EVALUATOR.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, ceiling: result.honestOverallCeiling, lockedReasons: result.lockedReasons }, null, 2));
