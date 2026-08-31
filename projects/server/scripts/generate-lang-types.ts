import * as fs from 'node:fs';
import * as path from 'node:path';

const langDir = path.resolve(__dirname, '../src/assets/locales');
const targetPath = path.resolve(__dirname, '../src/types/lang.generated.ts');

console.log(`🚧 Generating lang types from ${langDir}...`);
const FALLBACK_LANG = 'en-US';
const langJson = {
  ...readJson(`${FALLBACK_LANG}.json`),
  ...readJson(`${FALLBACK_LANG}.generated.json`),
};
const langMap = new Map(Object.entries(langJson));

function readJson(file: string): Record<string, string> {
  return JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf-8')) as Record<string, string>;
}

/** "%0", "%1" ... の最大値 + 1 */
function countArgs(text: string): number {
  const matches = [...text.matchAll(/%(\d+)/g)];
  if (matches.length === 0) return 0;
  return Math.max(...matches.map((m) => Number(m[1]))) + 1;
}

/* ---------- Locale ---------- */
const locales = fs
  .readdirSync(langDir)
  .filter((file) => file.endsWith('.json') && !file.endsWith('.generated.json'))
  .map((file) => file.slice(0, -5));

/* ---------- flatten: key -> max arg count ---------- */
const argCountByKey = new Map<string, number>();

for (const [key, value] of langMap) {
  const count = countArgs(value as string);
  const prev = argCountByKey.get(key) ?? 0;
  argCountByKey.set(key, Math.max(prev, count));
}

const keys = [...argCountByKey.keys()].sort();

/* ---------- Locale type ---------- */
const localeType = `
export type Locale =
${locales.map((l) => `  | '${l}'`).join('\n')};
`;

/* ---------- LangArgs ---------- */
const langArgsType = `
export type LangArgs = {
${keys
  .map((key) => {
    const count = argCountByKey.get(key)!;
    const tuple = count === 0 ? '[]' : `[${Array(count).fill('Arg').join(', ')}]`;
    return `  '${key}': ${tuple};`;
  })
  .join('\n')}
};
`;

const output = `
// ⚠️ AUTO-GENERATED FILE
// DO NOT EDIT MANUALLY

export type Arg = string | number;

${localeType}

${langArgsType}

export type LangKey = keyof LangArgs;
`.trimStart();

fs.writeFileSync(targetPath, output, 'utf-8');
console.log(`✅ Generated lang types to ${targetPath}`);
