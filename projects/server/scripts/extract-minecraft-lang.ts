import { join } from 'node:path';

const projectDir = join(import.meta.dir, '..');
const localeDir = join(projectDir, 'src/assets/locales');
const sourceRef = Bun.argv[2] ?? 'main';

const locales = [
  { source: 'en_US.lang', target: 'en-US' },
  { source: 'ja_JP.lang', target: 'ja' },
] as const;

const MINECRAFT_KEY_PREFIXES = ['death.attack.', 'death.fell.', 'entity.'];

for (const locale of locales) {
  const url = `https://raw.githubusercontent.com/Mojang/bedrock-samples/${sourceRef}/resource_pack/texts/${locale.source}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const source = await response.text();
  const extracted = extractTranslations(source);
  const basePath = join(localeDir, `${locale.target}.json`);
  const generatedPath = join(localeDir, `${locale.target}.generated.json`);
  const base = JSON.parse(await Bun.file(basePath).text()) as Record<string, string>;

  for (const key of extracted.keys()) delete base[key];

  await Bun.write(basePath, `${JSON.stringify(base, null, 2)}\n`);
  await Bun.write(generatedPath, `${JSON.stringify(Object.fromEntries(extracted), null, 2)}\n`);
  console.log(`Extracted ${extracted.size} entries into ${generatedPath}`);
}

function extractTranslations(source: string): Map<string, string> {
  const result = new Map<string, string>();

  for (const rawLine of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator);
    if (!MINECRAFT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;

    const value = line.slice(separator + 1);
    result.set(key, convertPlaceholders(value));
  }

  return result;
}

/** Convert Bedrock's %1$s placeholders to discord-mcbe's zero-based %0 format. */
function convertPlaceholders(value: string): string {
  return value.replace(/%(\d+)\$[a-zA-Z]/g, (_, index: string) => `%${Number(index) - 1}`);
}
