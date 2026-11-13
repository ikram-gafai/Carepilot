import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // components/charts/** are visx + motion chart primitives that read refs during render (path
  // measurement, spring targets, portal containers) and use a post-mount render to attach portals.
  // These two React-Compiler compatibility rules are reported as warnings there: React Compiler is not
  // enabled (next.config.mjs), and refactoring the animation logic needs visual regression testing.
  // Application components outside this folder are held to the full rule set.
  {
    files: ["components/charts/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
