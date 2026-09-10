import { world } from '@minecraft/server';
import { BridgeClient, WORLD_NAME_DYNAMIC_PROPERTY_KEY } from '@discord-mcbe/client/bds';
import * as v from 'valibot';
import { getVariables } from './variable';

const VariablesSchema = v.object({
  BRIDGE_URL: v.optional(
    v.pipe(v.string(), v.nonEmpty(), v.regex(/^wss?:\/\//i, 'Expected a WebSocket URL'), v.url()),
  ),
  BRIDGE_TOKEN: v.optional(v.pipe(v.string(), v.nonEmpty())),
  DEFAULT_WORLD_NAME: v.optional(v.pipe(v.string(), v.nonEmpty())),
});

world.afterEvents.worldLoad.subscribe(() => {
  const parsedVariables = v.safeParse(VariablesSchema, getVariables());
  if (!parsedVariables.success) {
    console.error(
      '[discord-mcbe] Failed to launch discord-mcbe. Invalid variables provided:\n',
      JSON.stringify(parsedVariables.issues, null, 2),
    );
    return;
  }

  const vars = parsedVariables.output;

  const client = new BridgeClient({
    ...(vars.BRIDGE_URL ? { url: vars.BRIDGE_URL } : {}),
    ...(vars.BRIDGE_TOKEN ? { token: vars.BRIDGE_TOKEN } : {}),
    worldName: vars.DEFAULT_WORLD_NAME
      ? () => {
          const worldName = world.getDynamicProperty(WORLD_NAME_DYNAMIC_PROPERTY_KEY);
          if (typeof worldName === 'string') return worldName;
          return vars.DEFAULT_WORLD_NAME;
        }
      : undefined,
  });

  client.start().catch((error) => {
    console.error(error);
  });
});
