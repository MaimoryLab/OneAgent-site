/**
 * Adapts GitHub Releases into the channel shape the pages render.
 *
 * The pages were written against a locally generated release index that carried
 * per-target build provenance: which Python built it, whether the build was
 * native, whether a cleanroom run passed. GitHub Releases carries none of that —
 * it knows an asset's name, size and digest, and nothing about how it was made.
 *
 * So this module maps what the API does return and reports the rest as unknown
 * rather than filling it in. `native_build: false` and `cleanroom:
 * "not-recorded"` are the honest readings of "the release feed cannot tell us",
 * and the pages already render that as an absence of evidence instead of a
 * claim. Inventing a `true` here would put a verification badge on the site that
 * nothing checked.
 */
import {
  type DetectedTarget,
  type GitHubRelease,
  type ReleaseTarget as AssetTarget,
  getLatestRelease,
  releaseTargets,
} from "./downloads";

export type { DetectedTarget };

type TargetStatus = "available" | "verification-pending" | "planned" | "withdrawn";

export interface DownloadLink {
  id: string;
  label: string;
  kind: "official" | "mirror";
  url: string;
  primary: boolean;
}

export interface ReleaseArtifact {
  file: string;
  sha256: string;
  bytes: number;
  kind: "binary" | "source";
  /* The published checksum manifest, so a reader can compare against the release
     itself rather than against a number this page prints. Carried through from
     the asset feed — it was parsed but dropped here, which left the integrity
     section telling readers to verify with nothing to verify against. */
  checksumUrl: string | null;
  downloads: DownloadLink[];
}

export interface ReleaseTarget {
  id: string;
  platform: string;
  platformLabel: string;
  arch: string;
  archLabel: string;
  status: TargetStatus;
  /* Per platform, not per channel: as of v0.7.0 the macOS artifacts are
     notarised while the Windows installers still carry no Authenticode
     signature, so a single channel-wide "unsigned" flag would be wrong in one
     direction or the other whichever way it pointed. */
  signing: TargetSigning;
  verification: {
    native_build: boolean;
    cleanroom: "verified" | "not-recorded" | "failed";
    evidence: string | null;
  };
  python: string | null;
  built_at: string | null;
  artifacts: ReleaseArtifact[];
}

export type TargetSigning =
  /** macOS: Developer ID signature + Apple notarisation, ticket stapled. */
  | "notarized"
  /** Windows: a valid Authenticode signature. Only ever true on the stable channel. */
  | "signed"
  /** The OS has a signature gate (Gatekeeper / SmartScreen) and the artifact carries no signature. */
  | "unsigned"
  /** Linux: no OS-level signature gate exists; the SHA-256 is the check. */
  | "not-applicable";

export interface ReleaseChannel {
  channel: string;
  label: string;
  published_at: string | null;
  version: string | null;
  status: "available" | "unavailable";
  targets: ReleaseTarget[];
}

/* Every platform/arch BootAgent intends to ship, in the order the download page
   lists them. Targets with no asset in the release still appear, as `planned` —
   a reader comparing platforms should see that Windows exists and is not ready
   yet, rather than find it missing and wonder. */
const plannedTargets: Array<{ id: string; platform: string; platformLabel: string; arch: string; archLabel: string }> = [
  { id: "macos-arm64", platform: "macos", platformLabel: "macOS", arch: "arm64", archLabel: "Apple silicon / ARM64" },
  { id: "macos-x64", platform: "macos", platformLabel: "macOS", arch: "x64", archLabel: "Intel / AMD 64-bit" },
  { id: "windows-x64", platform: "windows", platformLabel: "Windows", arch: "x64", archLabel: "Intel / AMD 64-bit" },
  { id: "windows-arm64", platform: "windows", platformLabel: "Windows", arch: "arm64", archLabel: "ARM64" },
  { id: "linux-x64", platform: "linux", platformLabel: "Linux", arch: "x64", archLabel: "Intel / AMD 64-bit" },
  /* Upstream began publishing Linux arm64 in v0.6.0. Without an entry here the
     asset is matched and then discarded, so the page would omit a build that
     exists — the same silent-omission failure as #28, arriving from the other
     direction. */
  { id: "linux-arm64", platform: "linux", platformLabel: "Linux", arch: "arm64", archLabel: "ARM64" },
];

