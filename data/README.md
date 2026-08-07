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
  curl -fsSL "https://raw.githubusercontent.com/MaimoryLab/OneAgent/$tag/manifests/$f" -o "data/$f"
done
pnpm run build
```

Note the `manifests/` path segment. Upstream was rewritten from Python to Go and
the lock files moved out of the repository root, so the earlier form of this
command — which is what the previous copies were fetched with — now 404s.

`pnpm run build` runs `astro check` and `scripts/validate-build.mjs`, so a shape
change in either file fails the build rather than rendering a broken page.

Current copies came from tag `v0.3.0` (commit `64da015`), OneAgent's first
published release. Earlier copies tracked a `main` commit because no tag existed;
that workaround is no longer needed.

The command-line contract is now seven agents, all `config_mode: auto`: `codex`,
`claude-code`, `opencode`, `kilo-cli`, `aider`, and — new in `v0.3.0` —
`openclaw` at rank 6 and `hermes` at rank 7. The history is worth keeping because
the site followed each pass and the last one reverses a removal:

- `3217923` listed fourteen agents.
- `4d63d75` cut nine of them but left the code reading three, breaking upstream's
  own build. `fac25e5` restored `cursor`, `openclaw` and `hermes` at ranks 6-8
  and kept the other six deleted.
- `206a610` dropped those three as well, leaving five.
- `v0.3.0` brings `openclaw` and `hermes` back as fully supported entries with
  config adapters. `cursor` stays out.

Because they are now in the installer contract, both were **removed** from
`planned-agents.json` — leaving them there would have listed each agent twice,
once as shipping and once as coming soon. `planned-agents.json` is now empty,
which is a valid state: there is nothing upstream has committed to that it has
not yet shipped.

`guide` remains a valid `config_mode` in upstream's validator and install path,
so a future agent can reintroduce it. Until one does, the site has no agent whose
install route is an official flow, and the activation demo's guide-only phase is
only reachable from a test fixture.

`v0.3.0` also changes the provider data in a way that is not cosmetic: PPIO and
Novita both moved from `relationship: "none"` to `"sponsor"`, each with
disclosure text. The site renders these fields directly, so before this refresh
the published pages read "无商业合作" for two providers upstream declares as
sponsors. Keep this in mind when refreshing: provider changes can carry
disclosure obligations, not just model names.

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
otherwise. This site follows the same rule: the two marks it ships (`codex.svg`,
`opencode.svg`) each have an entry in `public/images/agents/asset-rights.json`,
and the five agents without one render a letter glyph. Adding an agent to the
lock file does not mean adding a mark for it.
