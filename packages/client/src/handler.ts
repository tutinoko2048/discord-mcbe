import { world } from '@minecraft/server';
import type { ScriptBridgeClient } from '@script-bridge/client';
import {
  ActionId,
  type SendMessageAction,
} from '@discord-mcbe/shared';

export function registerHandlers(bridge: ScriptBridgeClient) {
  bridge.registerHandler<SendMessageAction>(ActionId.SendMessage, (action) => {
    const { message } = action.data;
    world.sendMessage(message);
    action.respond();
  });
}