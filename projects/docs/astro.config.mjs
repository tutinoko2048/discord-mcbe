// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeRapide from 'starlight-theme-rapide';
import Icons from 'unplugin-icons/vite';
import { DISCORD_URL } from './src/variables';

// Pagefind's Linux ARM64 binary does not support hosts with a 16 KiB page size.
const supportsPagefind = process.platform !== 'linux' || process.arch !== 'arm64';

// https://astro.build/config
export default defineConfig({
  site: 'https://discord-mcbe.retomc.dev',
  integrations: [
    starlight({
      title: 'discord-mcbe',
      description: 'Minecraft Bedrock EditionとDiscordをつなぐdiscord-mcbeの公式ドキュメント',
      favicon: '/favicon.png',
      logo: {
        src: '../addon-local/pack_icon.png',
        alt: 'discord-mcbe',
      },
      head: [
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://discord-mcbe.retomc.dev/thumbnail.webp',
          },
        },
        {
          tag: 'script',
          content:
            "if (localStorage.getItem('starlight-theme') === null) localStorage.setItem('starlight-theme', 'dark');",
        },
      ],
      locales: {
        root: { label: '日本語', lang: 'ja' },
        en: { label: 'English', lang: 'en' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/tutinoko2048/discord-mcbe' },
        { icon: 'discord', label: 'Discord', href: DISCORD_URL },
      ],
      sidebar: [
        {
          label: '導入',
          translations: { en: 'Installation' },
          items: [
            {
              label: 'Botの準備',
              translations: { en: 'Setup bot' },
              slug: 'installation/setup-bot',
            },
            {
              label: 'Minecraftワールドの準備',
              translations: { en: 'Setup Minecraft world' },
              slug: 'installation/setup-world',
            },
          ],
        },
        {
          label: '使い方',
          translations: { en: 'Guides' },
          items: [
            {
              label: '機能とコマンド',
              translations: { en: 'Features and commands' },
              slug: 'guides/commands',
            },
            {
              label: '設定',
              translations: { en: 'Configuration' },
              slug: 'guides/configuration',
            },
            {
              label: '翻訳とテキストのカスタマイズ',
              translations: { en: 'Translations and text customization' },
              slug: 'guides/translation-overrides',
            },
            {
              label: 'トラブルシューティング',
              translations: { en: 'Troubleshooting' },
              slug: 'guides/troubleshooting',
            },
            {
              label: 'ランチャー',
              translations: { en: 'Launcher' },
              slug: 'guides/launcher',
            },
          ],
        },
        {
          label: '開発者向け',
          translations: { en: 'For developers' },
          items: [
            {
              label: 'カスタムスクリプト',
              translations: { en: 'Custom scripts' },
              slug: 'guides/custom-scripts',
            },
            {
              label: '他のアドオンとの連携機能',
              translations: { en: 'Integration with other addons' },
              slug: 'guides/addon-integration',
            },
            {
              label: 'APIリファレンス',
              translations: { en: 'API reference' },
              link: '/reference/',
            },
          ],
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/tutinoko2048/discord-mcbe/edit/main/projects/docs/',
      },
      lastUpdated: true,
      pagefind: supportsPagefind,
      plugins: [starlightThemeRapide()],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
  vite: {
    plugins: [Icons({ compiler: 'astro' })],
  },
});
