import * as dotlang from 'dotlang';

const FALLBACK_LANG = 'en_US';

let fallbackTemplates: Map<string, string>;
let templates: Map<string, string>;

export function initialize(lang: string) {
  fallbackTemplates = dotlang.parse(`lang/${FALLBACK_LANG}.lang`);
  templates = dotlang.parse(`lang/${lang}.lang`);
}

function translate(key: string, ...values: (string | number)[]): string {
  if (!fallbackTemplates || !templates) {
    throw new Error('Language templates are not initialized. Call initialize() first.');
  }

  const value = templates.get(key) ?? fallbackTemplates.get(key);
  if (!value) return key;

  return replaceTemplates(value, values);
}
export { translate as _t };

function replaceTemplates(text: string, values: (string | number)[]): string {
  let result = text;
  for (const index in values) {
    result = result.replace(new RegExp(`%${index}`, 'g'), values[index]!.toString());
  }
  return result;
}
