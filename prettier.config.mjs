/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  printWidth: 120,
  bracketSpacing: true,
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  importOrder: [
    "^(node:(.*)$)",
    "",
    "^(constructs$)",
    "^(aws-cdk-lib/(.*)$)|^(aws-cdk-lib$)",
    "",
    "^(@middy/(.*)$)",
    "",
    "^(@aws-sdk/(.*)$)",
    "",
    "^(@aws-lambda-powertools/(.*)$)",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^~/(.*)$",
    "",
    "^[./]",
  ],
  importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
  importOrderTypeScriptVersion: "5.0.0",
  importOrderCaseSensitive: false,
};

export default config;
