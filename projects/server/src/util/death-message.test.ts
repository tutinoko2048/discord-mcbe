import { beforeAll, describe, expect, test } from 'bun:test';
import { formatDeathMessage } from './death-message';
import { initialize } from './i18n';

describe('formatDeathMessage', () => {
  beforeAll(() => initialize('en-US', {}));

  test('formats direct and attacker-specific death causes', () => {
    expect(formatDeathMessage({ playerName: 'Steve', cause: 'fall' })).toBe('Steve hit the ground too hard');
    expect(
      formatDeathMessage({
        playerName: 'Steve',
        cause: 'entityAttack',
        damagingEntity: {
          isPlayer: true,
          name: 'Alex',
          nameTag: 'Alex',
          typeId: 'minecraft:player',
          localizationKey: 'entity.player.name',
        },
      }),
    ).toBe('Steve was slain by Alex');
    expect(
      formatDeathMessage({
        playerName: 'Steve',
        cause: 'entityAttack',
        damagingEntity: {
          isPlayer: false,
          typeId: 'minecraft:zombie',
          localizationKey: 'entity.zombie.name',
        },
      }),
    ).toBe('Steve was slain by Zombie');
  });

  test('falls back for unsupported or incomplete causes', () => {
    // @ts-expect-error: Testing fallback for unsupported cause
    expect(formatDeathMessage({ playerName: 'Steve', cause: 'futureCause' })).toBe('Steve died');
    expect(formatDeathMessage({ playerName: 'Steve', cause: 'projectile' })).toBe('Steve died');

    for (const cause of [
      'charging',
      'contact',
      'none',
      'override',
      'piston',
      'selfDestruct',
      'temperature',
    ] as const) {
      expect(formatDeathMessage({ playerName: 'Steve', cause })).toBe('Steve died');
    }
  });

  test('uses the configured language', () => {
    initialize('ja', {});
    expect(formatDeathMessage({ playerName: 'Steve', cause: 'fall' })).toBe('Steveは地面に強く激突した');
  });
});
