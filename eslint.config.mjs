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
    // Generated Prisma client - not hand-written, not ours to lint.
    "src/generated/**",
    // Loaded directly by Next.js's config loader outside the TS build pipeline -
    // must stay plain CommonJS (require), per Next.js's own cacheHandler docs.
    "cache-handler.js",
  ]),
]);

export default eslintConfig;
