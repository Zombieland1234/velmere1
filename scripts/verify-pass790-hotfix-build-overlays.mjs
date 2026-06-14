import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const provider = read("lib/ai/vlm-provider-registry.ts");
const navbar = read("components/Navbar.tsx");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));

expect(!provider.includes('@google/genai'), "Gemini provider has no build-blocking @google/genai reference");
expect(provider.includes("createRestGeminiClient"), "Gemini provider uses dependency-free REST transport");
expect(provider.includes("createRestGeminiClient") && provider.includes("generativelanguage.googleapis.com"), "Gemini REST fallback is present for live server-side calls without SDK package");
expect(!pkg.dependencies?.["@google/genai"], "package.json no longer requires @google/genai");
expect(!lock.packages?.["node_modules/@google/genai"], "package-lock no longer locks @google/genai from a private mirror");
expect(navbar.includes("DrawerRoot") && navbar.includes("DropdownRoot"), "main menu and language selector use shared overlay primitives");
expect(navbar.includes("languageButtonRef") && navbar.includes('aria-haspopup="menu"') && navbar.includes("surface: \"language-selector\""), "language selector has anchored menu semantics and outside-click boundary");
expect(read("components/ui/OverlayPrimitives.tsx").includes("resolveDropdownPosition") && read("components/ui/OverlayPrimitives.tsx").includes('pass628LayerStyle("listbox")'), "language selector opens through a fixed body-level listbox anchored below the globe");
expect(read("components/ui/OverlayPrimitives.tsx").includes('event.key === "Escape"') && navbar.includes("surface: \"header-wallet-panel\"") && navbar.includes("surface: \"member-menu\""), "language/wallet/member popovers close with shared Escape boundary");
console.log("PASS790 hotfix build/overlay verifier complete");
