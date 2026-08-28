import type { RawMessage, TitleDisplayOptions as MinecraftTitleDisplayOptions } from '@minecraft/server';
import type { BaseAction } from '../protocol';
import type { ActionId } from '../enums';
import type { UniqueId } from '../types';

export type TitleDisplayOptions = MinecraftTitleDisplayOptions;

export type SetTitleAction = BaseAction<
  ActionId.SetTitle,
  {
    playerUniqueId: UniqueId;
    title: string | RawMessage | (string | RawMessage)[];
    options?: TitleDisplayOptions;
  },
  void
>;
