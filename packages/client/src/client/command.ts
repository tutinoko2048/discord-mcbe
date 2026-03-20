import {
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus,
  Player,
  system,
  type CustomCommandRegistry,
} from '@minecraft/server';
import { SettingsForm } from './features';
import type { BaseClient } from './base-client';

export function registerCommands(registry: CustomCommandRegistry, client: BaseClient) {
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
          return {
            status: CustomCommandStatus.Failure,
            message: 'This command can only be used by players.',
          };
        }

        system.run(() => SettingsForm.show(player, client));

        return { status: CustomCommandStatus.Success };
      },
    );
  }

  registry.registerCommand(
    {
      name: 'dmc:setid',
      description: 'Set the clientId for discord-mcbe (requires reconnect)',
      permissionLevel: CommandPermissionLevel.Host,
      mandatoryParameters: [
        {
          type: CustomCommandParamType.String,
          name: 'clientId',
        },
      ],
    },
    (_, clientId: string) => {
      client.setClientId(clientId);

      return { status: CustomCommandStatus.Success, message: `Updated clientId to "${clientId}".` };
    },
  );

  registry.registerCommand(
    {
      name: 'dmc:disconnect',
      description: 'Disconnect from discord-mcbe server',
      permissionLevel: CommandPermissionLevel.Admin,
    },
    () => {
      if (client.bridge.isConnected) {
        void client.bridge.disconnect();
        return { status: CustomCommandStatus.Success, message: 'Disconnecting from discord-mcbe server...' };
      } else {
        return { status: CustomCommandStatus.Failure, message: 'discord-mcbe is not connected now.' };
      }
    },
  );

  if (__DEV__) console.log('§7[discord-mcbe] -- Successfully registered commands.');
}
