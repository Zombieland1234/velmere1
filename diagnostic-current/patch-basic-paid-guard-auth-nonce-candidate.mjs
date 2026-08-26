import fs from "node:fs";
import crypto from "node:crypto";

const file = process.argv[2];
if (!file) throw new Error("policy_path_required");
const before = fs.readFileSync(file, "utf8");
const oldBlock = `  const depth = normalizeVlmAccessDepth(args.depth);
  const policies = buildVlmAdvancedOnlyTierPolicies(args.locale);
  const account = await resolveRequestAccount(args.request);
  const context = normalizePaidContext({
    surface: args.surface,
    locale: args.locale,
    assetId: args.assetId || undefined,
    symbol: args.symbol || undefined,
    depth,
    requestId: args.requestId || undefined,
    auditCaseRef: args.auditCaseRef || undefined,
    returnPath: args.returnPath || undefined,
    accountIdHash: account ? hashVelmereAccountBinding(account.accountId) : undefined,
  }, args.locale);

  if (depth === "basic") {
    return { ok: true, depth, paidRequired: false, accessMode: "free_basic", policy: policies.basic, context, reason: "basic_is_free" };
  }
`;
const newBlock = `  const depth = normalizeVlmAccessDepth(args.depth);
  const policies = buildVlmAdvancedOnlyTierPolicies(args.locale);

  if (depth === "basic") {
    const context = normalizePaidContext({
      surface: args.surface,
      locale: args.locale,
      assetId: args.assetId || undefined,
      symbol: args.symbol || undefined,
      depth,
      requestId: args.requestId || undefined,
      auditCaseRef: args.auditCaseRef || undefined,
      returnPath: args.returnPath || undefined,
    }, args.locale);
    return { ok: true, depth, paidRequired: false, accessMode: "free_basic", policy: policies.basic, context, reason: "basic_is_free" };
  }

  const account = await resolveRequestAccount(args.request);
  const context = normalizePaidContext({
    surface: args.surface,
    locale: args.locale,
    assetId: args.assetId || undefined,
    symbol: args.symbol || undefined,
    depth,
    requestId: args.requestId || undefined,
    auditCaseRef: args.auditCaseRef || undefined,
    returnPath: args.returnPath || undefined,
    accountIdHash: account ? hashVelmereAccountBinding(account.accountId) : undefined,
  }, args.locale);
`;
const count = before.split(oldBlock).length - 1;
if (count !== 1) throw new Error(`paid_guard_exact_anchor_count_${count}`);
const after = before.replace(oldBlock, newBlock);
fs.writeFileSync(file, after, "utf8");
const digest = crypto.createHash("sha256").update(Buffer.from(after, "utf8")).digest("hex");
console.log(JSON.stringify({
  status: "PASS_BASIC_FREE_AUTH_NONCE_HOTFIX_APPLIED_CANDIDATE_ONLY",
  file,
  sha256: digest,
  currentSourceModified: false,
  customerFinalCredit: false
}, null, 2));
