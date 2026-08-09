import { afterEach, describe, expect, it, vi } from "vitest";
import { detectTargetFromUserAgent, formatBytes, releaseTargets, supportLabels } from "./downloads";
import { recommendedTargetIn, type ReleaseChannel } from "./release-channel";

const channel: ReleaseChannel = {
  channel: "technical-preview-unsigned",
  label: "未签名技术预览版",
  published_at: "2026-07-28T00:00:00Z",
  version: "0.2.0-dev",
  unsigned: true,
  status: "available",
  targets: [
    {
      id: "macos-arm64",
      platform: "macos",
      platformLabel: "macOS",
      arch: "arm64",
      archLabel: "Apple silicon / ARM64",
      status: "available",
      verification: { native_build: true, cleanroom: "verified", evidence: "security/" },
      python: "3.12.13",
      built_at: "2026-07-26T10:14:28Z",
      artifacts: [
        {
          file: "OneAgent.zip",
          sha256: "abc",
          bytes: 1024,
          kind: "binary",
          checksumUrl: null,
          downloads: [{ id: "website", label: "官网下载", kind: "official", url: "downloads/OneAgent.zip", primary: true }],
        },
      ],
    },
    {
      id: "windows-x64",
      platform: "windows",
      platformLabel: "Windows",
      arch: "x64",
      archLabel: "Intel / AMD 64-bit",
      status: "verification-pending",
      verification: { native_build: false, cleanroom: "not-recorded", evidence: null },
      python: null,
      built_at: null,
      artifacts: [],
    },
  ],
};

describe("download targeting", () => {
  it("detects Apple silicon without hiding manual platform choices", () => {
    expect(detectTargetFromUserAgent("Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_5)")).toEqual({
      platform: "macos",
      arch: "arm64",
    });
  });

  it("does not pretend a generic macOS user agent reveals the chip architecture", () => {
    expect(detectTargetFromUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)")).toEqual({
      platform: "macos",
      arch: null,
    });
  });

  it("recognizes Windows on ARM without silently recommending x64 as an exact match", () => {
    expect(detectTargetFromUserAgent("Mozilla/5.0 (Windows NT 10.0; ARM64)")).toEqual({
      platform: "windows",
      arch: "arm64",
    });
  });

  it("returns an unavailable target when it is the user's platform", () => {
    expect(recommendedTargetIn(channel, { platform: "windows", arch: "x64" })?.id).toBe("windows-x64");
  });

  it("falls back to the available artifact for an unknown browser", () => {
    expect(recommendedTargetIn(channel, null)?.id).toBe("macos-arm64");
  });

  it("formats download size without pretending to be exact decimal storage", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MiB");
  });
});

describe("compatibility labels", () => {
  it("keeps guide-only agents distinct from managed installation", () => {
    expect(
      supportLabels({ managedInstall: false, officialInstallGuide: true, managedConfig: false }),
    ).toEqual(["官方安装引导", "配置由 Agent 官方流程管理"]);
  });
});

/* The build fetches this feed, so how it handles a refusal decides whether a
 * build succeeds. A 403 from rate limiting used to throw, which failed the whole
 * build — on CI runners that share an outbound IP, over a budget the build never
 * spent, on a commit that changed nothing about downloads.
 *
 * Each case re-imports the module: getPublishedReleases memoises its promise at
 * module scope, so a shared instance would answer every test from the first
 * response.
 */
describe("release feed reachability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const respondWith = (status: number, statusText = "") => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status, statusText, ok: status >= 200 && status < 300, json: async () => [] }),
    );
  };

  for (const [status, cause] of [[403, "rate limit"], [404, "private or absent repo"], [429, "too many requests"]] as const) {
    it(`degrades to an empty feed on ${status} (${cause}) instead of failing the build`, async () => {
      respondWith(status);
      const { getLatestRelease } = await import("./downloads");

      await expect(getLatestRelease()).resolves.toBeNull();
    });
  }

  // A 500 is the feed answering that something is wrong on its side, which is
  // not the same as being unreachable. Swallowing it would hide a real fault.
  it("still throws on a server error", async () => {
    respondWith(500, "Internal Server Error");
    const { getLatestRelease } = await import("./downloads");

    await expect(getLatestRelease()).rejects.toThrow(/500/);
  });

  /* The status checks above only run once GitHub has answered. A request that
     never arrives rejects instead, which is what actually happened during an e2e
     run with no network: the build died with "TypeError: fetch failed" rather
     than rendering the empty state the statuses are careful to produce. */
  for (const [label, error] of [
    ["a connect timeout", new TypeError("fetch failed")],
    ["a DNS failure", new TypeError("fetch failed")],
  ] as const) {
    it(`degrades to an empty feed when the request never arrives (${label})`, async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
      const { getLatestRelease } = await import("./downloads");

      await expect(getLatestRelease()).resolves.toBeNull();
    });
  }

  // A body that is not an array means GitHub answered with something unexpected.
  // That is a real fault, not an unreachable feed, so it must not be swallowed.
  it("still throws when the feed answers with a malformed body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 200, statusText: "OK", ok: true, json: async () => ({ nope: true }) }),
    );
    const { getLatestRelease } = await import("./downloads");

    await expect(getLatestRelease()).rejects.toThrow(/must be an array/);
  });
});

