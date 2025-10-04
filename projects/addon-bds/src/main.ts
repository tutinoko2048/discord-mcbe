import { world } from '@minecraft/server';
import { BridgeClient } from '@discord-mcbe/client';

const client = new BridgeClient();

world.afterEvents.worldLoad.subscribe(() => {
  client.start().catch((error) => {
    console.error(error);
  });
});
