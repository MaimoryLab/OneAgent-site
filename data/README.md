# Vendored catalog data

`agents.lock.json` and `providers.lock.json` are copies of the files of the same
name at the root of [MaimoryLab/OneAgent](https://github.com/MaimoryLab/OneAgent).
They are the installer's contract: which agents exist, which platforms they run
on, which config file each one writes, and which providers speak which protocol.
`src/lib/catalog.ts` reads them to build every agent and provider page.

## Why these are copied rather than referenced

The site describes what a *published release* supports. Following the OneAgent
repository's HEAD would advertise agents that are merged but not yet shipped,
and would couple a documentation fix to that repository's release cadence — the
coupling splitting the repositories was meant to remove.

## Refreshing them

Copy both files from a released tag, not from `main`:

```bash
tag=v0.3.0   # the release the site should describe
for f in agents.lock.json providers.lock.json; do
  curl -fsSL "https://raw.githubusercontent.com/MaimoryLab/OneAgent/$tag/$f" -o "data/$f"
done
pnpm run build
```

`pnpm run build` runs `astro check` and `scripts/validate-build.mjs`, so a shape
change in either file fails the build rather than rendering a broken page.

Current copies came from commit `3217923` (`refactor: always install latest
version`), reachable from `56dc263` on `main`.

## What is *not* here

Download URLs, file sizes and checksums are read from the GitHub Releases API at
build time by `src/lib/release-channel.ts`. They are deliberately not vendored:
a stale checksum on a download page is worse than no checksum.
