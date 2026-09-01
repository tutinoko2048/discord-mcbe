import { world } from '@minecraft/server';
import { BridgeClient, WORLD_NAME_DYNAMIC_PROPERTY_KEY } from '@discord-mcbe/client/bds';
import * as v from 'valibot';
import { getVariables } from './variable';

const VariablesSchema = v.object({
  BRIDGE_HOST: v.optional(v.pipe(v.string(), v.nonEmpty())),
  BRIDGE_PORT: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
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
    host: vars.BRIDGE_HOST,
    port: vars.BRIDGE_PORT,
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
