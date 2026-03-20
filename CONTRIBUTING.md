# Contributing to discord-mcbe

First off, thank you for considering contributing to discord-mcbe! 🎉
We are a welcoming open-source community, and we appreciate every contribution—whether it's fixing bugs, adding new features, improving documentation, or translating the project.

## 🌍 Help Us Translate! (Priority)

We are actively looking for help with translations to make discord-mcbe accessible to more users worldwide.

Translation files are located in the `lang/` directory.
We follow the **[Discord Locale Standards](https://discord.com/developers/docs/reference#locales)** for file naming (e.g., `ja.lang`, `en-US.lang`).

### How to Add a New Language
1.  Check the [Discord Locales](https://discord.com/developers/docs/reference#locales) list to find the correct code for your language.
2.  Create a new file in `lang/` named `<locale>.lang`.
3.  Copy the contents of `en-US.lang` (fallback language) into your new file.
4.  Translate the values (text after the `=`) into your language.
5.  Submit a Pull Request!

## 🛠️ Development Guide

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Bun](https://bun.sh/)
- [pnpm](https://pnpm.io/)

### Setup
1.  **Clone the repository**
    ```bash
    git clone https://github.com/tutinoko2048/discord-mcbe.git
    cd discord-mcbe
    ```
2.  **Install dependencies**
    ```bash
    pnpm install
    ```
3.  **Build the project**
    ```bash
    pnpm build
    ```

### Project Structure
This is a monorepo managed with pnpm workspaces:
- `projects/server`: Main application server
- `projects/addon-bds`: Minecraft addon for Bedrock Dedicated Server (BDS)
- `projects/addon-local`: Minecraft addon for local worlds
- `projects/launcher`: discord-mcbe launcher/installer application
- `packages/client`: Client library used by addons
- `packages/shared`: Shared utilities and types

## 🤝 How to Contribute Code

### Reporting Bugs
- Ensure the bug was not already reported.
- Open a new issue with a clear title and description.
- Include steps to reproduce, and details about your environment.

## 📜 License
By contributing, you agree that your contributions will be licensed under the project's [LICENSE](./LICENSE).

## 💬 Questions?
Feel free to join our [Discord Support Server](https://discord.gg/XGR8FcCeFc) if you have any questions.
