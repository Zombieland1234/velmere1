import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (condition, message) => { if (!condition) errors.push(message); };
const pkg = JSON.parse(read("package.json"));

expect(pkg.engines?.node === ">=24.16.0 <25", "Node engine must target 24.16 LTS");
expect(pkg.engines?.npm === ">=11.16.0 <12", "npm engine must target 11.16");
expect(pkg.packageManager === "npm@11.16.0", "packageManager must pin npm 11.16.0");
expect(pkg.dependencies?.next === "16.2.7", "Next.js must be 16.2.7");
expect(pkg.dependencies?.react === "19.2.7" && pkg.dependencies?.["react-dom"] === "19.2.7", "React and React DOM must be 19.2.7");
expect(pkg.devDependencies?.eslint?.startsWith("^9."), "ESLint 9 must be configured");
expect(pkg.scripts?.lint === "eslint .", "lint must use ESLint flat config");
expect(pkg.scripts?.["build:webpack"] === "next build --webpack", "Webpack fallback build is missing");
expect(fs.existsSync(path.join(root, "proxy.ts")), "proxy.ts is missing");
expect(!fs.existsSync(path.join(root, "middleware.ts")), "middleware.ts must be migrated to proxy.ts");
expect(fs.existsSync(path.join(root, "routing.ts")), "next-intl routing.ts is missing");
expect(fs.existsSync(path.join(root, "eslint.config.mjs")), "ESLint flat config is missing");
expect(read("proxy.ts").includes("export default function proxy"), "proxy.ts must export the Next 16 proxy function");
expect(read("navigation.ts").includes("createNavigation"), "next-intl navigation must use createNavigation");
expect(read("i18n.ts").includes("hasLocale"), "request locale fallback must use hasLocale");
expect(read("next.config.mjs").includes("turbopack"), "Next 16 turbopack config marker is missing");
expect(read("tsconfig.json").includes('"target": "ES2022"'), "TypeScript target must be ES2022");

if (errors.length) {
  console.error("PASS693-700 platform verifier failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS693-700 PASS — Node 24 / npm 11 / Next 16 / React 19 platform contract");
