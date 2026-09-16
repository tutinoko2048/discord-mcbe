import { IPC, PROTO } from 'mcbe-ipc';
import { ActionId, type DiscordMessageJSON } from '@discord-mcbe/shared';

import type { IBridgeClient } from '../../transport/interfaces';

export function registerIpc(bridge: IBridgeClient): void {
  IPC.handle('dmc:ping', PROTO.Void, PROTO.Boolean, () => bridge.isConnected);

  IPC.on('dmc:send_message', PROTO.String, (json) => {
    if (!bridge.isConnected) return;

    let payload: unknown;
    try {
      payload = JSON.parse(json);
    } catch {
      return;
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return;

    const { source, message } = payload as Record<string, unknown>;
    if (typeof source !== 'string' || source.length === 0) return;
    if (typeof message !== 'object' || message === null || Array.isArray(message)) return;

    bridge.notify({
      type: ActionId.DiscordSend,
      data: { source, message: message as DiscordMessageJSON },
    });
  });
}
