import { writeFileSync } from "node:fs";
import { join } from 'node:path';
import { zodToJsonSchema } from "zod-to-json-schema";
import { configSchema } from "./types";

const jsonSchema = zodToJsonSchema(configSchema);

console.log('Schema generated');
writeFileSync(join(__dirname, "schema.config.json"), JSON.stringify(jsonSchema, null, 2));
