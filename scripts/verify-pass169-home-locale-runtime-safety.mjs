import { readFileSync, existsSync } from "node:fs";

const failures = [];
const homeFile = "components/home/HomePageClient.tsx";
if (!existsSync(homeFile)) failures.push(`${homeFile} is missing`);

if (!failures.length) {
  const source = readFileSync(homeFile, "utf8");
  if (!source.includes("const locale = useLocale();")) {
    failures.push("HomePageClient must define const locale = useLocale() before passing locale to child components.");
  }
  if (!source.includes("const copy = homeCopy(locale);")) {
    failures.push("HomePageClient must call homeCopy(locale), not homeCopy(useLocale()), so locale stays in scope.");
  }
  if (!source.includes("<FullSurfaceReadinessIndex locale={locale} surface=\"home\" />")) {
    failures.push("HomePageClient must pass the scoped locale into FullSurfaceReadinessIndex.");
  }
  if (source.includes("homeCopy(useLocale())")) {
    failures.push("HomePageClient still contains homeCopy(useLocale()), which can leave locale undefined at render sites.");
  }
  if (/FullSurfaceReadinessIndex\s+locale=\{locale\}/.test(source) && !/const\s+locale\s*=\s*useLocale\(\)\s*;/.test(source)) {
    failures.push("FullSurfaceReadinessIndex uses locale variable without a scoped useLocale() assignment.");
  }
}

if (failures.length) {
  console.error("PASS169 home locale runtime safety failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS169 home locale runtime safety OK");
