import fs from "node:fs";
import crypto from "node:crypto";

const file = process.argv[2];
if (!file) throw new Error("lens_route_path_required");
const before = fs.readFileSync(file, "utf8");
const anchor = `  const pass2177OriginGuard = assertPass2177SameOriginRequest(request, {
    allowMissingOrigin: true,
  });
  if (pass2177OriginGuard) return pass2177OriginGuard;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
`;
const replacement = `  const pass2177OriginGuard = assertPass2177SameOriginRequest(request, {
    allowMissingOrigin: true,
  });
  if (pass2177OriginGuard) return pass2177OriginGuard;

  // Preserve an unread request body for the request-bound trusted account HMAC.
  // The Lens payload parser below consumes the original body before customer
  // account resolution happens later in the PDF route.
  const accountResolutionRequest = request.clone();

  const contentLength = Number(request.headers.get("content-length") ?? 0);
`;
const oldResolve = `  const durableAccount = await resolveRequestAccount(request);`;
const newResolve = `  const durableAccount = await resolveRequestAccount(accountResolutionRequest);`;
const anchorCount = before.split(anchor).length - 1;
const resolveCount = before.split(oldResolve).length - 1;
if (anchorCount !== 1) throw new Error(`lens_clone_anchor_count_${anchorCount}`);
if (resolveCount !== 1) throw new Error(`lens_durable_account_resolve_count_${resolveCount}`);
const after = before.replace(anchor, replacement).replace(oldResolve, newResolve);
fs.writeFileSync(file, after, "utf8");
const digest = crypto.createHash("sha256").update(Buffer.from(after, "utf8")).digest("hex");
console.log(JSON.stringify({
  status: "PASS_LENS_ACCOUNT_REQUEST_CLONE_FIX_APPLIED_CANDIDATE_ONLY",
  file,
  sha256: digest,
  currentSourceModified: false,
  customerFinalCredit: false
}, null, 2));