const previewChannelId = "technical-preview";

/* What separates Stable from the preview is signing on every gated platform:
   Developer ID notarisation on macOS AND Authenticode on Windows. GitHub's
   `prerelease` flag records neither, so it cannot be the input to that decision.
 *
 * v0.3.0 is the case that proves it. It is marked `prerelease: false` and its tag
 * says nothing about a preview, so reading the flag alone labelled it 稳定版 — a
 * claim that the binaries are signed, which nothing verified. The release notes
 * mention no signing or notarisation step at all.
 *
 * So the default is the preview, and Stable requires positive evidence: a tag
 * that opts in explicitly (`+stable`, or a `signed` marker). Getting this
 * backwards puts an unearned trust badge on the download page, which is worse
 * than under-claiming — the whole point of the page is that a reader can check
 * what they are running. */
const stableTagMarker = /\+stable\b|[-.]signed\b/i;

/* macOS artifacts are Developer ID-signed and Apple-notarised from v0.7.0 on.
   The feed records nothing about signing, so this floor is the evidence-bearing
   constant, established the only way it can be: by checking a published
   artifact. Verified 2026-08-18 against both v0.7.0 DMGs (darwin-arm64 and
   darwin-amd64):
 *
 *   codesign -dv  → Developer ID Application: steve li (F2VC757B28),
 *                   flags=0x10000(runtime), Notarization Ticket=stapled
 *   spctl -a -t exec → accepted, source=Notarized Developer ID
 *   stapler validate → ticket valid
 *
 * Upstream moved signing into the release workflow (BootAgent#199), so the
 * floor describes the pipeline, not one lucky release. If a macOS build ever
 * ships unsigned again nothing here can detect it — this constant must be
 * corrected by hand, the same way it was established.
 *
 * The same v0.7.0 check found no Authenticode certificate table in the Windows
 * installers, which is why Windows stays `unsigned` and the channel as a whole
 * remains a preview. */
const macosNotarizedSince = [0, 7, 0] as const;

function versionAtLeast(version: string, floor: readonly [number, number, number]): boolean {
  /* A suffixed segment ("0-rc1") parses to its leading number, which reads a
     pre-release as its base version. Acceptable: upstream has only ever tagged
     plain versions, and the floor exists to separate whole eras, not RCs. */
  const [major = 0, minor = 0, patch = 0] = version
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isNaN(part) ? 0 : part));
  if (major !== floor[0]) return major > floor[0];
  if (minor !== floor[1]) return minor > floor[1];
  return patch >= floor[2];
}

function signingFor(platform: string, version: string, stable: boolean): TargetSigning {
  if (platform === "linux") return "not-applicable";
  if (stable) return platform === "macos" ? "notarized" : "signed";
  if (platform === "macos" && versionAtLeast(version, macosNotarizedSince)) return "notarized";
  return "unsigned";
}

function channelOf(release: GitHubRelease): { channel: string; label: string; stable: boolean } {
  return stableTagMarker.test(release.tag_name)
    ? { channel: "stable", label: "稳定版", stable: true }
    : { channel: previewChannelId, label: "技术预览版", stable: false };
}

/* The Gitee mirror for mainland-China networks, queried per release tag at
   build time so a mirror link is only ever emitted for an asset the mirror
   actually hosts — as of v0.7.2 that is the two macOS DMGs, and a blanket URL
   rewrite would 404 every Windows and Linux download it touched.
 *
 * The mirrored darwin-arm64 DMG was downloaded and hashed before this link
 * existed: its SHA-256 (325cbcf6…01ee) matches the digest GitHub's feed
 * publishes for the same file, which is what the same-package promise
 * requires of a mirror. An unreachable Gitee API degrades to an empty map and
 * the page simply keeps its GitHub links. */
