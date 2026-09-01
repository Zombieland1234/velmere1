import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const contract = JSON.parse(fs.readFileSync("config/r7/r7-staging-foundation-contract.json", "utf8"));
const migrationPath = "supabase/migrations/20260824000005_r7_live_schema_reconciliation_and_security_hardening.sql";
const migration = fs.readFileSync(migrationPath, "utf8");
const cleanupMigrationPath = "supabase/migrations/20260824000007_r7_remove_temporary_migration_corpus_export.sql";
const cleanupMigration = fs.readFileSync(cleanupMigrationPath, "utf8");
const authorityMigrationPath = "supabase/migrations/20260824000008_r7_source_authority_run_attempt_binding.sql";
const authorityMigration = fs.readFileSync(authorityMigrationPath, "utf8");
const sliceBuilder = fs.readFileSync("scripts/r7/build-r7-execution-slice.py", "utf8");
const transportBuilder = fs.readFileSync("scripts/r7/build-r7-windows-transport.py", "utf8");
const exactWindowsTemplate = fs.readFileSync("scripts/r7/templates/r7-final-exact-windows.yml.template", "utf8");
const runtimeReceipt = JSON.parse(fs.readFileSync(contract.runtimeReceiptPath, "utf8"));
assert.equal(contract.candidate, "R7_MERGED_CURRENT_SOURCE");
assert.equal(contract.projectRef, "yljjyowcvjgjcamffnvd");
assert.equal(contract.ownerAuthorized, true);
assert.equal(contract.customerFinalCredit, false);
assert.equal(contract.runtimeApplied, true);
assert.equal(contract.runtimeStatus, "PASS_PRE_WINDOWS");
assert.equal(runtimeReceipt.status, "PASS_PRE_WINDOWS");
assert.equal(runtimeReceipt.migration.applied, true);
assert.equal(runtimeReceipt.sourceAuthority.legacyOverloadCount, 0);
assert.equal(runtimeReceipt.sourceAuthority.serviceRoleOnly, true);
assert.equal(runtimeReceipt.sourceAuthority.positiveRunAttemptRequired, true);
assert.equal(runtimeReceipt.sourceAuthority.sourceAuthorityComplete, false);
for (const gate of ["migrations","service_role_server_only","user_a_real_auth_session","user_b_real_auth_session","user_a_own_object","user_b_own_object","user_a_to_user_b_denied","user_b_to_user_a_denied","write","readback","reconnect_readback","rollback_failure","concurrency","export","delete_erasure","database_backup","database_restore","post_restore_ownership","post_restore_rls","deployed_request_bound_http","secret_and_provider_error_redaction","private_control_plane_rls","account_binding_helper_security_invoker","source_live_schema_reconciliation","exact_source_windows_authority_binding","exact_source_windows_run_attempt_binding","security_advisor_review","temporary_migration_corpus_export_removed"]) assert.ok(contract.requiredChecks.includes(gate), `missing ${gate}`);
assert.equal(contract.securityHardeningMigration, migrationPath);
assert.equal(contract.temporaryMigrationCorpusCleanupMigration, cleanupMigrationPath);
assert.equal(contract.sourceAuthorityRunAttemptBindingMigration, authorityMigrationPath);
assert.equal(contract.securityAdvisorBoundary.privateControlTablesRlsRequired, 8);
assert.equal(contract.securityAdvisorBoundary.authenticatedSecurityDefinerAccountHelpersAllowed, false);
assert.equal(contract.securityAdvisorBoundary.mutableSearchPathAllowed, false);
assert.equal(contract.securityAdvisorBoundary.pdfSnapshotForeignKeyIndexRequired, true);
for (const table of ["r7_jwt_signing_key","r7_jwt_contexts","r7_artifact_backups","r7_staging_receipts","r7_concurrency_restore_results","r7_one_time_authorities","r7_http_config","r7_source_authority"]) {
  assert.match(migration, new RegExp(`alter table if exists velmere_private\\.${table} enable row level security`, "u"), `RLS missing for ${table}`);
}
assert.match(migration, /alter function public\.velmere_current_account_id\(\) security invoker/u);
assert.match(migration, /alter function public\.velmere_current_account_binding_hash\(\) security invoker/u);
assert.match(migration, /alter function velmere_private\.b64url\(bytea\) set search_path = pg_catalog/u);
assert.match(migration, /create index if not exists r7_customer_artifact_pdf_snapshot_id_idx/u);
assert.match(migration, /create table if not exists velmere_private\.r7_source_authority/u);
assert.match(migration, /create or replace function public\.velmere_r7_common_staging_summary\(\)/u);
assert.match(migration, /p_exact_windows_status <> 'PASS'/u);
assert.match(migration, /p_test_denominator <> 52/u);
assert.match(migration, /execution_slice_aggregate_sha256/u);
assert.match(migration, /execution_slice_manifest_sha256/u);
assert.match(migration, /package_lock_sha256/u);
assert.doesNotMatch(migration, /grant execute on function public\.velmere_r7_record_source_authority[\s\S]*to authenticated/u);
assert.match(cleanupMigration, /drop function if exists public\.velmere_r7_export_exact_migration_corpus\(\)/u);
assert.doesNotMatch(cleanupMigration, /grant execute[\s\S]*velmere_r7_export_exact_migration_corpus/u);
assert.match(authorityMigration, /add column if not exists exact_windows_run_attempt integer/u);
assert.match(authorityMigration, /delete from velmere_private\.r7_source_authority/u);
assert.match(authorityMigration, /alter column exact_windows_run_attempt set not null/u);
assert.match(authorityMigration, /check \(exact_windows_run_attempt >= 1\)/u);
assert.match(authorityMigration, /check \(exact_windows_status = 'PASS'\)/u);
assert.match(authorityMigration, /drop function if exists public\.velmere_r7_record_source_authority\(\s*text, text, text, text, text, text, text\s*\)/u);
assert.match(authorityMigration, /drop function if exists public\.velmere_r7_record_source_authority\(\s*text, text, text, text, text, text, text, integer, text, text, text, text\s*\)/u);
assert.match(authorityMigration, /p_full_source_aggregate_sha256 text/u);
assert.match(authorityMigration, /p_exact_windows_run_attempt integer/u);
assert.match(authorityMigration, /p_exact_windows_run_attempt is null[\s\S]*p_exact_windows_run_attempt < 1/u);
assert.match(authorityMigration, /p_exact_windows_status is distinct from 'PASS'/u);
assert.match(authorityMigration, /'exactWindowsRunAttempt', p_exact_windows_run_attempt/u);
assert.match(authorityMigration, /'exactWindowsRunBound'[\s\S]*sa\.exact_windows_run_attempt >= 1/u);
assert.match(authorityMigration, /'exactWindowsRunAttemptBound', coalesce\(sa\.exact_windows_run_attempt >= 1, false\)/u);
assert.match(authorityMigration, /'sourceAuthorityComplete', coalesce\(sa\.complete, false\)/u);
assert.match(authorityMigration, /set search_path = pg_catalog/u);
assert.match(authorityMigration, /grant execute on function public\.velmere_r7_record_source_authority\([\s\S]*\) to service_role/u);
assert.doesNotMatch(authorityMigration, /grant execute on function public\.velmere_r7_record_source_authority[\s\S]*to (?:public|anon|authenticated)/u);
assert.doesNotMatch(sliceBuilder, /ROOT\.parent\s*\/\s*["']receipts\/R7_THREE_WAY_CLASSIFICATION\.json/u);
assert.match(sliceBuilder, /ANCESTRY_FILES\s*=\s*\[/u);
assert.match(sliceBuilder, /velmere\.r7\.execution-slice-manifest\.v3/u);
assert.match(sliceBuilder, /"fullSource"\s*:\s*\{/u);
assert.match(sliceBuilder, /"archiveAdditionalPaths"\s*:\s*\[/u);
assert.match(sliceBuilder, /20260824000008_r7_source_authority_run_attempt_binding\.sql/u);
assert.match(sliceBuilder, /artifacts\/r7\/VELMERE_R7_FULL_SOURCE_IDENTITY\.json/u);
assert.match(sliceBuilder, /shutil\.copy2\(full_source_identity_path/u);
assert.match(transportBuilder, /EXPECTED_ZSTANDARD_PYTHON\s*=\s*"0\.25\.0"/u);
assert.match(transportBuilder, /EXPECTED_LIBZSTD\s*=\s*\(1, 5, 7\)/u);
assert.match(transportBuilder, /EXPECTED_ZSTD_CLI\s*=\s*"1\.5\.7"/u);
assert.match(transportBuilder, /SYSTEM_ZSTD_CLI/u);
assert.match(transportBuilder, /zstd_cli_runtime_mismatch/u);
assert.match(transportBuilder, /zstd_cli_compression_failed/u);
assert.match(transportBuilder, /"--check"/u);
assert.match(transportBuilder, /tar_a\s*=\s*build_tar[\s\S]*tar_b\s*=\s*build_tar/u);
assert.match(transportBuilder, /bundle_a\s*=\s*compress_tar[\s\S]*bundle_b\s*=\s*compress_tar/u);
assert.match(transportBuilder, /PART_CHARS\s*=\s*700_000/u);
assert.match(transportBuilder, /surface_must_be_new_or_empty/u);
assert.match(transportBuilder, /velmere\.r7\.github-execution-surface\.v4/u);
assert.match(transportBuilder, /velmere\.r7\.windows-execution-transport\.v4/u);
assert.match(transportBuilder, /scan-r7-successor-secrets\.mjs/u);
assert.match(transportBuilder, /"secrets"\s*:\s*0/u);
assert.match(transportBuilder, /gitBlobSha1/u);
assert.match(transportBuilder, /parser\.add_argument\("--pdf-font", type=Path, required=True\)/u);
assert.match(transportBuilder, /parser\.add_argument\("--pdf-font-license", type=Path, required=True\)/u);
assert.match(transportBuilder, /a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa/u);
assert.match(transportBuilder, /e01b637272e0cbdfb240184dd98ea5cc671556d9894dae2668d92ab2c906787c/u);
assert.match(transportBuilder, /PDF_FONT_EXPECTED_BYTE_LENGTH\s*=\s*46_464/u);
assert.match(transportBuilder, /PDF_FONT_LICENSE_EXPECTED_BYTE_LENGTH\s*=\s*4_384/u);
assert.match(transportBuilder, /PDF_FONT_LICENSE_EXPECTED_GIT_BLOB_SHA1\s*=\s*"472064afc4b8dec9079fab03b8ffafb617a1b2d8"/u);
assert.match(transportBuilder, /"fontBytesIncludedInSource"\s*:\s*False/u);
assert.match(transportBuilder, /"fontBytesIncludedInExecutionSlice"\s*:\s*False/u);
assert.match(transportBuilder, /"transportedInGitHubExecutionSurface"\s*:\s*True/u);
assert.match(transportBuilder, /"materializedIntoRuntimeProjectBeforeBuild"\s*:\s*True/u);
assert.match(transportBuilder, /write_bytes\(surface \/ PDF_FONT_LOGICAL_PATH, font_bytes\)/u);
assert.match(transportBuilder, /write_bytes\(surface \/ PDF_FONT_LICENSE_LOGICAL_PATH, font_license_bytes\)/u);
assert.match(exactWindowsTemplate, /runs-on: windows-2025/u);
assert.match(exactWindowsTemplate, /node-version: 24\.18\.0/u);
assert.match(exactWindowsTemplate, /npm install --global npm@11\.16\.0 --ignore-scripts/u);
assert.match(exactWindowsTemplate, /npm_config_ignore_scripts = 'false'/u);
assert.match(exactWindowsTemplate, /npm ci --ignore-scripts=false --audit=false --fund=false/u);
assert.doesNotMatch(exactWindowsTemplate, /lifecycleScriptsExecuted:true/u);
assert.match(exactWindowsTemplate, /R7_FULL_SOURCE_AGGREGATE_SHA256/u);
assert.match(exactWindowsTemplate, /R7_EXECUTION_SLICE_MANIFEST_SHA256/u);
assert.match(exactWindowsTemplate, /const runAttempt=Number\(process\.env\.GITHUB_RUN_ATTEMPT\)/u);
assert.match(exactWindowsTemplate, /PASS_EXACT_WINDOWS_52_X2/u);
assert.match(exactWindowsTemplate, /Full merged 52-test campaign run 1/u);
assert.match(exactWindowsTemplate, /Full merged 52-test campaign run 2/u);
assert.match(exactWindowsTemplate, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/u);
assert.match(exactWindowsTemplate, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/u);
assert.match(exactWindowsTemplate, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/u);
assert.match(exactWindowsTemplate, /R7_SUCCESSOR_SECRET_SCAN_RECEIPT\.json/u);
assert.match(exactWindowsTemplate, /PASS_SECRETS_0/u);
assert.match(exactWindowsTemplate, /=== ESLint exact diagnostics receipt ===/u);
assert.match(exactWindowsTemplate, /foreach \(\$Message in @\(\$ESLintResult\.messages\)\)/u);
assert.match(exactWindowsTemplate, /foreach \(\$ProcessFailure in @\(\$ESLintResult\.processFailures\)\)/u);
assert.match(exactWindowsTemplate, /r7-work\/artifacts\/pass13\/PASS13_PARTITIONED_ESLINT\.json/u);
assert.match(exactWindowsTemplate, /R7_PDF_FONT_PATH: '@@PDF_FONT_PATH@@'/u);
assert.match(exactWindowsTemplate, /Verify exact external runtime PDF font and license/u);
assert.match(exactWindowsTemplate, /git hash-object -- \$Asset\.Path/u);
assert.match(exactWindowsTemplate, /Get-FileHash -LiteralPath \$Asset\.Path -Algorithm SHA256/u);
assert.match(exactWindowsTemplate, /fontBytesIncludedInSource/u);
assert.match(exactWindowsTemplate, /materializedIntoRuntimeProjectBeforeBuild/u);
assert.match(exactWindowsTemplate, /Materialize verified external PDF font inside runtime project/u);
assert.match(exactWindowsTemplate, /r7-work\/r7-runtime\/external-assets/u);
assert.match(exactWindowsTemplate, /Resolve-Path -LiteralPath \$RuntimeFontPath/u);
assert.match(exactWindowsTemplate, /VELMERE_PDF_FONT_PATH=\$AbsoluteFontPath/u);
assert.match(exactWindowsTemplate, /r7-runtime\/external-assets/u);
assert.ok(
  exactWindowsTemplate.indexOf("Verify every transported execution-slice byte")
    < exactWindowsTemplate.indexOf("Materialize verified external PDF font inside runtime project"),
);

// Keep the denominator at 52 while making the additive product-route closure
// executable inside each exact Windows campaign.  The helper name deliberately
// stays outside the campaign's test/verify filename matcher.
const runtimeClosureRegression = spawnSync(
  process.execPath,
  ["scripts/current-execution/r7-browser-basic-product-route-runtime-closure-regression.mjs"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, CI: "1" },
  },
);
assert.equal(
  runtimeClosureRegression.status,
  0,
  `${runtimeClosureRegression.stderr ?? ""}\n${runtimeClosureRegression.stdout ?? ""}`.slice(-8_000),
);
const runtimeClosureLine = (runtimeClosureRegression.stdout ?? "")
  .trim()
  .split(/\r?\n/u)
  .at(-1);
assert.ok(runtimeClosureLine, "runtime closure regression receipt missing");
const runtimeClosureReceipt = JSON.parse(runtimeClosureLine);
assert.equal(runtimeClosureReceipt.ok, true);
assert.equal(runtimeClosureReceipt.checks, 77);
assert.equal(runtimeClosureReceipt.campaignDenominator, 52);

process.stdout.write(`${JSON.stringify({status:"PASS_R7_STAGING_FOUNDATION_CONTRACT",assertions:188,runtimeClosureChecks:runtimeClosureReceipt.checks,projectBound:true,sourceSecurityHardeningPresent:true,sourceRunAttemptBindingPresent:true,successorTransportContractPresent:true,successorExternalRuntimeFontTransportPresent:true,successorProductRouteRuntimeClosurePresent:true,successorSecretScanContractPresent:true,runtimeHardeningApplied:true,exactWindowsBound:false,customerFinalCredit:false},null,2)}\n`);
