import { defineConfig } from './packages/internal-config/vite/vite.config.base.mts';

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
});
