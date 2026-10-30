import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Posters are rendered by satori, which only understands plain <img>.
  { files: ["src/poster/**"], rules: { "@next/next/no-img-element": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "gallery/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
