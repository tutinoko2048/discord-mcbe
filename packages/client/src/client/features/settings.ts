import { ModalFormData } from '@minecraft/server-ui';

import type { Player } from '@minecraft/server';
import type { BaseClient } from '../base-client';

export class SettingsForm {
  private constructor(
    private readonly player: Player,
    private readonly client: BaseClient,
  ) {}

  static async show(player: Player, client: BaseClient) {
    const form = new SettingsForm(player, client);
    await form.main();
  }

  async main() {
    const form = new ModalFormData()
      .title('discord-mcbe settings')
      .textField('World Name', 'World Name', { defaultValue: this.client.getWorldName() });

    const res = await form.show(this.player);
    if (res.canceled || !res.formValues) return;

    const newWorldName = res.formValues[0] as string;

    this.client.setWorldName(newWorldName);
  }

  // async messageFilter() {}
}
