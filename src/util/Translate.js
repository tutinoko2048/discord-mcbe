const dotlang = require('dotlang');

class Translate {
  /** @param {string} lang */
  constructor(lang) {
    this.templates = dotlang.parse(`lang/${lang}.lang`);
    this.defaultTemplates = dotlang.parse('lang/en_US.lang');
  }
  
  /** @param {string} key */
  getTemplate(key) {
    return this.templates.get(key) ?? this.defaultTemplates.get(key);
  }
  
  /**
   * @param {string} key
   * @param {any[]} values
   * @returns {string}
   */
  run(key, values = []) {
    const template = this.getTemplate(key);
    if (!template) return key;
    return this.replaceTemplates(template, values);
  }
  
  /**
   * @param {string} text
   * @param {any[]} values
   * @returns {string}
   * @private
   */
  replaceTemplates(text, values) {
    for (const index in values) {
      text = text.replace(new RegExp(`%${index}`, 'g'), values[index]);
    }
    return text;
  }
}

module.exports = Translate;