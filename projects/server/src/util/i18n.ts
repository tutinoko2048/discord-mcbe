import * as dotlang from 'dotlang';
import * as path from 'node:path';
import { Arg, LangArgs, LangKey } from '../types/lang.generated';
import { Locale, LocalizationMap } from 'discord.js';

const ROOT_DIR = __BUN_EXE__ ? path.join(process.cwd()) : path.join(process.cwd(), '../../');


const FALLBACK_LANG = 'en_US';

let templateMap: Map<string, Map<string, string>>;
let fallbackTemplates: Map<string, string>;
let templates: Map<string, string>;

export function initialize(lang: string) {
  const langDir = path.join(ROOT_DIR, 'lang');
  //TODO - Discord.jsのLocaleに合わせる
  templateMap = dotlang.parseDir(langDir);

  fallbackTemplates = templateMap.get(FALLBACK_LANG)!;
  if (!fallbackTemplates) throw new Error(`Invalid fallback language: ${FALLBACK_LANG}. Report this to the developer.`);

  templates = templateMap.get(lang)!;
  if (!templates) {
    console.warn(`Warning: Language "${lang}" not found. Falling back to ${FALLBACK_LANG}.`);
    templates = fallbackTemplates;
  }
}

function translate<K extends LangKey>(key: K, ...values: LangArgs[K]): string {
  if (!templateMap) {
    throw new Error('Language templates are not initialized. Call initialize() first.');
  }

  const value = templates.get(key) ?? fallbackTemplates.get(key);
  if (!value) return key;

  return replaceTemplates(value, values);
}

function getTranslationMap(key: LangKey): LocalizationMap {
  if (!templateMap) {
    throw new Error('Language templates are not initialized. Call initialize() first.');
  }

  const result: LocalizationMap = {};

  for (const [locale, langMap] of templateMap) {
    const value = langMap.get(key);
    if (value) {
      result[locale as Locale] = value;
    }
  }

  return result;
}

export { translate as _t, getTranslationMap as _tm };

function replaceTemplates(text: string, values: Arg[]): string {
  let result = text;
  for (const index in values) {
    result = result.replace(new RegExp(`%${index}`, 'g'), values[index]!.toString());
  }
  return result;
}
