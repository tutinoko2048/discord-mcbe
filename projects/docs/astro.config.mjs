// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeRapide from 'starlight-theme-rapide';

// Pagefind's Linux ARM64 binary does not support hosts with a 16 KiB page size.
const supportsPagefind = process.platform !== 'linux' || process.arch !== 'arm64';

// https://astro.build/config
export default defineConfig({
  site: 'https://discord-mcbe.tn2048.workers.dev',
  integrations: [
    starlight({
      title: 'discord-mcbe',
      description: 'Minecraft Bedrock EditionとDiscordをつなぐdiscord-mcbeの公式ドキュメント',
      favicon: '/favicon.png',
      logo: {
        src: '../addon-local/pack_icon.png',
        alt: 'discord-mcbe',
      },
      locales: {
        root: { label: '日本語', lang: 'ja' },
        en: { label: 'English', lang: 'en' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/tutinoko2048/discord-mcbe' },
        { icon: 'discord', label: 'Discord', href: 'https://discord.gg/XGR8FcCeFc' },
      ],
      sidebar: [
        {
          label: '導入',
          translations: { en: 'Installation' },
          items: [
            {
              label: 'Botとサーバー',
              translations: { en: 'Bot and server' },
              slug: 'installation/setup-bot',
            },
            {
              label: 'Minecraftワールド',
              translations: { en: 'Minecraft world' },
              slug: 'installation/setup-world',
            },
          ],
        },
        {
          label: '使い方',
          translations: { en: 'Guides' },
          items: [
            {
              label: '設定',
              translations: { en: 'Configuration' },
              slug: 'guides/configuration',
            },
            {
              label: 'コマンドと機能',
              translations: { en: 'Commands and features' },
              slug: 'guides/commands',
            },
            {
              label: '翻訳とテキストのカスタマイズ',
              translations: { en: 'Translations and text customization' },
              slug: 'guides/translation-overrides',
            },
            {
              label: 'カスタムスクリプト',
              translations: { en: 'Custom scripts' },
              slug: 'guides/custom-scripts',
            },
            {
              label: 'トラブルシューティング',
              translations: { en: 'Troubleshooting' },
              slug: 'guides/troubleshooting',
            },
          ],
        },
        {
          label: '開発',
          translations: { en: 'Development' },
          items: [
            {
              label: '開発ガイド',
              translations: { en: 'Development guide' },
              slug: 'development',
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
});
