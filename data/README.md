# Vendored catalog data

`agents.lock.json` and `providers.lock.json` are copies of the files of the same
name at the root of [MaimoryLab/OneAgent](https://github.com/MaimoryLab/OneAgent).
They are the installer's contract: which agents exist, which platforms they run
on, which config file each one writes, and which providers speak which protocol.
`src/lib/catalog.ts` reads them to build every agent and provider page.

Two more files sit beside them and are **not** upstream copies:

| File | Why it exists |
| --- | --- |
| `desktop-agents.json` | Desktop applications are declared in Go, in `internal/desktopapp/registry.go`, with no generated lock file to copy. Transcribed by hand. |
| `planned-agents.json` | Agents OneAgent intends to support but has not shipped. By definition absent from the installer contract, so there is nothing upstream to copy. |

Both are hand-maintained, which means nothing upstream will fail if they drift.
Check them against the sources named inside each file when refreshing the locks.

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

Current copies came from commit `206a610` on `main`. There is no tag to copy
from — OneAgent has published no release and no tag — so this points at a commit
rather than the released tag the procedure above asks for. Switch back to a tag
as soon as one exists.

The command-line contract is now five agents: `codex`, `claude-code`,
`opencode`, `kilo-cli` and `aider`, all `config_mode: auto`. Getting here took
upstream three passes, which is worth recording because the site followed each
one:

- `3217923` listed fourteen agents.
- `4d63d75` cut nine of them but left the code reading three, breaking upstream's
  own build. `fac25e5` restored `cursor`, `openclaw` and `hermes` at ranks 6-8
  and kept the other six deleted.
- By `206a610` those three are gone as well, and `guide` has no members at all.

`guide` remains a valid `config_mode` in upstream's validator and install path,
so a future agent can reintroduce it. Until one does, the site has no agent whose
install route is an official flow, and the activation demo's guide-only phase is
only reachable from a test fixture.

`openclaw` and `hermes` live on in `planned-agents.json`, presented as coming
soon rather than dropped, since OneAgent still intends to support them.

## Desktop applications

`desktop-agents.json` is transcribed from `internal/desktopapp/registry.go`. Each
entry pairs an install source per platform with the config file the app owns:

| Agent | Config | macOS | Windows |
| --- | --- | --- | --- |
| ChatGPT Desktop | shares Codex's `~/.codex/config.toml` | `.dmg` download | Microsoft Store |
| WorkBuddy | its own `~/.workbuddy/models.json` | `.zip` download | vendor installer |

Neither runs on Linux, and neither has a pinned version: OneAgent fetches whatever
the vendor's endpoint currently serves, so there is no locked version or package
license for the site to quote. Both are installed by OneAgent — the registry pairs
every entry with its own install function, so there is no guide-only desktop app.

To refresh, re-read `registry.go` plus the per-agent files it points at
(`desktopapp.go`, `workbuddy.go`) and compare against the JSON.

## What is *not* here

Download URLs, file sizes and checksums are read from the GitHub Releases API at
build time by `src/lib/release-channel.ts`. They are deliberately not vendored:
a stale checksum on a download page is worse than no checksum.

Agent icons are also not vendored wholesale. Upstream ships an image asset only
when its source, license and SHA-256 are recorded in
`frontend/src/components/icons/asset-rights.json`, and uses a generic mark
otherwise. This site currently ships three marks with no such record — see the
open issue on asset provenance.
