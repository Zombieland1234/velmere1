import {  errors, read, walk } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.runtime-release.017");
const textFiles = [
  ...walk("app", [".ts", ".tsx", ".css", ".js", ".jsx"]),
  ...walk("components", [".ts", ".tsx", ".css", ".js", ".jsx"]),
  ...walk("lib", [".ts", ".tsx", ".css", ".js", ".jsx"]),
  ...walk("store", [".ts", ".tsx", ".css", ".js", ".jsx"]),
];


setGuardScope("pf.runtime-release.018");
for (const file of textFiles) {
  const source = read(file);
  if (/repeat\s*:\s*Infinity/.test(source))
    errors.pushWithId.bind(errors, "release.018.value-use-repeat-999999-instead-of-repeat-infinity-for-v.a001.value-use-repeat-999999-instead-of-repeat-infinity-for-v")(
      `${file}: use repeat: 999999 instead of repeat: Infinity for Vercel/WAAPI safety.`,
    );
  if (/iterationCount/.test(source))
    errors.pushWithId.bind(errors, "release.018.value-use-repeat-999999-instead-of-repeat-infinity-for-v.a002.value-do-not-pass-iterationcount-manually-to-waapi")(`${file}: do not pass iterationCount manually to WAAPI.`);
  if (
    /\b(?:border|bg|text|ring|from|via|to|shadow|outline|divide|placeholder|stroke|fill)-[^\s"'`{}]+\/(?:1[1-9]|[2-9][1-9])\b/.test(
      source,
    )
  ) {
    const bad = source.match(
      /\b(?:border|bg|text|ring|from|via|to|shadow|outline|divide|placeholder|stroke|fill)-[^\s"'`{}]+\/(?:1[1-9]|[2-9][1-9])\b/,
    )?.[0];
    const allowed = /\/(15|20|25|30|40|50|60|70|75|80|90|95|100)$/.test(
      bad ?? "",
    );
    if (!allowed)
      errors.pushWithId.bind(errors, "release.018.value-use-repeat-999999-instead-of-repeat-infinity-for-v.a003.value-suspicious-tailwind-opacity-class-value-use-arbitr")(
        `${file}: suspicious Tailwind opacity class ${bad}. Use arbitrary syntax like border-white/[0.12].`,
      );
  }
  if (/function\s+previewHeaders\s*\(\s*\)\s*\{/.test(source)) {
    errors.pushWithId.bind(errors, "release.018.value-use-repeat-999999-instead-of-repeat-infinity-for-v.a004.value-previewheaders-must-be-typed-as-previewheaders-hea")(
      `${file}: previewHeaders must be typed as previewHeaders(): HeadersInit and must build a Record<string, string> without undefined header values.`,
    );
  }
  if (/x-velmere-preview-session[\s\S]{0,240}\?\s*undefined/.test(source)) {
    errors.pushWithId.bind(errors, "release.018.value-use-repeat-999999-instead-of-repeat-infinity-for-v.a005.value-do-not-create-headersinit-objects-with-optional-un")(
      `${file}: do not create HeadersInit objects with optional undefined header values; build a Record<string, string> and conditionally assign the header.`,
    );
  }
}


setGuardScope("pf.runtime-release.025");
export { textFiles };
