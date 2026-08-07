export interface ReleaseTarget {
  id: string;
  platform: "macos" | "windows" | "linux";
  platformLabel: string;
  arch: "arm64" | "x64";
  archLabel: string;
  file: string;
  bytes: number;
  sha256: string | null;
  downloadUrl: string;
  checksumUrl: string | null;
}

interface GitHubReleaseAsset {
  name: string;
  size: number;
  digest?: string | null;
  browser_download_url: string;
}

export interface GitHubRelease {
  name: string | null;
  tag_name: string;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubReleaseAsset[];
}

export interface DetectedTarget {
  platform: "macos" | "windows" | "linux";
  arch: "arm64" | "x64" | null;
}

export interface AgentSupport {
  managedInstall: boolean;
  officialInstallGuide: boolean;
  managedConfig: boolean;
}

/* The product's repository, which is not this one. Actions sets
   GITHUB_REPOSITORY to the repository being built — this site — so reading it
   here pointed every CI and Pages build at MaimoryLab/OneAgent-site, which has
   no releases, and the download page rendered "not published yet" no matter what
   upstream had shipped. RELEASE_REPOSITORY overrides it for a fork that
   publishes its own builds. */
const repository = process.env.RELEASE_REPOSITORY || "MaimoryLab/OneAgent";
const releasesUrl = `https://api.github.com/repos/${repository}/releases?per_page=20`;
export const releasesPageUrl = `https://github.com/${repository}/releases`;
let releasesRequest: Promise<GitHubRelease[]> | undefined;

/**
 * Statuses that mean "this build cannot see the release feed", as opposed to
 * "the feed answered and something is wrong".
 *
 * 404 is a private or absent repository, which is the state a fresh fork is in.
 * 403 and 429 are rate limiting: unauthenticated requests share a 60-per-hour
 * budget per IP, and CI runners share an outbound IP with every other job on the
 * host — so a build can exhaust a budget it never spent.
 *
 * All three degrade to an empty feed rather than failing the build. A download
 * page that says "not published yet" is a worse page; a build that exits 1 is no
 * page at all, and the failure would be unrelated to the commit under test.
 * Callers already render the empty state honestly — see release-channel.ts.
 */
const unreachableFeedStatuses = new Set([403, 404, 429]);

function getPublishedReleases(): Promise<GitHubRelease[]> {
  releasesRequest ??= fetch(releasesUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  }).then(async (response) => {
    if (unreachableFeedStatuses.has(response.status)) {
      /* Loud on purpose. Silently shipping a site with no downloads listed is
         the failure this branch introduces, so it must be visible in the build
         log even though it does not stop the build. */
      console.warn(
        `[downloads] GitHub Releases unreachable (${response.status} ${response.statusText}). ` +
          `Rendering the "not published yet" state. ` +
          (process.env.GITHUB_TOKEN ? "" : "Set GITHUB_TOKEN to raise the rate limit."),
      );
      return [];
    }
    if (!response.ok) throw new Error(`GitHub Releases request failed: ${response.status} ${response.statusText}`);
    const releases = await response.json();
    if (!Array.isArray(releases)) throw new Error("GitHub Releases response must be an array");
    return (releases as GitHubRelease[]).filter((release) => !release.draft);
  }).catch((cause: unknown) => {
    /* A rejected fetch is the same class of problem as the statuses above, and
       covering only the statuses left the hole this closes: the request never
       reaching GitHub at all — offline, DNS failure, a connect timeout, a proxy
       refusing the connection. Those throw rather than returning a response, so
       the earlier fix did not catch them and a build with no network died with
       "TypeError: fetch failed" instead of rendering the empty state. Observed
       exactly that while running the e2e suite.

       A malformed body is deliberately not swallowed here: it means GitHub
       answered with something unexpected, which is a real fault worth failing on
       rather than quietly publishing a site with no downloads. */
    if (cause instanceof Error && /must be an array|request failed/.test(cause.message)) throw cause;
    console.warn(
      `[downloads] GitHub Releases unreachable (${cause instanceof Error ? cause.message : String(cause)}). ` +
        `Rendering the "not published yet" state.`,
    );
    return [] as GitHubRelease[];
  });
  return releasesRequest;
}

