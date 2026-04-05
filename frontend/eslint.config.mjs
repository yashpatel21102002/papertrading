import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // 1. GLOBAL IGNORES: Put this at the top
  {
    ignores: [
      ".next/*",
      "node_modules/*",
      "public/*",
      "build/*",
      "dist/*",
      "**/*.config.js",
      "**/*.config.ts",
    ],
  },
  // 2. Your existing Next.js configs
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 3. (Optional) Custom rule overrides to make it less strict
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;