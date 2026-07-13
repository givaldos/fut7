import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-script-url": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "supabase/.temp/**",
    "next-env.d.ts",
  ]),
]);
