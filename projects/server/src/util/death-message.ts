import type { EntityDamageCause as MinecraftEntityDamageCause } from '@minecraft/server';
import type { PlayerDieDamagingEntity } from '@discord-mcbe/shared';
import { _t, translateMinecraftKey } from './i18n';

type EntityDamageCause = `${MinecraftEntityDamageCause}`;

export interface DeathMessageData {
  playerName: string;
  cause: EntityDamageCause;
  damagingEntity?: PlayerDieDamagingEntity;
}

export function formatDeathMessage({ playerName, cause, damagingEntity }: DeathMessageData): string {
  const damagingEntityName = damagingEntity
    ? damagingEntity.isPlayer
      ? damagingEntity.name
      : translateMinecraftKey(damagingEntity.localizationKey, damagingEntity.nameTag ?? damagingEntity.typeId)
    : undefined;

  switch (cause) {
    case 'anvil':
      return _t('death.attack.anvil', playerName);
    case 'blockExplosion':
      return _t('death.attack.explosion', playerName);
    case 'campfire':
    case 'soulCampfire':
    case 'fire':
      return _t('death.attack.inFire', playerName);
    case 'drowning':
      return _t('death.attack.drown', playerName);
    case 'entityAttack':
    case 'ramAttack':
      if (!damagingEntityName) return _t('death.attack.generic', playerName);
      return damagingEntity?.isPlayer
        ? _t('death.attack.player', playerName, damagingEntityName)
        : _t('death.attack.mob', playerName, damagingEntityName);
    case 'entityExplosion':
      return damagingEntityName
        ? _t('death.attack.explosion.player', playerName, damagingEntityName)
        : _t('death.attack.explosion', playerName);
    case 'fall':
      return _t('death.attack.fall', playerName);
    case 'fallingBlock':
      return _t('death.attack.fallingBlock', playerName);
    case 'fireTick':
      return _t('death.attack.onFire', playerName);
    case 'fireworks':
      return _t('death.attack.fireworks', playerName);
    case 'flyIntoWall':
      return _t('death.attack.flyIntoWall', playerName);
    case 'freezing':
      return _t('death.attack.freeze', playerName);
    case 'lava':
      return _t('death.attack.lava', playerName);
    case 'lightning':
      return _t('death.attack.lightningBolt', playerName);
    case 'maceSmash':
      return damagingEntityName
        ? _t('death.attack.maceSmash.player', playerName, damagingEntityName)
        : _t('death.attack.generic', playerName);
    case 'magic':
      return damagingEntityName
        ? _t('death.attack.indirectMagic', playerName, damagingEntityName)
        : _t('death.attack.magic', playerName);
    case 'magma':
      return _t('death.attack.magma', playerName);
    case 'projectile':
      return damagingEntityName
        ? _t('death.attack.arrow', playerName, damagingEntityName)
        : _t('death.attack.generic', playerName);
    case 'sonicBoom':
      return _t('death.attack.sonicBoom', playerName);
    case 'stalactite':
      return _t('death.attack.stalactite', playerName);
    case 'stalagmite':
      return _t('death.attack.stalagmite', playerName);
    case 'starve':
      return _t('death.attack.starve', playerName);
    case 'suffocation':
      return _t('death.attack.inWall', playerName);
    case 'thorns':
      return damagingEntityName
        ? _t('death.attack.thorns', playerName, damagingEntityName)
        : _t('death.attack.generic', playerName);
    case 'void':
      return _t('death.attack.outOfWorld', playerName);
    case 'wither':
      return _t('death.attack.wither', playerName);
    case 'charging':
    case 'contact':
    case 'none':
    case 'override':
    case 'piston':
    case 'selfDestruct':
    case 'temperature':
      return _t('death.attack.generic', playerName);
    default:
      cause satisfies never;
      return _t('death.attack.generic', playerName);
  }
}
