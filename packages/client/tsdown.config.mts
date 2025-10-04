import { defineConfig } from '@discord-mcbe/internal-config/tsdown';

const isDev = process.env.CI !== "true";

export default defineConfig({
  format: ['esm'],
}, isDev);
