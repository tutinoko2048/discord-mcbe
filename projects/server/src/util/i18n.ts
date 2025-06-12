import * as dotlang from 'dotlang';

let defaultTemplates: Map<string, string>;
let templates: Map<string, string>;

export function initialize(lang: string) {
  defaultTemplates = dotlang.parse('lang/en_US.lang');
  templates = dotlang.parse(`lang/${lang}.lang`);
}

function translate(key: string, ...values: (string | number)[]): string {
  const value = templates.get(key) ?? defaultTemplates.get(key);
  if (!value) return key;

  return replaceTemplates(value, values);
}
export { translate as _t };

function replaceTemplates(text: string, values: (string | number)[]): string {
  let result = text;
  for (const index in values) {
    result = result.replace(new RegExp(`%${index}`, 'g'), values[index].toString());
  }
  return result;
}
