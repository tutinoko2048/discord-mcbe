import { afterAll, expect, it } from 'bun:test';
import { Locale } from 'discord.js';
import { _t, _tm, initialize, translateMinecraftKey } from './i18n';
import enUS from '../assets/locales/en-US.json' with { type: 'json' };
import ja from '../assets/locales/ja.json' with { type: 'json' };
import fr from '../assets/locales/fr.json' with { type: 'json' };

afterAll(() => {
  initialize(Locale.EnglishUS, enUS);
  initialize(Locale.Japanese, ja);
  initialize(Locale.French, fr);
});

it('resolves silent descriptions in each locale and Discord localizations', () => {
  const descriptions = [
    'command.help.silent.description',
    'command.list.silent.description',
    'command.command.silent.description',
  ] as const;

  for (const [locale, expected] of [
    [Locale.EnglishUS, 'Whether to send the result only to yourself'],
    [Locale.Japanese, '結果を自分のみに送信するかどうか'],
    [Locale.French, 'Afficher le résultat uniquement pour vous'],
  ] as const) {
    initialize(locale, {});
    for (const key of descriptions) expect(_t(key)).toBe(expected);
  }

  expect(_tm('command.help.silent.description')).toEqual({
    [Locale.EnglishUS]: 'Whether to send the result only to yourself',
    [Locale.Japanese]: '結果を自分のみに送信するかどうか',
    [Locale.French]: 'Afficher le résultat uniquement pour vous',
  });
});

it('resolves override chains and placeholders without changing other locales', () => {
  initialize(Locale.Japanese, {
    'command.help.silent.description': '$command.list.silent.description',
    'common.silent.description': '自分だけに表示',
    'discord.join': '$console.connect',
    'console.connect': '%0 came online',
  });

  expect(_t('command.help.silent.description')).toBe('自分だけに表示');
  expect(_tm('command.help.silent.description')[Locale.Japanese]).toBe('自分だけに表示');
  expect(_tm('command.help.silent.description')[Locale.EnglishUS]).toBe(
    'Whether to send the result only to yourself',
  );
  expect(_t('discord.join', 'Alex')).toBe('Alex came online');
  expect(translateMinecraftKey('discord.join', 'fallback')).toBe('%0 came online');

  initialize(Locale.EnglishUS, {});
  expect(_t('command.help.silent.description')).toBe('Whether to send the result only to yourself');
});

it('falls back to en-US for a referenced key missing in the selected locale', () => {
  initialize(Locale.French, { 'command.help.silent.description': '$command.list.description' });
  expect(_t('command.help.silent.description')).toBe('Displays the number of players connected to the world');
  expect(translateMinecraftKey('missing.key', 'fallback')).toBe('fallback');
});

it('reports missing and circular references with their key paths', () => {
  initialize(Locale.EnglishUS, { 'command.help.silent.description': '$missing.key' });
  expect(() => _t('command.help.silent.description')).toThrow(
    'Unknown translation reference: command.help.silent.description -> missing.key',
  );

  initialize(Locale.EnglishUS, {
    'command.help.silent.description': '$command.list.silent.description',
    'command.list.silent.description': '$command.help.silent.description',
  });
  expect(() => _t('command.help.silent.description')).toThrow(
    'Circular translation reference: command.help.silent.description -> command.list.silent.description -> command.help.silent.description',
  );
});
