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
    const currentClientId = (this.player.getDynamicProperty('clientId') as string) ?? '';

    const form = new ModalFormData()
      .title('discord-mcbe settings')
      .textField('clientId', 'Client ID', { defaultValue: currentClientId });

    const res = await form.show(this.player);
    if (res.canceled || !res.formValues) return;

    const newClientId = res.formValues[0] as string;

    this.client.setClientId(newClientId);
  }

  // async messageFilter() {}
}
