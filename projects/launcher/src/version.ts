import select from '@inquirer/select';

// fetch version from GitHub
const REPOSITORY = 'tutinoko2048/discord-mcbe';
const METADATA_BRANCH = 'rewrite'; //'metadata';
const METADATA_FILE = 'package.json'; //'versions.json';

const API_URL = `https://raw.githubusercontent.com/${REPOSITORY}/refs/heads/${METADATA_BRANCH}/${METADATA_FILE}`;

export interface Release {
  version: string;
  asset_url: string;
  beta?: boolean;
}

interface ReleaseList {
  latest: Release;
  latestBeta: Release;
  releases: Release[];
}

export async function fetchReleaseList(): Promise<ReleaseList> {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch version: ${res.status} ${res.statusText}`);
  }
  // return (await res.json()) as ReleaseList;
  return {
    latest: {
      version: '0.0.0',
      asset_url: 'https://example.com/asset.zip',
    },
    latestBeta: {
      version: '0.0.0-beta',
      asset_url: 'https://example.com/asset.zip',
      beta: true,
    },
    releases: [
      {
        version: '0.0.0',
        asset_url: 'https://example.com/asset.zip',
      },
      {
        version: '0.0.0-beta',
        asset_url: 'https://example.com/asset.zip',
        beta: true,
      },
    ],
  };
}

export async function resolveVersion(tag: string): Promise<Release> {
  const releaseList = await fetchReleaseList();

  if (tag === 'latest') return releaseList.latest;
  if (tag === 'beta') return releaseList.latestBeta;

  const release = releaseList.releases.find((r) => r.version === tag);
  if (!release) throw new Error(`Version ${tag} not found`);

  return release;
}

export async function askVersion(): Promise<Release> {
  const releaseList = await fetchReleaseList();

  try {
    const selected = await select({
      message: 'Select a version',
      choices: [
        { name: 'Latest', value: releaseList.latest },
        { name: 'Beta', value: releaseList.latestBeta },
        { name: 'Other versions', value: null },
      ],
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
