import { Locale, type LocalizationMap } from 'discord.js';
import { yellow } from 'colorette';

import type { Arg, LangArgs, LangKey } from '../types/lang.generated';

import enUS from '../assets/locales/en-US.json' with { type: 'json' };
import ja from '../assets/locales/ja.json' with { type: 'json' };

const templateMap = new Map<Locale, Record<string, string>>([
  [Locale.EnglishUS, enUS],
  [Locale.Japanese, ja],
]);

const FALLBACK_LANG = Locale.EnglishUS;
// biome-ignore lint/style/noNonNullAssertion: ok
const fallbackTemplates: Record<string, string> = templateMap.get(FALLBACK_LANG)!;
if (!fallbackTemplates)
  throw new Error(`Invalid fallback language: ${FALLBACK_LANG}. Report this to the developer.`);

let templates: Record<string, string> | undefined;

export function initialize(lang: string) {
  // load lang from internal asset
  templates = templateMap.get(lang as Locale);
  if (!templates) {
    console.warn(yellow(`[!] Language "${lang}" not found. Falling back to ${FALLBACK_LANG}.`));
    templates = fallbackTemplates;
  }

  // TODO: load lang from external override file
}

function translate<K extends LangKey>(key: K, ...values: LangArgs[K]): string {
  if (!templates) {
    throw new Error('Language templates are not initialized. Call initialize() first.');
  }

  const value = templates[key] ?? fallbackTemplates[key];
  if (!value) return key;

  return replaceTemplates(value, values);
}

function getTranslationMap(key: LangKey): LocalizationMap {
  if (!templates) {
    throw new Error('Language templates are not initialized. Call initialize() first.');
  }

  const result: LocalizationMap = {};

  for (const [locale, langMap] of templateMap) {
    const value = langMap[key];
    if (value) {
      result[locale] = value;
    }
  }

  return result;
}

export { translate as _t, getTranslationMap as _tm };

function replaceTemplates(text: string, values: Arg[]): string {
  let result = text;
  for (const [index, value] of values.entries()) {
    result = result.replace(new RegExp(`%${index}`, 'g'), value.toString());
  }
  return result;
}
