// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeRapide from 'starlight-theme-rapide';

// https://astro.build/config
export default defineConfig({
  site: 'https://discord-mcbe.tn2048.workers.dev',
  integrations: [
    starlight({
      title: 'discord-mcbe docs',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/tutinoko2048/discord-mcbe' }],
      sidebar: [
        {
          label: 'Installation',
          items: [
            { label: 'Setup Bot', slug: 'installation/setup-bot' },
            { label: 'Setup World', slug: 'installation/setup-world' },
          ],
        },
        {
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Example Guide', slug: 'guides/example' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Reference', link: '/reference' },
          ],
        },
      ],
      plugins: [starlightThemeRapide()],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
