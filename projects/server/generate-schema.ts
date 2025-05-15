import { writeFileSync } from "node:fs";
import { join } from 'node:path';
import { zodToJsonSchema } from "zod-to-json-schema";
import { configSchema } from "./src/types/config";

const jsonSchema = zodToJsonSchema(configSchema);

const targetPath = join(__dirname, "schema.config.json");

console.log('ConfigSchema has generated at', targetPath);

writeFileSync(targetPath, JSON.stringify(jsonSchema, null, 2));
