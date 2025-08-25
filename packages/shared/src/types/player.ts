import { PlatformType } from '../enums';
import { Branded } from './util';

export type UniqueId = Branded<string, 'UniqueId'>;

export interface PlayerDescriptor {
  name: string;
  nameTag: string;
  uniqueId: UniqueId;
  platformType: PlatformType;
}
