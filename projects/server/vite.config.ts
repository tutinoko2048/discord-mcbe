import { defineConfig } from '@discord-mcbe/internal-config/vite';

export default defineConfig({
  fmt: {
    ignorePatterns: ['src/types/lang.generated.ts', 'schema.config.json'],
  },
});
