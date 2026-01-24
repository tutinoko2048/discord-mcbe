import { CommandPermissionLevel, CustomCommandStatus, Player, system, type CustomCommandRegistry } from '@minecraft/server';
import { showSettings } from './features';

export function registerCommands(registry: CustomCommandRegistry) {
  for (const commandName of ['dmc:dmc', 'dmc:discord-mcbe']) {
    registry.registerCommand(
      {
        name: commandName,
        description: 'Open discord-mcbe settings',
        permissionLevel: CommandPermissionLevel.Admin,
      },
      (origin) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) {
          return { status: CustomCommandStatus.Failure, message: 'This command can only be used by players.' };
        }

        system.run(() => showSettings(player));

        return { status: CustomCommandStatus.Success };
      }
    );
  }

  if (__DEV__) console.log('[discord-mcbe] - Successfully registered commands.');
}
