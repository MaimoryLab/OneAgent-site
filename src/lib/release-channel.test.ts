import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The channel decides whether the download page tells a reader the binaries are
 * signed. That is a trust claim, so it gets tests rather than trust.
 *
 * Each case re-imports the module because the releases request is memoised at
 * module scope, so a shared instance would answer every case from the first stub.
 */
const asset = (name: string, digest: string | null) => ({
  name,
  size: 4517447,
  digest,
  browser_download_url: `https://example.test/${name}`,
});

const release = (overrides: Record<string, unknown> = {}) => ({
  name: "v0.3.0",
  tag_name: "v0.3.0",
  html_url: "https://example.test/tag",
  published_at: "2026-08-06T11:10:43Z",
  prerelease: false,
  draft: false,
  assets: [
    asset("OneAgent-darwin-arm64.zip", `sha256:${"1".repeat(64)}`),
    asset("SHA256SUMS", `sha256:${"8".repeat(64)}`),
  ],
  ...overrides,
});

const load = async (feed: unknown[]) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ status: 200, statusText: "OK", ok: true, json: async () => feed }),
  );
  return import("./release-channel");
};

describe("release channel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  /* The regression that prompted these tests: v0.3.0 is `prerelease: false` and
     its tag says nothing about a preview, so reading the flag labelled it 稳定版
     and implied signed, notarised binaries. Upstream's release notes record no
     signing step. Under-claiming is the safe direction here. */
  it("stays on the unsigned preview for a plain release, however it is flagged", async () => {
    const { getPreviewChannel } = await load([release()]);
    const channel = await getPreviewChannel();

    expect(channel?.channel).toBe("technical-preview-unsigned");
    expect(channel?.unsigned).toBe(true);
  });

  it("only claims Stable when the tag opts in explicitly", async () => {
    const { getPreviewChannel } = await load([release({ tag_name: "v1.0.0+stable" })]);
    const channel = await getPreviewChannel();

    expect(channel?.channel).toBe("stable");
    expect(channel?.unsigned).toBe(false);
  });

  it("reports the version without the tag's v prefix", async () => {
    const { getPreviewChannel } = await load([release()]);

    expect((await getPreviewChannel())?.version).toBe("0.3.0");
  });

  /* Every intended platform stays listed even with no asset, so a reader sees
     that Linux exists and is not ready rather than finding it absent. */
  it("lists targets with no asset as planned rather than dropping them", async () => {
    const { getPreviewChannel } = await load([release()]);
    const channel = await getPreviewChannel();
    const byId = Object.fromEntries((channel?.targets ?? []).map((target) => [target.id, target.status]));

    expect(byId["macos-arm64"]).toBe("available");
    expect(byId["linux-x64"]).toBe("planned");
    expect(byId["windows-arm64"]).toBeDefined();
  });

  /* An asset with no published digest cannot be verified, and the page's claim is
     that you can verify what you downloaded. */
  it("marks an asset with no digest verification-pending, not available", async () => {
    const { getPreviewChannel } = await load([
      release({ assets: [asset("OneAgent-darwin-arm64.zip", null)] }),
    ]);
    const channel = await getPreviewChannel();

    expect(channel?.targets.find((target) => target.id === "macos-arm64")?.status).toBe("verification-pending");
    expect(channel?.status).toBe("unavailable");
  });

  it("returns null on an empty feed so the build survives an unreachable API", async () => {
    const { getPreviewChannel } = await load([]);

    expect(await getPreviewChannel()).toBeNull();
  });
});
