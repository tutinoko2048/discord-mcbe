# Contributing to discord-mcbe

Bug fixes, features, documentation, and translation improvements are welcome. Check existing issues and pull requests before starting.

## Translations

Bot messages, command descriptions, and Minecraft chat text live in `projects/server/src/assets/locales/<locale>.json`. Use `en-US.json` as the reference for keys and placeholders (`%0`, `%1`, and so on). A value consisting entirely of `$key` reuses another translation key. Keep placeholder numbering consistent across languages.

Files named `<locale>.generated.json` contain Minecraft death messages and entity names extracted from Mojang language files. Do not edit them by hand. See the [translation guide](https://discord-mcbe.retomc.dev/en/guides/translation-overrides/) for the difference between source translations, generated text, and user overrides.

To add a language, create its JSON file, then register it in `projects/server/src/util/i18n.ts` so the server loads it. Use a Discord locale code for the filename and map entry. If you also need Minecraft-derived text, add the corresponding Bedrock language file to `projects/server/scripts/extract-minecraft-lang.ts` and run the extraction script. When keys or locales change, regenerate the language types and configuration schema:

```bash
pnpm --filter @discord-mcbe/server generate-lang-types
pnpm --filter @discord-mcbe/server generate-schema
```

## Development

Use Node.js 24 or later, Bun 1.4.0 or later, Git, and the pnpm version declared in `package.json`.

```bash
git clone https://github.com/tutinoko2048/discord-mcbe.git
cd discord-mcbe
pnpm install
pnpm build
pnpm check
pnpm --filter @discord-mcbe/launcher test
```

This is a pnpm workspace built with Turbo. The main directories are:

| Path                       | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `projects/server`          | Discord bot and Minecraft connection server |
| `projects/addon-local`     | Behavior pack for regular worlds            |
| `projects/addon-bds`       | Behavior pack for Bedrock Dedicated Server  |
| `projects/launcher`        | Installer and updater                       |
| `projects/docs`            | Documentation website                       |
| `packages/client`          | Script API client used by the add-ons       |
| `packages/shared`          | Shared protocol code and types              |
| `packages/internal-config` | Shared build and check configuration        |
| `devapp`                   | Local development environment               |

Run `pnpm lint` to lint the workspace or `pnpm format` to format it. For documentation work, use `pnpm --filter @discord-mcbe/docs dev` to preview the site. Update both Japanese and English documentation when behavior changes.

## Pull requests

Explain the change and its reason, link a related issue when there is one, and report the builds, checks, and tests you ran. Include screenshots for visible UI or Discord output changes.

Maintainers: App and Launcher releases use separate tag-triggered workflows. Follow the [release procedure](./docs/releasing.md) for versions, annotated tags, draft verification, and recovery.

Contributions are licensed under the project's [MIT License](./LICENSE). For questions, join the [Discord support server](https://discord.gg/XGR8FcCeFc).
