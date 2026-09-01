import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { nextLensSuggestionKeyboardDecision } from "../../lib/search/lens-suggestion-keyboard.ts";

const componentSource = await readFile(
  new URL(
    "../../components/search/VelmereIntelligenceSearchClient.tsx",
    import.meta.url,
  ),
  "utf8",
);

assert.match(
  componentSource,
  /aria-activedescendant=\{activeSuggestionId\}/,
  "Browser combobox must expose its keyboard-active option to assistive technology",
);
assert.match(
  componentSource,
  /disabled=\{!interactiveReady\}/,
  "Browser combobox must remain non-interactive until its hydration boundary commits",
);
assert.match(
  componentSource,
  /data-testid=\{interactiveReady \? "lens-search-input" : undefined\}/,
  "Only the hydrated Browser combobox may publish the interactive test identity",
);

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
assert.equal(
  nextLensSuggestionKeyboardDecision({
    key: "ArrowUp",
    optionCount: 3,
    activeIndex: null,
    open: false,
  }).activeIndex,
  2,
);
assert.equal(
  nextLensSuggestionKeyboardDecision({
    key: "ArrowDown",
    optionCount: 3,
    activeIndex: 2,
    open: true,
  }).activeIndex,
  0,
);
assert.equal(
  nextLensSuggestionKeyboardDecision({
    key: "ArrowUp",
    optionCount: 3,
    activeIndex: 0,
    open: true,
  }).activeIndex,
  2,
);
assert.equal(
  nextLensSuggestionKeyboardDecision({
    key: "Home",
    optionCount: 3,
    activeIndex: 2,
    open: true,
  }).activeIndex,
  0,
);
assert.equal(
  nextLensSuggestionKeyboardDecision({
    key: "End",
    optionCount: 3,
    activeIndex: 0,
    open: true,
  }).activeIndex,
  2,
);
assert.deepEqual(
  nextLensSuggestionKeyboardDecision({
    key: "Enter",
    optionCount: 3,
    activeIndex: 1,
    open: true,
  }),
  {
    handled: true,
    open: false,
    activeIndex: null,
    selectIndex: 1,
  },
);
assert.deepEqual(
  nextLensSuggestionKeyboardDecision({
    key: "Escape",
    optionCount: 3,
    activeIndex: 1,
    open: true,
  }),
  {
    handled: true,
    open: false,
    activeIndex: null,
    selectIndex: null,
  },
);

for (const adversarial of [
  { optionCount: -1, activeIndex: 0 },
  { optionCount: Number.NaN, activeIndex: 0 },
  { optionCount: 2, activeIndex: 999 },
] as const) {
  const decision = nextLensSuggestionKeyboardDecision({
    key: "Enter",
    optionCount: adversarial.optionCount,
    activeIndex: adversarial.activeIndex,
    open: true,
  });
  assert.equal(decision.handled, false);
  assert.equal(decision.selectIndex, null);
}

assert.equal(
  nextLensSuggestionKeyboardDecision({
    key: "Tab",
    optionCount: 3,
    activeIndex: 1,
    open: true,
  }).handled,
  false,
);
assert.match(
  componentSource,
  /nextLensSuggestionKeyboardDecision\(/,
  "Browser combobox must implement ArrowUp/ArrowDown/Home/End/Enter behavior",
);
assert.match(
  componentSource,
  /aria-selected=\{activeSuggestionIndex === index\}/,
  "Browser listbox options must publish their actual selection state",
);
assert.match(
  componentSource,
  /role="option"[\s\S]{0,240}tabIndex=\{-1\}/,
  "Listbox options must not create a second, conflicting Tab navigation model",
);

process.stdout.write(
  `${JSON.stringify(
    {
      status: "PASS_BROWSER_COMBOBOX_KEYBOARD_ACCESSIBILITY",
      integrationAssertions: 6,
      behavioralAssertions: 15,
      customerFinalPromoted: false,
    },
    null,
    2,
  )}\n`,
);
