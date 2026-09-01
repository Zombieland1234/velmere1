import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  deduplicateShieldMapSuggestions,
  normalizeShieldMapSuggestionKey,
} from "../../lib/market-integrity/shield-map-suggestion-dedup.ts";
import { nextLensSuggestionKeyboardDecision } from "../../lib/search/lens-suggestion-keyboard.ts";

const component = readFileSync(
  "components/market-integrity/ShieldMapCommandClient.tsx",
  "utf8",
);

let assertions = 0;
function check(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

const mixedIdentitySuggestions = [
  { id: " Bitcoin ", symbol: "BTC", name: "Bitcoin local" },
  { id: "bitcoin", symbol: "XBT", name: "Bitcoin provider duplicate" },
  { id: "", symbol: " eTh ", name: "Ethereum local" },
  { id: "", symbol: "ETH", name: "Ethereum provider duplicate" },
  { id: "ＡＢＣ", symbol: "ABC", name: "Compatibility form" },
  { id: "abc", symbol: "ABC", name: "ASCII duplicate" },
];

assert.equal(
  normalizeShieldMapSuggestionKey(mixedIdentitySuggestions[0]),
  "bitcoin",
);
assert.equal(
  normalizeShieldMapSuggestionKey(mixedIdentitySuggestions[2]),
  "eth",
);
assert.equal(
  normalizeShieldMapSuggestionKey(mixedIdentitySuggestions[4]),
  "abc",
);
assertions += 3;
assert.deepEqual(
  deduplicateShieldMapSuggestions(mixedIdentitySuggestions).map(
    (suggestion) => suggestion.name,
  ),
  ["Bitcoin local", "Ethereum local", "Compatibility form"],
  "case, surrounding whitespace and Unicode compatibility forms must not create duplicate options",
);
assertions += 1;

for (const locale of ["pl", "en", "de"] as const) {
  const downFromClosed = nextLensSuggestionKeyboardDecision({
    key: "ArrowDown",
    optionCount: 3,
    activeIndex: null,
    open: false,
  });
  assert.deepEqual(downFromClosed, {
    handled: true,
    open: true,
    activeIndex: 0,
    selectIndex: null,
  });
  assertions += 1;

  const wrapUp = nextLensSuggestionKeyboardDecision({
    key: "ArrowUp",
    optionCount: 3,
    activeIndex: 0,
    open: true,
  });
  assert.equal(wrapUp.activeIndex, 2, `${locale}: ArrowUp must wrap`);
  assertions += 1;

  const home = nextLensSuggestionKeyboardDecision({
    key: "Home",
    optionCount: 3,
    activeIndex: 2,
    open: true,
  });
  const end = nextLensSuggestionKeyboardDecision({
    key: "End",
    optionCount: 3,
    activeIndex: 0,
    open: true,
  });
  assert.equal(home.activeIndex, 0, `${locale}: Home must select first`);
  assert.equal(end.activeIndex, 2, `${locale}: End must select last`);
  assertions += 2;

  const enter = nextLensSuggestionKeyboardDecision({
    key: "Enter",
    optionCount: 3,
    activeIndex: 1,
    open: true,
  });
  assert.equal(enter.selectIndex, 1, `${locale}: Enter must select active`);
  assert.equal(enter.open, false, `${locale}: Enter must close listbox`);
  assertions += 2;

  const escape = nextLensSuggestionKeyboardDecision({
    key: "Escape",
    optionCount: 3,
    activeIndex: 1,
    open: true,
  });
  assert.deepEqual(escape, {
    handled: true,
    open: false,
    activeIndex: null,
    selectIndex: null,
  });
  assertions += 1;
}

assert.deepEqual(
  nextLensSuggestionKeyboardDecision({
    key: "Enter",
    optionCount: 3,
    activeIndex: null,
    open: true,
  }),
  {
    handled: false,
    open: true,
    activeIndex: null,
    selectIndex: null,
  },
  "Enter without an active option must not submit a suggestion",
);
assert.deepEqual(
  nextLensSuggestionKeyboardDecision({
    key: "ArrowDown",
    optionCount: Number.NaN,
    activeIndex: 999,
    open: true,
  }),
  {
    handled: false,
    open: true,
    activeIndex: null,
    selectIndex: null,
  },
  "invalid counts and indices must fail safely",
);
assertions += 2;

const sourceContracts: Array<[RegExp, string]> = [
  [
    /deduplicateShieldMapSuggestions\(\s*\[\s*\.\.\.local,\s*\.\.\.\(payload\.suggestions \?\? \[\]\),?\s*\]\s*\)/,
    "provider and local options must use normalized deduplication",
  ],
  [
    /nextLensSuggestionKeyboardDecision\(\{[\s\S]*?optionCount: suggestions\.length,[\s\S]*?activeIndex: activeSuggestionIndex,[\s\S]*?open: suggestionsVisible/,
    "Shield Map input must be wired to the safe keyboard state machine",
  ],
  [/role="combobox"/, "input must expose combobox role"],
  [/aria-autocomplete="list"/, "input must expose list autocomplete"],
  [/aria-expanded=\{suggestionsVisible\}/, "input must expose expanded state"],
  [
    /aria-controls="shield-map-suggestion-list"/,
    "input must own the listbox",
  ],
  [
    /aria-activedescendant=\{activeSuggestionId\}/,
    "input must expose the active option",
  ],
  [
    /aria-keyshortcuts="Enter Escape ArrowDown ArrowUp Home End"/,
    "supported keyboard commands must be discoverable",
  ],
  [/id="shield-map-suggestion-list"/, "listbox must have a stable id"],
  [
    /id=\{`shield-map-suggestion-option-\$\{index\}`\}/,
    "each option must have a stable active-descendant id",
  ],
  [/tabIndex=\{-1\}/, "options must retain input focus during navigation"],
  [
    /aria-selected=\{activeSuggestionIndex === index\}/,
    "active option must expose selected state",
  ],
  [
    /key=\{normalizeShieldMapSuggestionKey\(item\)\}/,
    "React option identity must use the same normalized unique key",
  ],
  [
    /setActiveSuggestionIndex\(null\);\s*setSuggestions\(merged\)/,
    "an asynchronous reorder must clear the old active index before publication",
  ],
  [/suggestionsLabel: "Sugestie wyszukiwania"/, "Polish listbox label required"],
  [/suggestionsLabel: "Search suggestions"/, "English listbox label required"],
  [/suggestionsLabel: "Suchvorschläge"/, "German listbox label required"],
  [
    /type="button"[\s\S]*?role="option"[\s\S]*?onClick=\{\(\) => chooseSuggestion\(item\)\}/,
    "touch/click selection must remain a button action and never submit the form",
  ],
];

for (const [pattern, message] of sourceContracts) {
  check(pattern.test(component), message);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      assertions,
      locales: ["pl", "en", "de"],
      keyboard: ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape"],
      dedup: ["case", "whitespace", "unicode_nfkc"],
      customerFinalCredit: 0,
    },
    null,
    2,
  ),
);
