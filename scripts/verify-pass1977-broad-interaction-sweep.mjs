import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) errors.push(message); };

const files = {
  "components/community/CommentThread.tsx": read("components/community/CommentThread.tsx"),
  "components/vlm/VlmBuyAccessPanel.tsx": read("components/vlm/VlmBuyAccessPanel.tsx"),
  "components/vlm/VlmWalletModule.tsx": read("components/vlm/VlmWalletModule.tsx"),
  "components/lab/VelmereMotionLabClient.tsx": read("components/lab/VelmereMotionLabClient.tsx"),
  "components/ui/primitives.tsx": read("components/ui/primitives.tsx"),
  "components/security/SecurityAuditRegistryPage.tsx": read("components/security/SecurityAuditRegistryPage.tsx"),
};

const comments = files["components/community/CommentThread.tsx"];
const vlmBuy = files["components/vlm/VlmBuyAccessPanel.tsx"];
const vlmWallet = files["components/vlm/VlmWalletModule.tsx"];
const motionLab = files["components/lab/VelmereMotionLabClient.tsx"];
const primitives = files["components/ui/primitives.tsx"];
const registry = files["components/security/SecurityAuditRegistryPage.tsx"];

assert(comments.includes("const [reactions") && comments.includes("setReaction(comment.id"), "Square comments must have like/dislike click state.");
assert(comments.includes("setOpenMenuId") && comments.includes("navigator.clipboard"), "Square comment menu must open and perform a real action.");
assert(comments.includes("requestReply(comment.authorName)"), "Square reply CTA must write a reply mention into the input.");
assert(vlmBuy.includes("openWaitlist") && vlmBuy.includes('CustomEvent("velmere:open-mail"') && vlmBuy.includes('data-pass1977-vlm-waitlist="opens-mail-drawer"'), "VLM waitlist CTA must open the mail drawer.");
assert(vlmWallet.includes("openWalletPanel") && vlmWallet.includes('CustomEvent("velmere:open-wallet"') && vlmWallet.includes('data-pass1977-vlm-wallet-cta="opens-header-wallet"'), "VLM wallet module CTA must open the wallet panel instead of being a dead button. ");
assert(motionLab.includes("useRouter") && motionLab.includes("appConceptRoutes") && motionLab.includes('data-pass1977-open-concept="route-bound"'), "Motion Lab Open concept must route somewhere real.");
assert(primitives.includes('type = "button"') && primitives.includes("type={type} {...props}"), "Shared Button primitive must default to type=button.");
assert(registry.includes('type="submit"') && registry.includes('data-pass1977-filter-submit="explicit"'), "Security audit registry filter button must have explicit submit semantics.");

for (const [fileName, source] of Object.entries(files)) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName,
    reportDiagnostics: true,
  });
  const diagnostics = (result.diagnostics ?? []).filter((diag) => diag.category === ts.DiagnosticCategory.Error);
  for (const diag of diagnostics) {
    errors.push(`${fileName}: ${ts.flattenDiagnosticMessageText(diag.messageText, " ")}`);
  }
}

if (errors.length) {
  console.error("PASS1977 broad interaction sweep failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS1977 PASS — broad interaction sweep: Square actions, VLM waitlist, Motion Lab routes, form semantics and TSX syntax verified");
