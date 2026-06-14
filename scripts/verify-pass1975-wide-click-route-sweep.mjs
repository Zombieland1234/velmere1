import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
function pass(name, condition) {
  checks.push([name, Boolean(condition)]);
}

const navbar = read("components/Navbar.tsx");
const mail = read("components/contact/FloatingMailWidget.tsx");
const css = read("app/globals.css");
const research = read("app/[locale]/research-lab/page.tsx");

pass("header mail trigger has test id", navbar.includes('data-testid="velmere-header-mail-trigger"'));
pass("header mail trigger emits custom event", navbar.includes('new CustomEvent("velmere:open-mail"'));
pass("private mail drawer has stable surface id", mail.includes('surfaceId="velmere-private-mail-drawer"'));
pass("private mail drawer has frame open confirmation", mail.includes("window.requestAnimationFrame(() => setOpen(true))"));
pass("PASS1975 css trigger hardening exists", css.includes("PASS1975 — wide runtime click + surface visibility sweep"));
pass("PASS1975 css hardens dropdown surfaces", css.includes('[data-surface="header-wallet-panel-anchored"]'));
pass("PASS1975 css hardens private mail surface", css.includes('#velmere-private-mail-drawer[data-surface="private-mail"]'));
pass("PASS1975 css keeps cart full height", css.includes('#velmere-cart-bottom-sheet.velmere-cart-bottom-sheet[data-surface="cart-bottom-sheet"]'));
pass("Research Lab back link targets existing VLM route", research.includes('Link href="/vlm-token"'));

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (failed.length) {
  console.error(`\nPASS1975 failed ${failed.length}/${checks.length} checks`);
  process.exit(1);
}
console.log(`\nPASS1975 ${checks.length}/${checks.length} checks`);
