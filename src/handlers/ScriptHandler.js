const fs = require('fs');
const path = require('path');

class ScriptHandler {
  /** @param {import('../index')} main */
  constructor(main) {
    this.main = main;
  }
  
  load() {
    const entry = this.main.config.scripts_entry;
    if (!entry) return;
    const exists = fs.existsSync(path.resolve(__dirname, `../../${entry}`));
    if (!exists) throw Error(`[Script] entrypoint "${entry}" not found`);
    try {
      require(`../../${entry}`);
    } catch (e) {
      console.error('[Script]', e);
    }
  }
}

module.exports = { ScriptHandler };