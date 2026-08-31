import { Locale, type LocalizationMap } from 'discord.js';
import { yellow } from 'colorette';

import type { Arg, LangArgs, LangKey } from '../types/lang.generated';

import enUS from '../assets/locales/en-US.json' with { type: 'json' };
import enUSGenerated from '../assets/locales/en-US.generated.json' with { type: 'json' };
import ja from '../assets/locales/ja.json' with { type: 'json' };
import jaGenerated from '../assets/locales/ja.generated.json' with { type: 'json' };

const templateMap = new Map<Locale, Record<string, string>>([
  [Locale.EnglishUS, { ...enUS, ...enUSGenerated }],
  [Locale.Japanese, { ...ja, ...jaGenerated }],
]);

const FALLBACK_LANG = Locale.EnglishUS;
const fallbackTemplates: Record<string, string> = templateMap.get(FALLBACK_LANG)!;
if (!fallbackTemplates)
  throw new Error(`Invalid fallback language: ${FALLBACK_LANG}. Report this to the developer.`);

let templates: Record<string, string> | undefined;

export function initialize(lang: string, overrides: Record<string, string>) {
  // load lang from internal asset
  templates = templateMap.get(lang as Locale);
  if (!templates) {
    console.warn(yellow(`[!] Language "${lang}" not found. Falling back to ${FALLBACK_LANG}.`));
    templates = fallbackTemplates;
  }

  // Apply translation overrides
  for (const [key, value] of Object.entries(overrides)) {
    if (templates) {
      templates[key] = value;
    }
  }
}

/**
 * Translate a language key to the corresponding string in the current language, replacing placeholders with the provided values.
 */
function translate<K extends LangKey>(key: K, ...values: LangArgs[K]): string {
  if (!templates) {
    throw new Error('Language templates are not initialized. Call initialize() first.');
  }

  const value = templates[key] ?? fallbackTemplates[key];
  if (!value) return key;

  return replaceTemplates(value, values);
}

/**
 * Get the translation map for a given language key. Used for discord localizations.
 */
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

export function translateMinecraftKey(key: string, fallback: string): string {
  if (!templates) {
    throw new Error('Language templates are not initialized. Call initialize() first.');
  }

  return templates[key] ?? fallbackTemplates[key] ?? fallback;
}

function replaceTemplates(text: string, values: Arg[]): string {
  let result = text;
  for (const [index, value] of values.entries()) {
    result = result.replace(new RegExp(`%${index}`, 'g'), value.toString());
  }
  return result;
}

export function getDefaultLocalizationKeys(): string[] {
  return Object.keys(fallbackTemplates);
}

export function getAvailableLanguages(): string[] {
  return Array.from(templateMap.keys());
}
