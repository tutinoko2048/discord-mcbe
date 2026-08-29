import select from '@inquirer/select';
import semver from 'semver';
import packageJson from '../package.json' with { type: 'json' };
import { fetchWithRetry } from './fetch';

const REPOSITORY = 'tutinoko2048/discord-mcbe';
const RELEASES_API_URL = `https://api.github.com/repos/${REPOSITORY}/releases`;
const CURRENT_LAUNCHER_VERSION = Number(packageJson.version);
const RELEASES_PER_PAGE = 100;

if (!Number.isSafeInteger(CURRENT_LAUNCHER_VERSION) || CURRENT_LAUNCHER_VERSION < 0) {
  throw new Error(`Invalid launcher version: ${packageJson.version}`);
}

export interface ReleaseMetadata {
  minimumLauncherVersion: number;
}

async function fetchMetadataFile(versionJsonAssetUrl: string): Promise<ReleaseMetadata> {
  const res = await fetchWithRetry(versionJsonAssetUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch version metadata: ${res.status} ${res.statusText}`);
  }

  const metadata = (await res.json()) as unknown;
  const minimumLauncherVersion =
    typeof metadata === 'object' && metadata !== null && 'minimumLauncherVersion' in metadata
      ? metadata.minimumLauncherVersion
      : undefined;
  if (
    typeof minimumLauncherVersion !== 'number' ||
    !Number.isSafeInteger(minimumLauncherVersion) ||
    minimumLauncherVersion < 0
  ) {
    throw new Error('Invalid version metadata: minimumLauncherVersion must be a non-negative integer');
  }

  return { minimumLauncherVersion };
}

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

function isGitHubRelease(value: unknown): value is GitHubRelease {
  if (typeof value !== 'object' || value === null) return false;
  if (!('tag_name' in value) || typeof value.tag_name !== 'string') return false;
  if (!('prerelease' in value) || typeof value.prerelease !== 'boolean') return false;
  if (!('assets' in value) || !Array.isArray(value.assets)) return false;

  return value.assets.every(
    (asset) =>
      typeof asset === 'object' &&
      asset !== null &&
      'name' in asset &&
      typeof asset.name === 'string' &&
      'browser_download_url' in asset &&
      typeof asset.browser_download_url === 'string',
  );
}

export interface Release {
  version: string;
  assetsFileUrl: string;
  metadataFileUrl: string;
  isBeta: boolean;
}

interface ReleaseList {
  releases: Release[];
  stable?: Release;
  beta?: Release;
}

async function fetchReleaseList(): Promise<ReleaseList> {
  const rawReleases: GitHubRelease[] = [];
  for (let page = 1; ; page++) {
    const url = new URL(RELEASES_API_URL);
    url.searchParams.set('per_page', String(RELEASES_PER_PAGE));
    url.searchParams.set('page', String(page));

    const res = await fetchWithRetry(url.toString(), {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch releases: ${res.status} ${res.statusText}`);
    }

    const pageData = (await res.json()) as unknown;
    if (!Array.isArray(pageData)) {
      throw new Error('Invalid releases response: expected an array');
    }

    for (const release of pageData) {
      if (isGitHubRelease(release)) {
        rawReleases.push(release);
      } else {
        console.warn('Skipping an invalid release returned by GitHub');
      }
    }

    if (pageData.length < RELEASES_PER_PAGE) break;
  }

  const releases: Release[] = [];
  for (const release of rawReleases) {
    if (release.tag_name.startsWith('launcher@v')) continue;

    const version = release.tag_name.replace(/^v/, '');
    if (!semver.valid(version)) {
      console.warn(`Skipping release with invalid version tag: ${release.tag_name}`);
      continue;
    }
    const assetsFile = release.assets.find((a) => a.name === '_assets.tar.gz');
    const metadataFile = release.assets.find((a) => a.name === '_metadata.json');
    if (!assetsFile || !metadataFile) continue;

    releases.push({
      version,
      assetsFileUrl: assetsFile.browser_download_url,
      metadataFileUrl: metadataFile.browser_download_url,
      isBeta: release.prerelease,
    });
  }

  releases.sort((a, b) => semver.compare(b.version, a.version));

  return {
    releases,
    stable: releases.find((r) => !r.isBeta),
    beta: releases.find((r) => r.isBeta),
  };
}

export async function resolveVersion(tag: string): Promise<Release> {
  const releaseList = await fetchReleaseList();
  let resolvedRelease: Release | undefined;

  if (tag === 'stable') {
    if (releaseList.stable) {
      resolvedRelease = releaseList.stable;
    } else if (releaseList.beta) {
      resolvedRelease = releaseList.beta;
      console.warn(
        `No stable release is available. Installing beta version ${resolvedRelease.version} instead.`,
      );
    } else {
      throw new Error('No stable or beta release found');
    }
  } else if (tag === 'beta') {
    resolvedRelease = releaseList.beta;
    if (!resolvedRelease) throw new Error('No beta release found');
  } else {
    resolvedRelease = releaseList.releases.find((r) => r.version === tag);
    if (!resolvedRelease) throw new Error(`Version ${tag} not found`);
  }

  const { minimumLauncherVersion } = await fetchMetadataFile(resolvedRelease.metadataFileUrl);

  if (CURRENT_LAUNCHER_VERSION < minimumLauncherVersion) {
    throw new Error(
      `discord-mcbe@${resolvedRelease.version} requires discord-mcbe launcher v${minimumLauncherVersion} or higher. Please update the launcher to install this version. (current: v${CURRENT_LAUNCHER_VERSION})`,
    );
  }

  return resolvedRelease;
}

export async function askVersion(): Promise<Release> {
  const releaseList = await fetchReleaseList();
  if (releaseList.releases.length === 0) throw new Error('No available releases found');

  const { stable, beta } = releaseList;

  try {
    const selected = await select({
      message: 'Select a version',
      choices: [
        stable && { name: `Stable (${stable.version})`, value: stable },
        beta && { name: `Beta (${beta.version})`, value: beta },
        { name: 'Select versions', value: undefined },
      ].filter(Boolean),
    });

    if (selected) return selected;

    return await select({
      message: 'Select a version',
      choices: releaseList.releases.map((r) => ({
        name: r.version,
        value: r,
      })),
    });
  } catch (error) {
    if (!Error.isError(error)) throw error;
    if (error.name !== 'ExitPromptError') throw error;
    process.exit(1);
  }
}
