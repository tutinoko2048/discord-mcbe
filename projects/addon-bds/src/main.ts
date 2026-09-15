import { world } from '@minecraft/server';
import { variables } from '@minecraft/server-admin';
import { BridgeClient, WORLD_NAME_DYNAMIC_PROPERTY_KEY } from '@discord-mcbe/client/bds';
import * as v from 'valibot';

const VariablesSchema = v.object({
  BRIDGE_URL: v.optional(
    v.pipe(v.string(), v.nonEmpty(), v.regex(/^wss?:\/\//i, 'Expected a WebSocket URL'), v.url()),
  ),
  BRIDGE_TOKEN: v.optional(v.pipe(v.string(), v.nonEmpty())),
  DEFAULT_WORLD_NAME: v.optional(v.pipe(v.string(), v.nonEmpty())),
});

function initialize(): BridgeClient | undefined {
  const parsedVariables = v.safeParse(VariablesSchema, {
    BRIDGE_URL: variables.get('BRIDGE_URL'),
    BRIDGE_TOKEN: variables.get('BRIDGE_TOKEN'),
    DEFAULT_WORLD_NAME: variables.get('DEFAULT_WORLD_NAME'),
  } satisfies Record<keyof typeof VariablesSchema.entries, unknown>);
  if (!parsedVariables.success) {
    console.error(
      '[discord-mcbe] Failed to launch discord-mcbe. Invalid variables provided:\n',
      JSON.stringify(parsedVariables.issues, null, 2),
    );
    return;
  }

  const vars = parsedVariables.output;

  return new BridgeClient({
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
}

const client = initialize();

world.afterEvents.worldLoad.subscribe(() => {
  if (!client) return;
  client.start().catch((error) => {
    console.error(error);
  });
});
