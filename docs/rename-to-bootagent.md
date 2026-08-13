# Renaming this site from OneAgent to BootAgent

The rename is done in this repository. What remains is one design task and one
DNS problem, both noted at the bottom.

Kept as a record because several of the decisions are not re-derivable from the
diff — particularly the things that were deliberately *not* renamed, and the two
checks that passed while hiding the fact that they had stopped proving anything.

## How it went

| | |
| --- | --- |
| Copy, assets, `package.json`, snapshots | PR #27 |
| Verification checklist | PR #29 |
| Upstream slug, `~/.bootagent/`, catalog refresh, asset matching | PR #30 |
| Repository renamed to `MaimoryLab/BootAgent-site` | done by hand |

Upstream renamed itself and published `v0.6.0` on 2026-08-13, which is what let
the second half land. Before that the site could not name the new repository or
the new home directory without pointing readers at things that did not exist.

The starting point was 311 case-insensitive occurrences across 70 tracked text
files plus 5 brand binaries. `pnpm-lock.yaml` was clean throughout, and `LICENSE`
never needed touching beyond leaving the copyright holder alone.

## What was deliberately not renamed

This is the part worth keeping. Each of these looks like an oversight and is not.

- **`MaimoryLab`** — the org, not the product. `LICENSE`, `NOTICE:2`, `NOTICE:4`.
- **Third-party names** — `codex`, `claude-code`, `openclaw`, `hermes`, `aider`,
  `kilo-cli`, `opencode`, `kimi-code`, ChatGPT Desktop, WorkBuddy, ZCode, and
  everything under `licenses/`.
- **Historical changelog entries.** `src/pages/changelog/index.astro` keeps
  `OneAgent` in the entry bodies, with a note at the top of the page saying the
  product was renamed and when. They record what was true on those dates;
  rewriting them would make them claim otherwise. The page `title` and
  `description` are present-tense chrome and did change.
- **`public/images/guide/asset-rights.json`.** Its `shows` fields quote the text
  visible *inside* the macOS screenshots. Editing them to match the rename would
  make the provenance record describe something the images do not show. They stay
  until the screenshots are retaken.
- **The `oneagent-theme` localStorage key.** Read in `ThemeToggle.astro` and
  `BaseLayout.astro`, which must always agree or the toggle desyncs from the
  inline theme script. The key is invisible to users, so renaming it buys nothing
  and costs something real: every returning visitor's saved theme resets to the
  system default. If it is ever renamed, read the old key as a fallback.
- **Test fixtures describing real past releases.** `downloads.test.ts` and
  `release-channel.test.ts` still carry `OneAgent-*.zip` names for the v0.3.0
  fixture, because v0.3.0 really did ship those. The v0.6.0 fixture beside it uses
  the new names.

## The two traps

Both are written up properly in
[`verification-checklist.md`](verification-checklist.md). Summarised here because
this is the work that sprang them.

**A bulk sweep changed the one file the audit had named as must-not-change.** This
document said `src/lib/downloads.ts` held the release-feed slug and had to wait
for upstream. A `sed` run over 77 files changed it anyway, pointing the header's
GitHub link and the download page at a repository that did not exist yet. The e2e
suite caught it. Exempt by path in the file list, not by intention.

**Two green checks had stopped proving anything.**

- The six visual baselines did not fail when the brand name inside
  `ActivationConsole` changed: the glyph delta is smaller than the spec's
  `maxDiffPixels`, which is sized for the rounded window edge. They would have
  kept showing the old name while reporting success. `--update-snapshots` is also
  a no-op on a passing suite — `=all` is what rebuilds.
- Without `GITHUB_TOKEN` the release feed hits the unauthenticated rate limit,
  the build renders "not published yet", and the download-page tests *skip*. The
  run reports a green 198 instead of 213 with coverage missing exactly where a
  rename does its damage.

## What v0.6.0 brought besides the rename

The catalog refresh was not cosmetic, and two of its consequences were latent
bugs rather than new content. Both are the same shape: code that was correct for
the values that existed when it was written.

- **`route-present-unverified`** had no label *and* fell through to the
  unsupported verdict, which would have printed 不支持 against a provider that
  publishes the route. It now reads as the same kind of gate as
  `release-candidate-required`.
- **The provider page's status note** was a ternary whose else branch asserted the
  protocol was implemented — true for the two statuses then in the data, false the
  moment `not-supported` arrived.
- New: `kimi-code`, and DeepSeek and Moonshot as providers. 47 pages to 50.
- `oneagent_version` became `bootagent_version` and aider's `config_path` moved,
  both arriving from the re-copy rather than by hand. That is the point of the
  procedure in [`../data/README.md`](../data/README.md): re-copy and read the
  diff instead of predicting what a field will be called.

## The `~/.oneagent/` migration

The installer does migrate, and the detail matters because `06-upgrade.md` had to
describe it. Read from upstream's `internal/app/migration.go`, not assumed:

- Copies `~/.oneagent/` into `~/.bootagent/`, **excluding `runtimes/`**.
- Rewrites the provider entry naming the old product in each agent's own config —
  Codex, OpenCode, Kilo, OpenClaw, Kimi Code, ZCode. User-added providers untouched.
- Renames the original to `~/.oneagent-migrated-<timestamp>` and keeps it.

So it is not a one-line reassurance: managed Node, uv and installed agents are
outside the copy and have to be reinstalled. Configuration survives, executables
do not.

## Still open

- **`bootagent.ai` does not serve the site.** Pages is configured for it, but its
  DNS points at a registrar parking page (`15.197.148.33`, `3.33.130.190`) rather
  than GitHub Pages (`185.199.108-111.153`). The old domain now 404s because Pages
  no longer claims it, and `maimorylab.github.io/...` 301-redirects to the parking
  page — so there is currently no working URL. The Pages setting was changed before
  the DNS was pointed; fixing it needs DNS access this repository does not have.
  `https_enforced` is off and no certificate is provisioned yet either.
- **The artwork is still the pre-rename drawing.** Filenames are `bootagent-*` and
  verified byte-identical across the `git mv`, but nothing was redrawn.
  `public/favicon.png` has a neutral filename and the same question. `NOTICE`
  records that the product repository traces its vector mark from
  `bootagent-logo.png`, so coordinate any redraw with upstream.
  `public/images/bootagent-overview.jpg` is the default Open Graph image and worth
  a look — if it shows UI carrying the old name it is stale content whatever it is
  called.
- **The macOS screenshots** under `public/images/guide/` show dialogs naming the
  old product. Retaking them is the only honest way to update those strings, and
  it also clears the `asset-rights.json` entries above.

## Verification

```bash
export GITHUB_TOKEN="$(gh auth token)"   # or the download tests silently skip
pnpm run test:all
```

Then check the rendered output rather than the source, since a source grep cannot
tell a deliberate survivor from an oversight:

```bash
find dist -name '*.html' -exec grep -o '.\{0,45\}OneAgent.\{0,40\}' {} + | sort -u
```

Every line should be explicable as one of the survivors listed above: the
changelog history and its note, the screenshot provenance, and the real release
asset names quoted from the live feed for older versions.
