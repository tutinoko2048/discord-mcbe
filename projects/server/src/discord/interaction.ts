import type { AutocompleteInteraction, ChatInputCommandInteraction, Client, Interaction } from 'discord.js';
import type { Application } from '../application';
import { ChatInputData } from './command';

export class InteractionManager {
  private readonly chatInputs = new Map<string, ChatInputData>();

  constructor(private readonly app: Application) {
  }

  async register(client: Client<true>) {
    const commands = (await import('./interactions')).default;
    await client.application.commands.set(
      commands.map((c) => c.data),
      this.app.env.GUILD_ID,
    );
    for (const command of commands) {
      this.chatInputs.set(command.data.name, command);
    }
  }

  async onInteractionCreate(interaction: Interaction<"cached">) {
    if (interaction.isChatInputCommand()) {
      await this.onChatInput(interaction);
    } else if (interaction.isAutocomplete()) {
      await this.onAutocomplete(interaction);
    }
  }

  private async onChatInput(interaction: ChatInputCommandInteraction<'cached'>) {
    const command = this.chatInputs.get(interaction.commandName);
    await command?.onExecute(interaction, this.app);
  }

  private async onAutocomplete(interaction: AutocompleteInteraction<'cached'>) {
    const command = this.chatInputs.get(interaction.commandName);
    await command?.onAutocomplete?.(interaction, this.app);
  }
}
