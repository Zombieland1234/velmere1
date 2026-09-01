#!/usr/bin/env node
export function evaluateWindowsAdmission(descriptor, policy) {
  const checks = [];
  const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
  const required = policy.required;
  add("platform", descriptor.platform === required.platform, descriptor.platform);
  add("arch", descriptor.arch === required.arch, descriptor.arch);
  for (const name of ["node", "npm", "typescript", "eslint", "next", "playwright", "chromium"]) add(`version:${name}`, descriptor[name] === required[name], descriptor[name]);
  add("chromium-revision", descriptor.chromiumRevision === required.chromiumRevision, descriptor.chromiumRevision);
  add("clean-unpack", descriptor.cleanUnpack === true);
  add("a58-first", descriptor.a58FirstChild === true);
  add("output-outside-source", descriptor.outputOutsideSource === true);
  add("source-immutable", descriptor.sourceImmutable === true);
  add("no-live-keys", descriptor.liveKeysPresent === false);
  add("no-production-payments", descriptor.productionPaymentsExecuted === false);
  add("browser-rows", descriptor.browserRows === required.browserRows, descriptor.browserRows);
  add("screenshots", descriptor.screenshots === required.screenshots, descriptor.screenshots);
  add("popup-tabs", descriptor.popupTabs === required.popupTabs, descriptor.popupTabs);
  add("browser-evidence", descriptor.browserEvidenceChecks === required.browserEvidenceChecks, descriptor.browserEvidenceChecks);
  add("source-digest", /^[a-f0-9]{64}$/u.test(descriptor.sourceManifestSha256 ?? "") && descriptor.sourceManifestSha256 === descriptor.expectedSourceManifestSha256);
  const failed = checks.filter((row) => !row.ok);
  return {
    schemaVersion: "velmere.pass36.a102r44p25.exact-windows-admission-evaluation.v1",
    status: failed.length ? "ACTION_REQUIRED_EXACT_WINDOWS_BLOCKED" : "READY_FOR_EXACT_WINDOWS_CREDIT_REVIEW",
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    rows: checks,
    exactWindowsCredit: false,
    saleCredit: false,
    liveCredit: false,
  };
}
