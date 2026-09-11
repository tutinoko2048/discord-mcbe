import { afterEach, expect, mock, test } from 'bun:test';
import { checkForUpdates } from './version-check';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('finds newer app and launcher releases', async () => {
  globalThis.fetch = mock().mockImplementation(() =>
    Promise.resolve(
      Response.json([
        { tag_name: 'v4.0.0-beta.8', prerelease: true },
        { tag_name: 'v4.0.0', prerelease: false },
        { tag_name: 'launcher@v4', prerelease: false },
      ]),
    ),
  ) as unknown as typeof fetch;

  expect(await checkForUpdates('4.0.0-beta.7', 3)).toEqual([
    expect.objectContaining({ name: 'discord-mcbe', latestVersion: '4.0.0-beta.8' }),
    expect.objectContaining({ name: 'discord-mcbe launcher', latestVersion: '4' }),
  ]);
  expect(await checkForUpdates('4.0.0', undefined)).toEqual([]);
});
