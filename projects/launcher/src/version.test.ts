import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchWithRetry } from './fetch';
import { install, shouldUpdate } from './install';
import { resolveVersion } from './version';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('resolveVersion', () => {
  test('stable falls back to beta when no stable release is available', async () => {
    const betaVersion = '4.0.0-beta.1';
    const fetchMock = mock()
      .mockResolvedValueOnce(
        Response.json([
          {
            tag_name: `v${betaVersion}`,
            prerelease: true,
            assets: [
              { name: '_assets.tar.gz', browser_download_url: 'https://example.com/assets' },
              { name: '_metadata.json', browser_download_url: 'https://example.com/metadata' },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ minimumLauncherVersion: 1 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const warn = spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const release = await resolveVersion('stable');

      expect(release.version).toBe(betaVersion);
      expect(release.isBeta).toBe(true);
      expect(warn).toHaveBeenCalledWith(
        `No stable release is available. Installing beta version ${betaVersion} instead.`,
      );
    } finally {
      warn.mockRestore();
    }
  });

  test('loads additional release pages', async () => {
    const launcherReleases = Array.from({ length: 100 }, (_, index) => ({
      tag_name: `launcher@v${index + 1}`,
      prerelease: false,
      assets: [],
    }));
    const fetchMock = mock()
      .mockResolvedValueOnce(Response.json(launcherReleases))
      .mockResolvedValueOnce(
        Response.json([
          {
            tag_name: 'v4.0.0',
            prerelease: false,
            assets: [
              { name: '_assets.tar.gz', browser_download_url: 'https://example.com/assets' },
              { name: '_metadata.json', browser_download_url: 'https://example.com/metadata' },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ minimumLauncherVersion: 1 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const release = await resolveVersion('stable');

    expect(release.version).toBe('4.0.0');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]![0])).toContain('page=1');
    expect(String(fetchMock.mock.calls[1]![0])).toContain('page=2');
  });

  test('rejects invalid launcher metadata', async () => {
    const fetchMock = mock()
      .mockResolvedValueOnce(
        Response.json([
          {
            tag_name: 'v4.0.0',
            prerelease: false,
            assets: [
              { name: '_assets.tar.gz', browser_download_url: 'https://example.com/assets' },
              { name: '_metadata.json', browser_download_url: 'https://example.com/metadata' },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ minimumLauncherVersion: '2' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    let error: unknown;
    try {
      await resolveVersion('stable');
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('minimumLauncherVersion');
  });
});

describe('fetchWithRetry', () => {
  test('retries transient HTTP failures', async () => {
    const fetchMock = mock()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response('ok'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const warn = spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const response = await fetchWithRetry('https://example.com', {}, 2);

      expect(await response.text()).toBe('ok');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('install output', () => {
  test('activates a staged app and keeps the previous app as backup', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'discord-mcbe-launcher-atomic-'));
    await mkdir(join(cwd, 'app'));
    await writeFile(join(cwd, 'app', '.VERSION'), '3.0.0');
    await writeFile(join(cwd, 'app', 'old-marker'), 'previous');
    const archive = new Bun.Archive(
      {
        'discord-mcbe.js': '',
        'package.json': JSON.stringify({ private: true }),
        '.VERSION': '4.0.0',
      },
      { compress: 'gzip' },
    );
    const fetchMock = mock()
      .mockResolvedValueOnce(
        Response.json([
          {
            tag_name: 'v4.0.0',
            prerelease: false,
            assets: [
              { name: '_assets.tar.gz', browser_download_url: 'https://example.com/assets' },
              { name: '_metadata.json', browser_download_url: 'https://example.com/metadata' },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ minimumLauncherVersion: 1 }))
      .mockResolvedValueOnce(new Response(await archive.bytes()));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const log = spyOn(console, 'log').mockImplementation(() => {});

    try {
      await install({ cwd, interactive: false, version: 'stable' });

      expect(await Bun.file(join(cwd, 'app', '.VERSION')).text()).toBe('4.0.0');
      expect(await Bun.file(join(cwd, 'app.backup', '.VERSION')).text()).toBe('3.0.0');
      expect(await Bun.file(join(cwd, 'app.backup', 'old-marker')).text()).toBe('previous');
      expect(await Bun.file(join(cwd, 'app.update', '.VERSION')).exists()).toBe(false);
    } finally {
      log.mockRestore();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test('dry run does not report a successful installation or create app', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'discord-mcbe-launcher-dry-run-'));
    const archive = new Bun.Archive(
      {
        'discord-mcbe.js': '',
        'package.json': '{}',
        '.VERSION': '4.0.0',
      },
      { compress: 'gzip' },
    );
    const fetchMock = mock()
      .mockResolvedValueOnce(
        Response.json([
          {
            tag_name: 'v4.0.0',
            prerelease: false,
            assets: [
              { name: '_assets.tar.gz', browser_download_url: 'https://example.com/assets' },
              { name: '_metadata.json', browser_download_url: 'https://example.com/metadata' },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ minimumLauncherVersion: 1 }))
      .mockResolvedValueOnce(new Response(await archive.bytes()));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const log = spyOn(console, 'log').mockImplementation(() => {});

    try {
      await install({ cwd, dryRun: true, interactive: false, version: 'stable' });

      const messages = log.mock.calls.flat().map(String);
      expect(messages.some((message) => message.includes('Dry run complete'))).toBe(true);
      expect(messages.some((message) => message.includes('Successfully installed'))).toBe(false);
      expect(messages.some((message) => message.includes('Application is extracted'))).toBe(false);
      expect(await Bun.file(join(cwd, 'app', '.VERSION')).exists()).toBe(false);
    } finally {
      log.mockRestore();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test('describes a channel change instead of saying it is up to date', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'discord-mcbe-launcher-channel-'));
    await mkdir(join(cwd, 'app'));
    await writeFile(join(cwd, 'app', '.VERSION'), '4.0.0-beta.1');
    const fetchMock = mock()
      .mockResolvedValueOnce(
        Response.json([
          {
            tag_name: 'v4.0.0',
            prerelease: false,
            assets: [
              { name: '_assets.tar.gz', browser_download_url: 'https://example.com/assets' },
              { name: '_metadata.json', browser_download_url: 'https://example.com/metadata' },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ minimumLauncherVersion: 1 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const log = spyOn(console, 'log').mockImplementation(() => {});

    try {
      await install({ cwd, interactive: false, version: 'stable' });

      const messages = log.mock.calls.flat().map(String);
      expect(messages.some((message) => message.includes('Changing release channel'))).toBe(true);
      expect(messages.some((message) => message.includes('up to date'))).toBe(false);
    } finally {
      log.mockRestore();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test('describes a downgrade instead of saying it is up to date', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'discord-mcbe-launcher-downgrade-'));
    await mkdir(join(cwd, 'app'));
    await writeFile(join(cwd, 'app', '.VERSION'), '4.1.0');
    const fetchMock = mock()
      .mockResolvedValueOnce(
        Response.json([
          {
            tag_name: 'v4.0.0',
            prerelease: false,
            assets: [
              { name: '_assets.tar.gz', browser_download_url: 'https://example.com/assets' },
              { name: '_metadata.json', browser_download_url: 'https://example.com/metadata' },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ minimumLauncherVersion: 1 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const log = spyOn(console, 'log').mockImplementation(() => {});

    try {
      await install({ cwd, interactive: false, version: '4.0.0' });

      const messages = log.mock.calls.flat().map(String);
      expect(messages.some((message) => message.includes('is not newer'))).toBe(true);
      expect(messages.some((message) => message.includes('up to date'))).toBe(false);
    } finally {
      log.mockRestore();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test('keeps the current app when the staged version is invalid', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'discord-mcbe-launcher-invalid-archive-'));
    await mkdir(join(cwd, 'app'));
    await writeFile(join(cwd, 'app', '.VERSION'), '3.0.0');
    const archive = new Bun.Archive(
      {
        'discord-mcbe.js': '',
        'package.json': '{}',
        '.VERSION': 'invalid',
      },
      { compress: 'gzip' },
    );
    const fetchMock = mock()
      .mockResolvedValueOnce(
        Response.json([
          {
            tag_name: 'v4.0.0',
            prerelease: false,
            assets: [
              { name: '_assets.tar.gz', browser_download_url: 'https://example.com/assets' },
              { name: '_metadata.json', browser_download_url: 'https://example.com/metadata' },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ minimumLauncherVersion: 1 }))
      .mockResolvedValueOnce(new Response(await archive.bytes()));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      let error: unknown;
      try {
        await install({ cwd, interactive: false, version: 'stable' });
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Invalid release archive version');
      expect(await Bun.file(join(cwd, 'app', '.VERSION')).text()).toBe('3.0.0');
      expect(await Bun.file(join(cwd, 'app.update', '.VERSION')).exists()).toBe(false);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('shouldUpdate', () => {
  test('stable-old -> stable-new = true', () => {
    expect(shouldUpdate('1.0.0', '1.1.0')).toBe(true);
  });

  test('stable-new -> stable-old = false', () => {
    expect(shouldUpdate('1.1.0', '1.0.0')).toBe(false);
  });

  test('beta-old -> beta-new = true', () => {
    expect(shouldUpdate('1.0.0-beta.1', '1.0.0-beta.2')).toBe(true);
  });

  test('beta-new -> beta-old = false', () => {
    expect(shouldUpdate('1.1.0-beta.2', '1.0.0-beta.1')).toBe(false);
  });

  test('beta-same -> stable-same = false', () => {
    expect(shouldUpdate('1.0.0-beta.1', '1.0.0')).toBe(false);
  });

  test('stable-same -> beta-same = false', () => {
    expect(shouldUpdate('1.0.0', '1.0.0-beta.1')).toBe(false);
  });

  test('beta-old -> stable-new = false', () => {
    expect(shouldUpdate('1.0.0-beta.1', '1.1.0')).toBe(false);
  });

  test('stable-old -> beta-new = false', () => {
    expect(shouldUpdate('1.0.0', '1.1.0-beta.1')).toBe(false);
  });

  test('beta-new -> stable-old = false', () => {
    expect(shouldUpdate('1.1.0-beta.1', '1.0.0')).toBe(false);
  });

  test('stable-new -> beta-old = false', () => {
    expect(shouldUpdate('1.1.0', '1.0.0-beta.1')).toBe(false);
  });

  test('same stable versions = false', () => {
    expect(shouldUpdate('1.0.0', '1.0.0')).toBe(false);
  });

  test('same beta versions = false', () => {
    expect(shouldUpdate('1.0.0-beta.1', '1.0.0-beta.1')).toBe(false);
  });
});
