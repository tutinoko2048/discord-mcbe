import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
  SharedSlashCommand,
} from 'discord.js';
import type { Application } from '../application';

export interface ChatInputData {
  data: RESTPostAPIApplicationCommandsJSONBody;
  onExecute: (interaction: ChatInputCommandInteraction<'cached'>, app: Application) => Promise<void>;
  onAutocomplete?: (interaction: AutocompleteInteraction<'cached'>, app: Application) => Promise<void>;
}

export function defineCommand(
  data: SharedSlashCommand,
  onExecute: ChatInputData['onExecute'],
  onAutocomplete?: ChatInputData['onAutocomplete'],
): ChatInputData {
  return { data: data.toJSON(), onExecute, onAutocomplete };
}
