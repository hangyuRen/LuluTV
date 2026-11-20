import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "desktop/out/**",
    "desktop/runtime/**",
    "build/**",
    "next-env.d.ts",
    ".agent/**",
    ".agents/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
