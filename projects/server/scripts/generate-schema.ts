import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { configSchema } from '../src/types/config';

const jsonSchema = configSchema.toJSONSchema();

const targetPath = join(__dirname, '../schema.config.json');

console.log('ConfigSchema has generated at', targetPath);

writeFileSync(targetPath, JSON.stringify(jsonSchema, null, 2));
