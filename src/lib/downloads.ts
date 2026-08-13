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
   here pointed every CI and Pages build at this repository, which has no
   releases, and the download page rendered "not published yet" no matter what
   upstream had shipped. RELEASE_REPOSITORY overrides it for a fork that
   publishes its own builds. */
const repository = process.env.RELEASE_REPOSITORY || "MaimoryLab/BootAgent";
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

export const repositoryUrl = `https://github.com/${repository}`;
let repositoryRequest: Promise<number | null> | undefined;

/**
 * The upstream repository's star count, or null when it cannot be read.
 *
 * Fetched at build time rather than in the browser, and not because that is
 * tidier: the site's CSP is `default-src 'self'` with no `connect-src` exception,
 * so a client-side call to api.github.com is blocked outright. Widening the CSP
 * to render one number would be a poor trade, and a badge image from a third
 * party would need `img-src` widened for the same reason — as well as reporting
 * every visitor to that host.
 *
 * Null on every failure, including a rate limit. Callers render nothing rather
 * than a zero: "0 stars" is a claim, and an unreachable API is not evidence for
 * it. The degradation is silent-but-logged for the same reason the release feed's
 * is — a build must not fail over a decoration.
 */
export function getRepositoryStars(): Promise<number | null> {
  repositoryRequest ??= fetch(`https://api.github.com/repos/${repository}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        console.warn(
          `[repository] GitHub repository unreachable (${response.status} ${response.statusText}). Omitting the star count. ` +
            (process.env.GITHUB_TOKEN ? "" : "Set GITHUB_TOKEN to raise the rate limit."),
        );
        return null;
      }
      const body: unknown = await response.json();
      const stars = (body as { stargazers_count?: unknown }).stargazers_count;
      /* A non-number here means the shape changed, which is worth noticing but not
         worth failing a build over — unlike the release feed, nothing downstream
         depends on this value being present. */
      if (typeof stars !== "number" || !Number.isFinite(stars)) {
        console.warn("[repository] stargazers_count missing or not a number. Omitting the star count.");
        return null;
      }
      return stars;
    })
    .catch((cause: unknown) => {
      console.warn(
        `[repository] GitHub repository unreachable (${cause instanceof Error ? cause.message : String(cause)}). ` +
          "Omitting the star count.",
      );
      return null;
    });
  return repositoryRequest;
}

export async function getLatestRelease(): Promise<GitHubRelease | null> {
  return (await getPublishedReleases())[0] ?? null;
}

const platformLabels = { macos: "macOS", windows: "Windows", linux: "Linux" } as const;
const archLabels = { arm64: "Apple silicon / ARM64", x64: "Intel / AMD 64-bit" } as const;

/**
 * Which format to offer when a release publishes several for one platform-arch,
 * most-preferred first.
 *
 * This has to be stated rather than inferred. Before it existed the choice fell
 * to whichever asset GitHub listed first, and the feed is ordered
 * alphabetically — so macOS got its `.dmg` over its `.zip` by luck, and renaming
 * an asset such that the archive sorted first would have silently started handing
 * every macOS visitor a zip. A download page whose format depends on filename
 * collation is not making a decision.
 *
 * Native installer first on each platform, archive last: the archive is the
 * fallback for someone who cannot or will not run an installer, not the default.
 */
const formatPreference = {
  macos: [".dmg", ".pkg", ".zip", ".tar.gz"],
  windows: [".exe", ".msi", ".zip"],
  linux: [".appimage", ".deb", ".rpm", ".tar.gz", ".zip"],
} as const satisfies Record<ReleaseTarget["platform"], readonly string[]>;

/* Every suffix any platform will accept. Derived rather than repeated: keeping a
   separate list is how `.deb` and `.rpm` ended up matching the name pattern but
   being dropped as non-binary when upstream started shipping them. */
const binarySuffixes: readonly string[] = [...new Set(Object.values(formatPreference).flat())];

/* Not a first-install download. Upstream ships `ota-*.zip` update payloads beside
   the installers, and they satisfy every other rule here — platform, arch, a
   `.zip` suffix — so they were picked up as the thing to offer. On v0.6.0 that
   made the Windows column advertise an OTA update package, because the real
   installers are `-installer.exe` and did not match at all. See #28. */
const updatePayloadPattern = /^ota-/i;

/* Asset names carry Go's GOOS/GOARCH, because that is what upstream's release
   workflow builds with: `BootAgent-darwin-arm64.dmg`, not `-macos-arm64`. The
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

/* The arch is not always the last thing before the extension. Upstream's Windows
   installers are `BootAgent-windows-amd64-installer.exe`, and anchoring the
   arch to the extension meant they never matched — so the only Windows asset the
   page could see was the OTA payload above. The optional group accepts that
   trailing word without loosening what counts as an arch. */
const assetNamePattern =
  /-(macos|darwin|windows|linux)-(arm64|aarch64|x64|amd64|x86_64)(?:-[a-z0-9]+)?(?:\.[a-z0-9.]+)$/;

export function releaseTargets(release: GitHubRelease): ReleaseTarget[] {
  const candidates = release.assets.flatMap((asset) => {
    const name = asset.name.toLowerCase();
    if (updatePayloadPattern.test(name)) return [];
    const match = name.match(assetNamePattern);
    if (!match) return [];
    const suffix = binarySuffixes.find((candidate) => name.endsWith(candidate));
    if (!suffix) return [];
    const platform = platformAliases[match[1]];
    const arch = archAliases[match[2]];
    /* A format this platform does not list is not offered at all, rather than
       ranked last: `.exe` on macOS would be a broken download, not a worse one. */
    const rank = formatPreference[platform].indexOf(suffix as never);
    if (rank < 0) return [];
    const digest = asset.digest?.match(/^sha256:([a-f0-9]{64})$/i)?.[1].toLowerCase() ?? null;
    /* Upstream publishes one combined `SHA256SUMS` covering every asset. Prefer a
       per-target file if one ever appears, then fall back to the combined one, so
       the page can still point at something a reader can verify by hand. */
    const checksum =
      release.assets.find((candidate) => candidate.name === `SHA256SUMS-${platform}-${arch}.txt`) ??
      release.assets.find((candidate) => /^sha256sums(\.txt)?$/i.test(candidate.name));
    return [{
      rank,
      target: {
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
      } satisfies ReleaseTarget,
    }];
  });

  /* One entry per platform-arch. Callers resolve a target with `.find()`, so
     emitting the same id twice made the winner depend on feed order — the bug the
     preference list above exists to remove. Ties keep the earlier asset, which for
     equal rank means equal format, so the choice is immaterial. */
  const best = new Map<string, { rank: number; target: ReleaseTarget }>();
  for (const candidate of candidates) {
    const incumbent = best.get(candidate.target.id);
    if (!incumbent || candidate.rank < incumbent.rank) best.set(candidate.target.id, candidate);
  }
  return [...best.values()].map((candidate) => candidate.target);
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
  if (support.managedInstall) labels.push("BootAgent 可管理安装");
  if (support.officialInstallGuide) labels.push("官方安装引导");
  if (support.managedConfig) labels.push("BootAgent 可管理配置");
  if (!support.managedConfig) labels.push("配置由 Agent 官方流程管理");
  return labels;
}
