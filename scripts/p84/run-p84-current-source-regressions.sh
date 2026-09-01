#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
LOG_DIR="artifacts/p84/logs"
mkdir -p "$LOG_DIR" receipts/p84
BACKUP="$(mktemp -d)"
HISTORY_PATHS=(
  "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME.json"
  "artifacts/p82/P82_LOCAL_READONLY_QUORUM_HARDENING_FIXTURE_RECEIPT.json"
  "receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_RUNTIME.json"
  "receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_STATIC.json"
  "artifacts/p80/P80_AUDIT_LOCAL_FIXTURE_NOT_CUSTOMER_FINAL.pdf"
  "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json"
  "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_STATIC.json"
  "receipts/p79/P79_HISTORICAL_DEPLOYMENT_CUSTOMER_PATH_RUNTIME.json"
  "receipts/p79/P79_CUSTOMER_PATH_STATIC.json"
  "receipts/p78/P78_PRIVATE_PROVIDER_EVIDENCE_RUNTIME.json"
  "receipts/p78/P78_STANDARD_JSON_CUSTOMER_PATH_RUNTIME.json"
  "receipts/p78/P78_THIRDWEB_DEVELOPMENT_MICRO_CORPUS_RUNTIME.json"
  "receipts/p78/P78_REAL_AUDIT_DATAFLOW_STATIC.json"
  "receipts/p78/P78R3_CUSTOMER_PATH_STATIC.json"
  "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json"
)
restore_history() {
  for rel in "${HISTORY_PATHS[@]}"; do
    if [[ -f "$BACKUP/$rel" ]]; then
      mkdir -p "$(dirname "$rel")"
      cp -p "$BACKUP/$rel" "$rel"
    fi
  done
  rm -rf "$BACKUP"
}
trap restore_history EXIT
for rel in "${HISTORY_PATHS[@]}"; do
  if [[ -f "$rel" ]]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp -p "$rel" "$BACKUP/$rel"
  fi
done
run() {
  local name="$1"; shift
  echo "RUN $name"
  "$@" >"$LOG_DIR/$name.log" 2>&1
}
LOADER=(node --import ./scripts/pass11/register-offline-ts-loader.mjs)
run P84_OWNER_READ_REPEATABILITY python3 scripts/p84/verify-p84-runtime-repeatability.py
run P84_OWNER_READ_STATIC python3 scripts/p84/test-p84-audit-customer-artifact-owner-read-static.py
run P84_P83_ATOMIC_COMPATIBILITY python3 scripts/p84/verify-p84-p83-atomic-publication-compatibility.py
run P84_CHANGED_MODULE_IMPORTS "${LOADER[@]}" scripts/p84/test-p84-changed-module-imports.mjs
run P84_TARGETED_TYPESCRIPT tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --skipLibCheck --strict --noResolve scripts/p84/p84-targeted-types.d.ts lib/reporting/audit-exact-artifact-owner-readable-publisher.ts
run P82_SUCCESSFUL_QUORUM_INTEGRITY_RUNTIME "${LOADER[@]}" scripts/p82/test-p82-successful-quorum-integrity-runtime.mjs
run P82_SUCCESSFUL_QUORUM_INTEGRITY_STATIC python3 scripts/p82/test-p82-successful-quorum-integrity-static.py
run P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME "${LOADER[@]}" scripts/p80/test-p80-audit-exact-immutable-artifact-runtime.mjs
run P84_P80_IMMUTABLE_ARTIFACT_COMPATIBILITY python3 scripts/p84/verify-p84-p80-immutable-artifact-compatibility.py
run P79_HISTORICAL_DEPLOYMENT_CUSTOMER_PATH_RUNTIME "${LOADER[@]}" scripts/p79/test-p79-historical-deployment-customer-path-runtime.mjs
run P79_CUSTOMER_PATH_STATIC python3 scripts/p79/test-p79-customer-path-static.py
run P78_PRIVATE_PROVIDER_EVIDENCE_RUNTIME "${LOADER[@]}" scripts/p78/test-p78-private-provider-evidence-runtime.mjs
run P78_STANDARD_JSON_CUSTOMER_PATH_RUNTIME "${LOADER[@]}" scripts/p78/test-p78-standard-json-customer-path-runtime.mjs
run P78_THIRDWEB_DEVELOPMENT_MICRO_CORPUS_RUNTIME "${LOADER[@]}" scripts/p78/test-p78-thirdweb-micro-corpus-runtime.mjs
run P78_REAL_AUDIT_DATAFLOW_STATIC python3 scripts/p78/test-p78-static.py
run P78R3_CUSTOMER_PATH_STATIC python3 scripts/p78/test-p78r3-customer-path-static.py
run P75_ADVANCED_AUTOMATION_CURRENT_REGRESSION "${LOADER[@]}" scripts/p75/test-p75-advanced-automation-runtime.mjs
run P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC python3 scripts/p81/test-p77-deterministic-delivery-current-static.py --source-root "$ROOT" --receipt "$ROOT/receipts/p84/P84_P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC_REGRESSION.json"
run EXACT_PDF_UNIT "${LOADER[@]}" --test tests/security/a102-exact-customer-pdf-delivery.test.ts
run EXACT_PDF_INTEGRATION "${LOADER[@]}" --test tests/security/a102-p36-exact-customer-pdf-integration.test.ts
run P84_REGRESSION_SUMMARY python3 scripts/p84/build-p84-regression-summary.py
printf 'P84 current-source regression stack: PASS\n'
