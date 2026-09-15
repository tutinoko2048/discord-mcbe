import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchWithRetry } from './fetch';
import { install, shouldUpdate } from './install';
import { downloadLauncher, replaceLauncher, upgradeLauncher, verifyLauncherChecksum } from './upgrade';
import { findLauncherUpgrade, resolveVersion } from './version';

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

describe('findLauncherUpgrade', () => {
  test('selects the newest launcher asset for the current target', async () => {
    const fetchMock = mock().mockResolvedValueOnce(
      Response.json([
        {
          tag_name: 'launcher@v5',
          prerelease: false,
          assets: [
            {
              name: 'discord-mcbe-updater-windows-x64-v5.exe',
              browser_download_url: 'https://example.com/v5',
              digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              size: 5,
            },
          ],
        },
        {
          tag_name: 'launcher@v4',
          prerelease: false,
          assets: [
            {
              name: 'discord-mcbe-updater-windows-x64-v4.exe',
              browser_download_url: 'https://example.com/v4',
              digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
              size: 4,
            },
          ],
        },
        {
          tag_name: 'launcher@v3',
          prerelease: false,
          assets: [
            {
              name: 'discord-mcbe-updater-windows-x64-v3.exe',
              browser_download_url: 'https://example.com/v3',
            },
          ],
        },
      ]),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await findLauncherUpgrade('windows-x64')).toEqual({
      version: 5,
      assetUrl: 'https://example.com/v5',
      digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      size: 5,
    });
  });

  test('rejects a requested version without a self-update asset', async () => {
    globalThis.fetch = mock().mockResolvedValueOnce(
      Response.json([{ tag_name: 'launcher@v2', prerelease: false, assets: [] }]),
    ) as unknown as typeof fetch;

    let error: unknown;
    try {
      await findLauncherUpgrade('windows-x64', 2);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('has no self-update asset');
  });
});

describe('upgradeLauncher', () => {
  test('downloads and verifies an exact version during a dry run', async () => {
    const platform = process.platform === 'win32' ? 'windows' : process.platform;
    const extension = process.platform === 'win32' ? '.exe' : '';
    const data = new Uint8Array([1, 2, 3]);
    globalThis.fetch = mock()
      .mockResolvedValueOnce(
        Response.json([
          {
            tag_name: 'launcher@v4',
            prerelease: false,
            assets: [
              {
                name: `discord-mcbe-updater-${platform}-${process.arch}-v4${extension}`,
                browser_download_url: 'https://example.com/v4',
                digest: 'sha256:039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81',
                size: data.byteLength,
              },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(new Response(data)) as unknown as typeof fetch;
    const log = spyOn(console, 'log').mockImplementation(() => {});

    try {
      await upgradeLauncher({ version: '4', dryRun: true, interactive: false });
      expect(
        log.mock.calls
          .flat()
          .map(String)
          .some((message) => message.includes('downloaded and verified')),
      ).toBe(true);
    } finally {
      log.mockRestore();
    }
  });
});

describe('downloadLauncher', () => {
  test('downloads the expected number of bytes', async () => {
    globalThis.fetch = mock().mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3])),
    ) as unknown as typeof fetch;
    expect(await downloadLauncher('https://example.com/updater', 3)).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe('verifyLauncherChecksum', () => {
  test('accepts a GitHub asset digest', () => {
    expect(() =>
      verifyLauncherChecksum(
        new Uint8Array([1, 2, 3]),
        'sha256:039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81',
      ),
    ).not.toThrow();
  });

  test('rejects a mismatched SHA-256 checksum', () => {
    expect(() => verifyLauncherChecksum(new Uint8Array([1, 2, 3]), `sha256:${'0'.repeat(64)}`)).toThrow(
      'Launcher checksum does not match.',
    );
  });
});

describe('replaceLauncher', () => {
  test('restores the current launcher when installing the new one fails', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'discord-mcbe-launcher-swap-'));
    const current = join(cwd, 'updater');
    const next = join(cwd, 'missing');
    const previous = join(cwd, 'updater.old');
    await writeFile(current, 'current');

    try {
      let error: unknown;
      try {
        await replaceLauncher(current, next, previous);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(Error);
      expect(await Bun.file(current).text()).toBe('current');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
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
