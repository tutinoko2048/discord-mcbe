export interface ReleaseAsset {
  downloadUrl: string;
  name: string;
  size: number;
}

interface GitHubRelease {
  assets?: Array<{
    browser_download_url?: unknown;
    name?: unknown;
    size?: unknown;
  }>;
}

const repository = 'tutinoko2048/discord-mcbe';
const releaseCache = new Map<string, Promise<Map<string, ReleaseAsset>>>();

async function fetchReleaseAssets(tag: string) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const response = await fetch(
      `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!response.ok) return new Map<string, ReleaseAsset>();

    const release = (await response.json()) as GitHubRelease;
    const assets = new Map<string, ReleaseAsset>();
    for (const asset of release.assets ?? []) {
      if (
        typeof asset.browser_download_url !== 'string' ||
        typeof asset.name !== 'string' ||
        typeof asset.size !== 'number'
      ) {
        continue;
      }
      assets.set(asset.name, {
        downloadUrl: asset.browser_download_url,
        name: asset.name,
        size: asset.size,
      });
    }
    return assets;
  } catch {
    return new Map<string, ReleaseAsset>();
  }
}

export function getReleaseAssets(tag: string) {
  const cached = releaseCache.get(tag);
  if (cached) return cached;

  const assets = fetchReleaseAssets(tag);
  releaseCache.set(tag, assets);
  return assets;
}

export function formatFileSize(bytes: number, locale: 'en' | 'ja') {
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  const unitIndex = Math.min(Math.floor(Math.log10(Math.max(bytes, 1)) / 3), units.length - 1);
  const value = bytes / 1000 ** unitIndex;
  const maximumFractionDigits = unitIndex === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  const number = new Intl.NumberFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    maximumFractionDigits,
  }).format(value);
  return `${number} ${units[unitIndex]}`;
}