/**
 * Regression cover for the v0.3.0 sync. Upstream builds with Go, so its assets
 * are named by GOOS/GOARCH — `darwin`, `amd64` — while the site's own vocabulary
 * is macos/x64. Matching only the site's spelling silently dropped three of four
 * assets and published an empty download page against a complete release, which
 * is exactly the failure the page is supposed to make impossible.
 */
describe("release asset naming", () => {
  const release = {
    name: "v0.3.0",
    tag_name: "v0.3.0",
    html_url: "https://github.com/MaimoryLab/OneAgent/releases/tag/v0.3.0",
    published_at: "2026-08-06T11:10:43Z",
    prerelease: false,
    draft: false,
    assets: [
      { name: "OneAgent-darwin-amd64.zip", size: 5026026, digest: `sha256:${"9".repeat(64)}`, browser_download_url: "https://example.test/darwin-amd64" },
      { name: "OneAgent-darwin-arm64.zip", size: 4517447, digest: `sha256:${"1".repeat(64)}`, browser_download_url: "https://example.test/darwin-arm64" },
      { name: "OneAgent-windows-amd64.zip", size: 5206787, digest: `sha256:${"2".repeat(64)}`, browser_download_url: "https://example.test/windows-amd64" },
      { name: "OneAgent-windows-arm64.zip", size: 4683982, digest: `sha256:${"a".repeat(64)}`, browser_download_url: "https://example.test/windows-arm64" },
      { name: "SHA256SUMS", size: 370, digest: `sha256:${"8".repeat(64)}`, browser_download_url: "https://example.test/sums" },
    ],
  };

  it("maps Go's GOOS/GOARCH names onto the site's platform vocabulary", () => {
    const ids = releaseTargets(release).map((target) => target.id).sort();

    expect(ids).toEqual(["macos-arm64", "macos-x64", "windows-arm64", "windows-x64"]);
  });

  it("carries the published digest and size through, so the page can state both", () => {
    const target = releaseTargets(release).find((candidate) => candidate.id === "macos-arm64");

    expect(target?.file).toBe("OneAgent-darwin-arm64.zip");
    expect(target?.bytes).toBe(4517447);
    expect(target?.sha256).toBe("1".repeat(64));
  });

  it("falls back to the combined SHA256SUMS when no per-target file exists", () => {
    for (const target of releaseTargets(release)) {
      expect(target.checksumUrl).toBe("https://example.test/sums");
    }
  });

  it("does not treat the checksum manifest as a downloadable build", () => {
    expect(releaseTargets(release).some((target) => target.file === "SHA256SUMS")).toBe(false);
  });
});

/**
 * The star count is decoration, so every failure has to end in null rather than a
 * thrown error or a zero.
 *
 * Zero is the case worth pinning: "0 stars" is a claim, and a rate-limited API is
 * not evidence for it. Returning 0 on failure would put a wrong number in the
 * header of every page, and it is the obvious shape for a later refactor to
 * introduce (`?? 0`), which is why it is asserted rather than assumed.
 */
describe("repository stars", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const respond = (value: unknown, init: { status?: number; ok?: boolean } = {}) => {
    const status = init.status ?? 200;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status,
        statusText: "",
        ok: init.ok ?? (status >= 200 && status < 300),
        json: async () => value,
      }),
    );
  };

  it("reads the count from the repository payload", async () => {
    respond({ stargazers_count: 128 });
    const { getRepositoryStars } = await import("./downloads");

    await expect(getRepositoryStars()).resolves.toBe(128);
  });

  it("returns null rather than zero when rate limited", async () => {
    respond({ message: "rate limit exceeded" }, { status: 403 });
    const { getRepositoryStars } = await import("./downloads");

    await expect(getRepositoryStars()).resolves.toBeNull();
  });

  it("returns null when the request never reaches GitHub", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch failed")));
    const { getRepositoryStars } = await import("./downloads");

    await expect(getRepositoryStars()).resolves.toBeNull();
  });

  // A changed payload shape must not surface as NaN in the header.
  it("returns null when the count is missing or not a number", async () => {
    respond({ stargazers_count: "many" });
    const { getRepositoryStars } = await import("./downloads");

    await expect(getRepositoryStars()).resolves.toBeNull();
  });

  it("points at the product repository, not the site's own", async () => {
    const { repositoryUrl } = await import("./downloads");

    expect(repositoryUrl).toBe("https://github.com/MaimoryLab/OneAgent");
  });

  /* Every page renders the header, so a per-page request would be dozens of calls
     against a 60-per-hour unauthenticated budget. */
  it("requests the repository once however many pages ask for it", async () => {
    respond({ stargazers_count: 7 });
    const { getRepositoryStars } = await import("./downloads");

    await Promise.all([getRepositoryStars(), getRepositoryStars(), getRepositoryStars()]);

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});
