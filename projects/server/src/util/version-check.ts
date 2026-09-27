import semver from 'semver';

const REPOSITORY = 'tutinoko2048/discord-mcbe';
const RELEASES_API_URL = `https://api.github.com/repos/${REPOSITORY}/releases`;
const RELEASES_PER_PAGE = 100;

interface GitHubRelease {
  tag_name: string;
  prerelease: boolean;
}

interface AvailableUpdate {
  name: 'discord-mcbe' | 'discord-mcbe launcher';
  currentVersion: string;
  latestVersion: string;
  url: string;
}

function isGitHubRelease(value: unknown): value is GitHubRelease {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tag_name' in value &&
    typeof value.tag_name === 'string' &&
    'prerelease' in value &&
    typeof value.prerelease === 'boolean'
  );
}

export async function checkForUpdates(
  currentAppVersion: string,
  currentLauncherVersion?: number,
): Promise<AvailableUpdate[]> {
  if (!semver.valid(currentAppVersion)) throw new Error(`Invalid app version: ${currentAppVersion}`);

  const releases: GitHubRelease[] = [];
  for (let page = 1; ; page++) {
    const url = new URL(RELEASES_API_URL);
    url.searchParams.set('per_page', String(RELEASES_PER_PAGE));
    url.searchParams.set('page', String(page));

    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) throw new Error('Invalid releases response: expected an array');
    releases.push(...data.filter(isGitHubRelease));
    if (data.length < RELEASES_PER_PAGE) break;
  }

  const appIsPrerelease = semver.prerelease(currentAppVersion) !== null;
  const latestAppVersion = releases
    .filter((release) => !release.tag_name.startsWith('launcher@v'))
    .filter((release) => release.prerelease === appIsPrerelease)
    .map((release) => /^v(.+)$/.exec(release.tag_name)?.[1])
    .filter((version): version is string => version !== undefined)
    .filter((version) => semver.valid(version))
    .sort(semver.rcompare)[0];

  const updates: AvailableUpdate[] = [];
  if (latestAppVersion && semver.gt(latestAppVersion, currentAppVersion)) {
    updates.push({
      name: 'discord-mcbe',
      currentVersion: currentAppVersion,
      latestVersion: latestAppVersion,
      url: `https://github.com/${REPOSITORY}/releases/tag/v${latestAppVersion}`,
    });
  }

  if (currentLauncherVersion === undefined) return updates;

  const latestLauncherVersion = Math.max(
    currentLauncherVersion,
    ...releases
      .map((release) => /^launcher@v(\d+)$/.exec(release.tag_name)?.[1])
      .filter((version): version is string => version !== undefined)
      .map(Number)
      .filter(Number.isSafeInteger),
  );
  if (latestLauncherVersion > currentLauncherVersion) {
    updates.push({
      name: 'discord-mcbe launcher',
      currentVersion: String(currentLauncherVersion),
      latestVersion: String(latestLauncherVersion),
      url: `https://github.com/${REPOSITORY}/releases/tag/launcher@v${latestLauncherVersion}`,
    });
  }

  return updates;
}
