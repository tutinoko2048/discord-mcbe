import { variables } from '@minecraft/server-admin';

export function getVariables(): Record<string, unknown> {
  const vars: Record<string, unknown> = {};
  for (const key of variables.names) {
    vars[key] = variables.get(key);
  }
  return vars;
}
