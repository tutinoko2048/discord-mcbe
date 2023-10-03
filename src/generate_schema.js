const tsj = require("ts-json-schema-generator");
const fs = require("node:fs");
const path = require("node:path");

/** @type {import('ts-json-schema-generator/dist/src/Config').Config} */
const config = {
  path: path.resolve(__dirname, "./types/index.d.ts"),
  tsconfig: path.resolve(__dirname, "../tsconfig.json"),
  type: "IConfig", // Or <type-name> if you want to generate schema for that one type only
};

const output_path = "src/schema.json";

const schema = tsj.createGenerator(config).createSchema(config.type);
const schemaString = JSON.stringify(schema, null, 2);
fs.writeFileSync(output_path, schemaString);
