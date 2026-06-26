/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true }
  },
  plugins: ["@typescript-eslint"],
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  ignorePatterns: ["node_modules/", ".next/", "dist/", "coverage/"],
  rules: {}
};
