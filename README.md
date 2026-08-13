# BootAgent public site

The static marketing and documentation site for
[BootAgent](https://github.com/MaimoryLab/OneAgent), built with Astro. Chinese is
the default locale and is served unprefixed; English is additive under `/en/`.

The product repository above still carries the old `OneAgent` name; it is being
renamed separately, and the link updates when it does. See
[`docs/rename-to-bootagent.md`](docs/rename-to-bootagent.md).

This repository was split out of the product repository so a copy fix does not
have to ride the desktop app's release cadence. It has no Go, Wails or React
dependency — the only thing it shares is the vendored catalog data described in
[`data/README.md`](data/README.md).

## Commands

```bash
pnpm install --frozen-lockfile
pnpm run dev        # localhost:4321
pnpm run build      # astro check + astro build + validate-build.mjs
pnpm run test       # vitest
pnpm run test:e2e   # playwright, builds and previews first
pnpm run test:all   # test + build + test:e2e
```

`pnpm run build` is the gate. It type-checks the Astro components, then
`scripts/validate-build.mjs` asserts every emitted page is well-formed, so a
broken link or an unresolved reference fails the build rather than shipping.

## Configuration

Both are read at build time by `astro.config.mjs`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_URL` | `http://localhost:4321` | Absolute origin. Wrong values break canonical URLs and `sitemap-index.xml`. |
| `BASE_PATH` | `/` | Subdirectory prefix. Only needed when not serving from the domain root. |

Set `SITE_URL` to the real origin in the deploy pipeline. Left at its default,
the sitemap advertises `localhost` to search engines.

## Where the content comes from

Agent and provider pages are generated from the vendored lock files in `data/`.
Download links, file sizes and checksums are fetched from the GitHub Releases API
at build time by `src/lib/release-channel.ts`, so a release does not require a
change here — only a rebuild.
