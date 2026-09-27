import type { PlatformType } from '../enums';
import type { Branded } from './util';

export type UniqueId = Branded<string, 'UniqueId'>;
export type Pfid = Branded<string, 'Pfid'>;

export interface PlayerDescriptor {
  name: string;
  nameTag: string;
  uniqueId: UniqueId;
  pfid: Pfid;
  platformType: PlatformType;
}
