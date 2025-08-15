import { PlatformType } from '../enums';

export interface PlayerDescriptor {
  name: string;
  nameTag: string;
  uniqueId: string;
  platformType: PlatformType;
}