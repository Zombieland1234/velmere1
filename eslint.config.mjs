import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "warn",
      // React 19/Compiler diagnostics enter as migration warnings.
      // TypeScript and production builds remain hard release gates.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs,ts}"],
    rules: {
      "@next/next/no-assign-module-variable": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "artifacts/**",
    "next-env.d.ts",
  ]),
]);
