// @ts-check
import globals from "globals";
import js from "@eslint/js";
import ts from "typescript-eslint";

export default ts.config([
  js.configs.recommended, // JavaScript基本ルール
  ...ts.configs.recommended, // TypeScriptルール

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    }
  },

  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-empty": "off",
      "block-spacing": "warn",
      "arrow-spacing": "warn",
      "space-before-blocks": "warn",
      "keyword-spacing": "warn",
      "no-irregular-whitespace": "off",
      "no-useless-escape": "off",
    },
  },
])
