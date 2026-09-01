import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/home/HomePageClient.tsx", "utf8");

assert.doesNotMatch(
  source,
  /\[\s*"(?:Mapa )?Shield(?: Map)?",\s*"91%"/u,
  "home must not publish an unbound Shield coverage percentage",
);
assert.equal(
  (source.match(/\[\s*"(?:Mapa )?Shield(?: Map)?",\s*"WITHHELD"/gu) ?? []).length,
  3,
  "PL, EN and DE must render the same canonical WITHHELD state",
);
assert.match(source, /prawa do wyświetlania/u);
assert.match(source, /display rights/u);
assert.match(source, /Anzeigerechte/u);

console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.home-shield-coverage-claim-fail-closed-test.v1",
  status: "PASS",
  locales: ["pl", "en", "de"],
  unboundPercentagePublished: false,
  finalCredit: false,
}, null, 2));
