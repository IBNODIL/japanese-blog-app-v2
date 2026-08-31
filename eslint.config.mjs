import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // These patterns need the "**/" prefix or they only match at the
    // project root — nested build output (e.g. inside cPanel-deploy/)
    // was being linted as if it were source, producing thousands of
    // false-positive errors/warnings.
    "**/.next/**",
    "**/out/**",
    "**/node_modules/**",
    // Prebuilt deployment bundle — build output, not source.
    "cPanel-deploy/**",
    "app/generated/**",
  ]),
  {
    // Standalone Node/CommonJS utility scripts (custom server, one-off CLI
    // helpers) — not part of the Next.js app bundle, so the TS-project
    // "no require imports" rule doesn't apply here.
    files: ["server.js", "get-reset-code.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