const giteeMirrorRepository = "maimory/BootAgent";
let giteeAssetsPromise: Promise<Map<string, string>> | null = null;
function giteeMirrorAssets(tag: string): Promise<Map<string, string>> {
  giteeAssetsPromise ??= (async () => {
    try {
      const response = await fetch(
        `https://gitee.com/api/v5/repos/${giteeMirrorRepository}/releases/tags/${encodeURIComponent(tag)}`,
      );
      if (!response.ok) return new Map();
      const release = (await response.json()) as { assets?: { name?: string; browser_download_url?: string }[] };
      return new Map(
        (release.assets ?? [])
          .filter((asset): asset is { name: string; browser_download_url: string } =>
            Boolean(asset.name && asset.browser_download_url))
          .map((asset) => [asset.name, asset.browser_download_url]),
      );
    } catch {
      return new Map();
    }
  })();
  return giteeAssetsPromise;
}

function artifactFor(asset: AssetTarget, mirror: Map<string, string>): ReleaseArtifact[] {
  /* A missing digest means the asset predates GitHub's per-asset digests. The
     checksum file is still linked, so a reader can verify by hand — but the page
     must not print a checksum that was never published. */
  if (!asset.sha256) return [];
  const mirrorUrl = mirror.get(asset.file);
  return [{
    file: asset.file,
    sha256: asset.sha256,
    bytes: asset.bytes,
    kind: "binary",
    checksumUrl: asset.checksumUrl,
    downloads: [
      { id: "github", label: "GitHub Releases", kind: "official", url: asset.downloadUrl, primary: true },
      ...(mirrorUrl
        ? [{ id: "gitee", label: "Gitee 镜像", kind: "mirror" as const, url: mirrorUrl, primary: false }]
        : []),
    ],
  }];
}

/**
 * Builds the channel the pages render from the newest published release.
 *
 * Returns null when the release feed is empty or unreachable, which is the state
 * a fresh fork is in. Callers render the "not published yet" copy for null
 * rather than failing the build, because a site that cannot be built without a
 * network round trip cannot be built in CI.
 */
export async function getPreviewChannel(): Promise<ReleaseChannel | null> {
  const release = await getLatestRelease();
  if (!release) return null;
  const assets = releaseTargets(release);
  const { channel, label, stable } = channelOf(release);
  const version = release.tag_name.replace(/^v/, "");
  const mirror = await giteeMirrorAssets(release.tag_name);
  const targets: ReleaseTarget[] = plannedTargets.map((planned) => {
    const asset = assets.find((candidate) => candidate.id === planned.id);
    const artifacts = asset ? artifactFor(asset, mirror) : [];
    return {
      ...planned,
      /* An asset whose digest never got published is `verification-pending`, not
         `available`: the download page's whole claim is that you can check what
         you downloaded, and without a checksum you cannot. */
      status: !asset ? "planned" : artifacts.length > 0 ? "available" : "verification-pending",
      signing: signingFor(planned.platform, version, stable),
      verification: { native_build: false, cleanroom: "not-recorded", evidence: "security/#release-evidence" },
      python: null,
      built_at: release.published_at,
      artifacts,
    };
  });
  return {
    channel,
    label,
    published_at: release.published_at,
    version,
    status: targets.some((target) => target.status === "available") ? "available" : "unavailable",
    targets,
  };
}
export function recommendedTargetIn(channel: ReleaseChannel, detected: DetectedTarget | null): ReleaseTarget | null {
  if (detected) {
    const exact = detected.arch
      ? channel.targets.find((target) => target.platform === detected.platform && target.arch === detected.arch)
      : null;
    if (exact) return exact;
    const samePlatform = channel.targets.find(
      (target) => target.platform === detected.platform && target.status === "available",
    );
    if (samePlatform) return samePlatform;
    const anySamePlatform = channel.targets.find((target) => target.platform === detected.platform);
    if (anySamePlatform) return anySamePlatform;
  }
  return channel.targets.find((target) => target.status === "available") ?? channel.targets[0] ?? null;
}

export function binaryArtifact(target: ReleaseTarget): ReleaseArtifact | null {
  return target.artifacts.find((artifact) => artifact.kind === "binary") ?? null;
}

export function primaryDownload(artifact: ReleaseArtifact): DownloadLink | null {
  return artifact.downloads.find((download) => download.primary) ?? artifact.downloads[0] ?? null;
}

/** The mirror link for this artifact, when the mirror hosts the file. */
export function mirrorDownload(artifact: ReleaseArtifact): DownloadLink | null {
  return artifact.downloads.find((download) => download.kind === "mirror") ?? null;
}
