import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const panel = fs.readFileSync(
  path.join(root, "components/angel/AngelPanel.tsx"),
  "utf8",
);

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

check(
  panel.includes('data-ai-interaction-disclosure="visible"'),
  "Angel must visibly disclose that the user is interacting with AI",
);
check(
  panel.includes('data-angel-product-boundary="informational-decision-support"'),
  "Angel must expose the bounded decision-support product role",
);
check(
  panel.includes("may make mistakes") && panel.includes("może się mylić") && panel.includes("kann Fehler machen"),
  "PL/EN/DE disclosures must preserve fallibility",
);
check(
  panel.includes("does not provide personalized investment or legal advice"),
  "English disclosure must reject personalized investment/legal advice",
);
check(
  panel.includes("nie udziela spersonalizowanej porady inwestycyjnej ani prawnej"),
  "Polish disclosure must reject personalized investment/legal advice",
);
check(
  panel.includes("keine personalisierte Anlage- oder Rechtsberatung"),
  "German disclosure must reject personalized investment/legal advice",
);
check(
  panel.includes('surfaceData={{ surface: "angel", mode: "evidence-bound-basic", aiInteraction: "disclosed" }}'),
  "overlay metadata must use semantic customer-safe fields",
);
check(!/data-pass\d+/u.test(panel), "Angel customer DOM must not expose numbered PASS topology");
check(!/PASS\d{3,}/u.test(panel), "Angel source/customer copy must not retain internal PASS topology");
check(!panel.includes('className="hidden"'), "Angel must not hide internal proof rails in customer DOM");
check(
  panel.includes('depth: "basic"'),
  "the floating Angel surface must remain explicitly bound to Basic depth",
);
check(
  panel.includes("Paid Angel depth must not be inferred"),
  "paid depth must remain a server-authorized product state, not a client assumption",
);

console.log(`Angel AI disclosure and public topology: PASS (${assertions}/${assertions})`);