export async function getLatestRelease(): Promise<GitHubRelease | null> {
  return (await getPublishedReleases())[0] ?? null;
}

const platformLabels = { macos: "macOS", windows: "Windows", linux: "Linux" } as const;
const archLabels = { arm64: "Apple silicon / ARM64", x64: "Intel / AMD 64-bit" } as const;
const binarySuffixes = [".zip", ".tar.gz", ".dmg", ".msi", ".exe", ".appimage"];

/* Asset names carry Go's GOOS/GOARCH, because that is what upstream's release
   workflow builds with: `OneAgent-darwin-arm64.zip`, not `-macos-arm64`. The
   site's own vocabulary is macos/x64, so accept both spellings and normalise to
   the site's. Matching only the site's spelling is what made the download page
   render "not published yet" against a release that had four assets. */
const platformAliases: Record<string, ReleaseTarget["platform"]> = {
  macos: "macos",
  darwin: "macos",
  windows: "windows",
  linux: "linux",
};
const archAliases: Record<string, ReleaseTarget["arch"]> = {
  arm64: "arm64",
  aarch64: "arm64",
  x64: "x64",
  amd64: "x64",
  x86_64: "x64",
};

export function releaseTargets(release: GitHubRelease): ReleaseTarget[] {
  return release.assets.flatMap((asset) => {
    const match = asset.name
      .toLowerCase()
      .match(/-(macos|darwin|windows|linux)-(arm64|aarch64|x64|amd64|x86_64)(?:\.[a-z0-9.]+)$/);
    if (!match || !binarySuffixes.some((suffix) => asset.name.toLowerCase().endsWith(suffix))) return [];
    const platform = platformAliases[match[1]];
    const arch = archAliases[match[2]];
    const digest = asset.digest?.match(/^sha256:([a-f0-9]{64})$/i)?.[1].toLowerCase() ?? null;
    /* Upstream publishes one combined `SHA256SUMS` covering every asset. Prefer a
       per-target file if one ever appears, then fall back to the combined one, so
       the page can still point at something a reader can verify by hand. */
    const checksum =
      release.assets.find((candidate) => candidate.name === `SHA256SUMS-${platform}-${arch}.txt`) ??
      release.assets.find((candidate) => /^sha256sums(\.txt)?$/i.test(candidate.name));
    return [{
      id: `${platform}-${arch}`,
      platform,
      platformLabel: platformLabels[platform],
      arch,
      archLabel: archLabels[arch],
      file: asset.name,
      bytes: asset.size,
      sha256: digest,
      downloadUrl: asset.browser_download_url,
      checksumUrl: checksum?.browser_download_url ?? null,
    }];
  });
}

export function detectTargetFromUserAgent(userAgent: string): DetectedTarget | null {
  const normalized = userAgent.toLowerCase();
  if (/iphone|ipad|android/.test(normalized)) return null;
  if (/macintosh|mac os x/.test(normalized)) {
    return {
      platform: "macos",
      arch: /arm64|aarch64|apple silicon/.test(normalized) ? "arm64" : null,
    };
  }
  if (/windows/.test(normalized)) {
    return { platform: "windows", arch: /arm64|aarch64/.test(normalized) ? "arm64" : "x64" };
  }
  if (/linux|x11/.test(normalized)) {
    return { platform: "linux", arch: /arm64|aarch64/.test(normalized) ? "arm64" : "x64" };
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(1)} ${unit}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "尚未发布";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function supportLabels(support: AgentSupport): string[] {
  const labels: string[] = [];
  if (support.managedInstall) labels.push("OneAgent 可管理安装");
  if (support.officialInstallGuide) labels.push("官方安装引导");
  if (support.managedConfig) labels.push("OneAgent 可管理配置");
  if (!support.managedConfig) labels.push("配置由 Agent 官方流程管理");
  return labels;
}
