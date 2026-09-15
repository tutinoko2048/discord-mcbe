import { IPC, PROTO } from 'mcbe-ipc';
import { ActionId, DISCORD_MESSAGE_MAX_LENGTH } from '@discord-mcbe/shared';

import type { IBridgeClient } from '../../transport/interfaces';

export function registerIpc(bridge: IBridgeClient): void {
  IPC.handle('dmc:ping', PROTO.Void, PROTO.Boolean, () => bridge.isConnected);

  IPC.on('dmc:send_message', PROTO.String, (message) => {
    if (!bridge.isConnected || message.length === 0 || message.length > DISCORD_MESSAGE_MAX_LENGTH) return;

    bridge.notify({
      type: ActionId.DiscordSend,
      data: { message },
    });
  });
}
