import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
const marketSource = read("components/market-integrity/MarketIntegrityClient.tsx");
const mapSource = read("components/market-integrity/ShieldMapClient.tsx");
const packageSource = read("package.json");

const modeStateIndex = modalSource.indexOf("const [vlmSequenceMode, setVlmSequenceMode]");
const layoutGateIndex = modalSource.indexOf("buildLayoutStabilitySentinelGate(result, pdfForgeComposerGate");
const undefinedModeCall = "buildLayoutStabilitySentinelGate(result, pdfForgeComposerGate, mode)";
const duplicateModeState = modalSource.match(/const \[vlmSequenceMode, setVlmSequenceMode\]/g) ?? [];

const checks = [
  [modeStateIndex !== -1, "VLM sequence mode state exists"],
  [layoutGateIndex !== -1, "layout stability gate call exists"],
  [modeStateIndex !== -1 && layoutGateIndex !== -1 && modeStateIndex < layoutGateIndex, "vlmSequenceMode is declared before the layout gate useMemo"],
  [!modalSource.includes(undefinedModeCall), "undefined `mode` is not passed into buildLayoutStabilitySentinelGate"],
  [modalSource.includes("layoutSentinelMode: VlmAiSequenceMode = vlmSequenceMode ?? \"basic\""), "layout sentinel uses a safe fallback mode"],
  [duplicateModeState.length === 1, "vlmSequenceMode state is declared once"],
  [marketSource.includes("function closeSearchSuggestionsForModal()"), "Shield terminal has search quarantine helper"],
  [marketSource.includes("if (selected) {\n      closeSearchSuggestionsForModal();\n      return;\n    }"), "Shield search effect closes when token modal is selected"],
  [marketSource.includes("!selected &&\n                suggestionsOpen"), "Shield search portal cannot render behind token modal"],
  [marketSource.includes("closeSearchSuggestionsForModal();\n    startTerminalTransition(() => setSelected(item));"), "Shield suggestions close before modal transition"],
  [mapSource.includes("const closeInvestigatorSuggestions = useCallback"), "Shield Map has investigator suggestion quarantine helper"],
  [mapSource.includes("if (investigatorLoading || investigatorResult) closeInvestigatorSuggestions();"), "Shield Map closes suggestions during scan/result state"],
  [mapSource.includes("suggestionsOpen && !investigatorLoading"), "Shield Map portal cannot stay open during scan"],
  [packageSource.includes("verify:pass299-runtime-search-quarantine-gate"), "package script registered"],
];

const failed = checks.filter(([ok]) => !ok).map(([, label]) => label);

if (failed.length) {
  console.error("PASS299 runtime/search quarantine gate verification failed:");
  for (const label of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log("PASS299 runtime/search quarantine gate verification passed.");
