import { ActionFormData } from '@minecraft/server-ui';

import type { Player } from '@minecraft/server';

export async function showSettings(player: Player) {
  const form = new ActionFormData()
    .title('discord-mcbe settings')

  const res = await form.show(player);
  if (res.canceled) return;
}
