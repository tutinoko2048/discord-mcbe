const REFERENCE = /^\$([A-Za-z0-9._-]+)$/;

export function resolveTranslation(
  key: string,
  translations: Record<string, string>,
  fallback: Record<string, string>,
  path: string[] = [],
): string | undefined {
  if (path.includes(key)) {
    throw new Error(`Circular translation reference: ${[...path, key].join(' -> ')}`);
  }

  const value = translations[key] ?? fallback[key];
  if (value === undefined) {
    if (path.length) throw new Error(`Unknown translation reference: ${[...path, key].join(' -> ')}`);
    return undefined;
  }

  const target = REFERENCE.exec(value)?.[1];
  return target ? resolveTranslation(target, translations, fallback, [...path, key]) : value;
}
