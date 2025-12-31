import type { RawMessage } from '@minecraft/server';
import type { ScriptPlayer } from './player';
import {
  ActionId,
  type SetTitleAction,
  type UpdateSubtitleAction,
  type SetActionBarAction,
  type TitleDisplayOptions,
} from '@discord-mcbe/shared';
import { ResponseErrorReason } from '@script-bridge/protocol';
import { BridgeActionError } from './errors';

export class ScreenDisplay {
  private readonly player: ScriptPlayer;

  constructor(player: ScriptPlayer) {
    this.player = player;
  }

  get isValid() {
    return this.player.isValid;
  }

  async setTitle(
    title: string | RawMessage | (string | RawMessage)[],
    options?: TitleDisplayOptions,
  ): Promise<void> {
    const res = await this.player.world.session.send<SetTitleAction>(ActionId.SetTitle, {
      playerUniqueId: this.player.uniqueId,
      title,
      options,
    });
    if (res.error) throw new BridgeActionError(res);
  }

  async updateSubtitle(subtitle: string | RawMessage | (string | RawMessage)[]): Promise<void> {
    const res = await this.player.world.session.send<UpdateSubtitleAction>(ActionId.UpdateSubtitle, {
      playerUniqueId: this.player.uniqueId,
      subtitle,
    });
    if (res.error) throw new BridgeActionError(res);
  }

  async setActionBar(text: string | RawMessage | (string | RawMessage)[]): Promise<void> {
    const res = await this.player.world.session.send<SetActionBarAction>(ActionId.SetActionBar, {
      playerUniqueId: this.player.uniqueId,
      text,
    });
    if (res.error) throw new BridgeActionError(res);
  }
}
