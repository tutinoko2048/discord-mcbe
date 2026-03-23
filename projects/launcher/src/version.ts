import select from '@inquirer/select';
import semver from 'semver';
import packageJson from '../package.json' with { type: 'json' };

const REPOSITORY = 'tutinoko2048/discord-mcbe';
const RELEASES_API_URL = `https://api.github.com/repos/${REPOSITORY}/releases`;
const CURRENT_LAUNCHER_VERSION = Number(packageJson.version);

export interface ReleaseMetadata {
  minimumLauncherVersion: number;
}

async function fetchMetadataFile(versionJsonAssetUrl: string): Promise<ReleaseMetadata> {
  const res = await fetch(versionJsonAssetUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch version metadata: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ReleaseMetadata;
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

export interface Release {
  version: string;
  assetFileUrl: string;
  metadataFileUrl: string;
  isBeta: boolean;
}

interface ReleaseList {
  releases: Release[];
  latest?: Release;
  latestBeta?: Release;
}

async function fetchReleaseList(): Promise<ReleaseList> {
  const res = await fetch(RELEASES_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch releases: ${res.status} ${res.statusText}`);
  }

  const rawReleases = await res.json() as GitHubRelease[];

  const releases: Release[] = [];
  for (const release of rawReleases) {
    if (release.tag_name.startsWith('launcher@v')) continue;

    const version = release.tag_name.replace(/^v/, '');
    const assetFile = release.assets.find(a => a.name.startsWith('discord-mcbe-'));
    const metadataFile = release.assets.find((a) => a.name.endsWith('.json'));
    if (!assetFile || !metadataFile) continue;

    releases.push({
      version,
      assetFileUrl: assetFile.browser_download_url,
      metadataFileUrl: metadataFile.browser_download_url,
      isBeta: release.prerelease,
    });
  }

  releases.sort((a, b) => semver.compare(b.version, a.version));

  return {
    releases,
    latest: releases.find(r => !r.isBeta),
    latestBeta: releases.find(r => r.isBeta),
  };
}


export async function resolveVersion(tag: string): Promise<Release> {
  const releaseList = await fetchReleaseList();
  let resolvedRelease: Release | undefined;

  if (tag === 'latest') {
    resolvedRelease = releaseList.latest;
    if (!resolvedRelease) throw new Error('No stable release found');
  } else if (tag === 'beta') {
    resolvedRelease = releaseList.latestBeta;
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

  const { latest, latestBeta } = releaseList;

  try {
    const selected = await select({
      message: 'Select a version',
      choices: [
        latest && { name: `Latest (${latest.version})`, value: latest },
        latestBeta && { name: `Beta (${latestBeta.version})`, value: latestBeta },
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
