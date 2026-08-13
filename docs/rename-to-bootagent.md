# Renaming this site from OneAgent to BootAgent

Audit of every place the old name appears in this repository, grouped by what
each one is coupled to. Scope: this repository only. The product repository
(`MaimoryLab/OneAgent`) is being renamed separately by its owner; this plan
records what we depend on from it and what has to wait for it.

## Decisions taken

- **Historical changelog entries keep the old name.** They describe what the
  product was called on those dates.
- **`~/.oneagent/` is migrating** to the new name. Whether the installer moves
  existing data is still unconfirmed, which is what gates Group 3.
- **This repository is being renamed too**, from `OneAgent-site` to
  **`BootAgent-site`** — matching its existing capitalisation rather than the
  all-lowercase package name. Deferred to the cutover so the product and the site
  change name in one visible move; see Group 7 for why that costs nothing.
- The site is **live at the custom domain `oneagentpro.ai`** (verified, HTTPS
  enforced, cert covers `oneagentpro.ai` and `www`). The domain is configured in
  the repository's Pages settings, not in a tracked `CNAME` file — so renaming
  the repository does not disturb it, and `SITE_URL` keeps arriving from
  `actions/configure-pages`. A domain change is a separate project from this
  rename; see Group 7.

## Baseline

At the start of this work: 311 case-insensitive occurrences across 70 tracked text
files, plus 5 brand binaries whose filenames carry the name. `pnpm-lock.yaml` is
clean. No occurrence in `LICENSE` other than the copyright holder, which does not
change.

After Group 2 landed, the rendered site carries 799 uses of the new name and 176
of the old. Every one of those 176 is deliberate — upstream repository URLs, the
real release asset names the download page quotes from the live feed, the vendored
lock files' sponsor and guide text, the changelog history, and the
`RELEASE_REPOSITORY` fallback. Re-check that split with the grep under
[Verification](#verification) rather than trusting this number.

## What must NOT be renamed

- **`MaimoryLab`** — the org, not the product. It appears in `LICENSE:190`,
  `NOTICE:2`, `NOTICE:4`. Leave all three alone.
- **Third-party names** — `codex`, `claude-code`, `openclaw`, `hermes`,
  `aider`, `kilo-cli`, `opencode`, `cursor`, ChatGPT Desktop, WorkBuddy, and the
  vendored licenses under `licenses/`.
- **Historical changelog entries** — `src/pages/changelog/index.astro:16,17`
  keep `OneAgent` in the entry bodies. Decided. Add a one-line note at the top of
  the page saying the product was renamed and when, so a reader is not left
  wondering why the old name appears. `changelog/index.astro:4` is the page
  `title`/`description`, which is present-tense chrome — that one *does* change.

## Group 1 — upstream repository references · BLOCKED on upstream

These break the moment we change them ahead of upstream, or stay broken until
upstream moves. Do them in the cutover commit, not before.

| Location | Current | Note |
| --- | --- | --- |
| `src/lib/downloads.ts:48` | `RELEASE_REPOSITORY \|\| "MaimoryLab/OneAgent"` | The release feed default, and the source of the header's GitHub link. `MaimoryLab/BootAgent` is still an unclaimed slug — verified — so changing this now breaks both. GitHub redirects renamed repos for the API too, so it keeps working *through* the rename; the literal just has to end up correct afterwards. The line carries a comment saying this, because it looks exactly like something a later sweep would "finish". |
| `src/lib/downloads.test.ts:270` | asserts `MaimoryLab/OneAgent` | Must change in the same commit as the line above or the suite fails. |
| `e2e/site.spec.ts:678,683` | header GitHub link assertions | Same coupling. |
| `data/README.md:4,34` | `raw.githubusercontent.com/MaimoryLab/OneAgent/$tag/manifests/` | The lock-file refresh command. Update when upstream's path is final. |
| `data/agents.lock.json:3` | `"oneagent_version": "0.2.0-dev"` | A vendored upstream field. **Do not hand-edit** — it changes when we re-copy from a renamed upstream tag. Verified no code reads this key. |
| `.github/workflows/deploy.yml:13` | comment naming the dispatch sender | The `repository_dispatch` type `upstream-release` is name-neutral, so the trigger itself survives. Comment only. |

**Asset-name matching is safe.** `src/lib/downloads.ts:196-200` matches on the
`-<platform>-<arch>.<ext>` suffix, not on the product prefix. Renamed release
assets (`BootAgent-darwin-arm64.zip`) are picked up with no code change. The
literal `OneAgent-*.zip` strings in `src/lib/downloads.test.ts:177-180,194` and
`src/lib/release-channel.test.ts:25,87` are fixtures — rename them for
readability, but they are not what makes the page work.

Confirmed against the live feed: upstream's current release is `v0.5.3`, shipping
`OneAgent-{darwin,windows}-{amd64,arm64}.{zip,dmg}`,
`OneAgent-windows-{amd64,arm64}-installer.exe`, and `SHA256SUMS`. Two things to
carry into the cutover:

- Asset *matching* survives the rename, but it is already lossier than it looks:
  the `-installer.exe` assets never match, and the macOS format is chosen by feed
  order. See #28. Fix or decide that separately from the rename, and do not let it
  get diagnosed as rename fallout later.
- The site is currently a release behind its own data: `data/README.md` records an
  audit against `v0.5.0`. Re-copying the lock files at cutover closes that gap, so
  check whether `v0.5.1`–`v0.5.3` changed the contract rather than assuming the
  files are still byte-identical.

## Group 2 — user-visible copy · DONE

Independent of upstream, and the bulk of the work. Landed in PR #27; the inventory
below is kept as the record of what was in scope.

- `src/i18n/ui.ts` — 8 occurrences, both locales: `site.title`, `nav.home`,
  `github.label`, `github.labelWithCount`.
- `src/i18n/catalog.ts` — 14 occurrences, both locales, including the
  `auto: "OneAgent-managed"` / `"OneAgent 可管理"` labels.
- `src/components/` — `Header.astro:38`, `Footer.astro:49,67`,
  `ActivationConsole.astro`, `CompatibilityExplorer.astro`,
  `DownloadSelector.astro`, `HeroParticles.astro`.
- `src/pages/` — 26 files. Heaviest: `quickstart/index.astro` (16),
  `en/quickstart/index.astro` (15), `agents/[id].astro` (9),
  `security/index.astro` and `en/security/index.astro` (7 each).
- `src/content/help/` — 16 markdown files, `en` and `zh-CN` in parallel. Keep
  the two locales in step; every string below has a mirror.
- `public/llms.txt` (5), `public/site.webmanifest` (`name`, `short_name`).
- `README.md` (4), `NOTICE:1,38,58` (the product-name uses, not the org ones).

Two e2e assertions match on Chinese copy and must change with it:
`e2e/site.spec.ts:490,516` assert `"OneAgent 可管理安装"` / `"OneAgent 可管理配置"`.

## Group 3 — the `~/.oneagent/` home directory · BLOCKED on upstream

Confirmed: the directory is migrating to the new name. The site documents the
directory the installer actually creates, so **these edits ship with the
renamed binary, not before it** — documenting `~/.bootagent/` while the released
build still creates `~/.oneagent/` sends every reader to a path that does not
exist on their disk.

Documented in 10 places:

| Location | Kind |
| --- | --- |
| `src/content/help/{en,zh-CN}/01-install.md:34` | "the app's own directory" |
| `src/content/help/{en,zh-CN}/01-install.md:38` | managed Node runtime path |
| `src/content/help/{en,zh-CN}/03-models.md:35` | a copy-pasteable `aider --env-file` command |
| `src/content/help/{en,zh-CN}/06-upgrade.md:22` | "config templates are kept" |
| `src/content/help/{en,zh-CN}/08-troubleshooting.md:41` | managed Node runtime path |
| `src/pages/security/index.astro:31`, `src/pages/en/security/index.astro:38` | the list of files a key may be written to |
| `data/activation-demo.json:99` | `environment_summary` in the walkthrough contract |
| `data/agents.lock.json:118` | aider's `config_path`, **vendored — re-copy, don't edit** |
| `e2e/site.spec.ts:96` | asserts the demo renders `~/.oneagent/profile.json` |

Note `03-models.md:35` is a command a user pastes into a shell. A wrong path
there fails visibly, which is the strongest argument for keeping this group
pinned to the binary.

### The migration question that is still open

Whether the installer *moves* an existing `~/.oneagent/` is unconfirmed, and the
answer changes what we write, not just where:

- **If it migrates automatically** — a sentence in `06-upgrade.md` (both locales)
  saying the directory was renamed and the upgrade moved it. `06-upgrade.md:22`
  currently promises "配置模版存在 `~/.oneagent/` 里，也保留" / "Configuration
  templates live in `~/.oneagent/` and are kept too". That promise must stay true
  in its new form: kept *and moved*.
- **If it does not** — the same file needs real migration steps, and users with an
  existing install have two directories. That is a bigger content change than a
  find-and-replace, and it is the case to plan for until told otherwise.

Either way `06-upgrade.md` gains content rather than just swapping a string. Ask
upstream before writing it; do not guess which sentence to write.

## Group 4 — identifiers and stored state · DONE

- **`localStorage` key `oneagent-theme` — deliberately kept.** Read in
  `src/components/ThemeToggle.astro` and `src/layouts/BaseLayout.astro`; the two
  must always agree or the toggle desyncs from the inline theme script. The key is
  invisible to users, so renaming it buys nothing and costs something real: every
  returning visitor's saved theme silently resets to the system default. If a
  future change does rename it, read the old key as a fallback and migrate on
  first load rather than dropping it.
- **`package.json:2`** — was `"name": "oneagent-public-site"`, now
  `bootagent-public-site`. Private package, no registry, so this was safe to
  rename on its own. **DONE.**
- **`RELEASE_REPOSITORY`** — env var name is product-neutral. No change.
- **`SITE_URL` / `BASE_PATH`** — no change, and no hardcoded origin anywhere in
  the repository (checked: no `oneagentpro`, no `github.io`, no tracked `CNAME`).
  `deploy.yml:120-128` reads both from `actions/configure-pages`. See Group 7.

## Group 5 — brand assets · (a) DONE, (b) not started

Two separable decisions: **(a) rename the files — done. (b) redraw the artwork —
not started.**

(a) Five binaries carried the name in their filename and are now `bootagent-*`:

```
public/images/brand/bootagent-app-icon-192.png
public/images/brand/bootagent-app-icon-512.png
public/images/brand/bootagent-logo-mark-256.png
public/images/brand/bootagent-logo.png
public/images/bootagent-overview.jpg
```

Referenced from `public/site.webmanifest`, `src/components/BrandMark.astro` and
`src/layouts/BaseLayout.astro`, all updated. Verified byte-identical across the
rename by SHA-256, since a `git mv` that silently re-encodes an image would be
easy to miss.

(b) The artwork itself is unchanged and still the pre-rename drawing.
`public/favicon.png` has a neutral filename but the same question. `NOTICE`
records these as the product's own mark and notes that the product repository
traces its vector mark from `bootagent-logo.png` — coordinate any redraw with
upstream so the two do not diverge. This is a design task and was correctly not
allowed to block the copy rename.

`public/images/bootagent-overview.jpg` is the default Open Graph image
(`BaseLayout.astro:26`). **Worth a look before the cutover:** if it shows rendered
UI containing the old name, it is stale content regardless of its filename, and it
is the image every social and chat preview of the site renders.

## Group 6 — visual snapshots · DONE

`e2e/activation.visual.spec.ts-snapshots/` holds 6 PNG baselines, all regenerated.
The `-v040` in the filenames tracks the upstream flow version, not the product
name; it stays.

Two things here surprised me and are worth knowing before the cutover touches this
console again:

- **The snapshots did not fail on the rename.** `ActivationConsole` renders the
  brand name in the sidebar, well inside the captured region, but the glyph
  difference is smaller than the spec's `maxDiffPixels: 1_500` — a tolerance sized
  for the rounded window edge. Left alone, the baselines would have kept showing
  the old name indefinitely while reporting green. They were updated deliberately,
  not because a test demanded it.
- **`--update-snapshots` does not rewrite a passing snapshot.** It only replaces
  baselines for tests that fail. Since these passed, it was a no-op and the files
  were untouched; `--update-snapshots=all` is what actually rebuilds them.

Because the tolerance hides small text changes, a snapshot refresh here cannot be
justified by "the test failed, so I updated it". Diff the old and new PNGs
properly. For the Group 2 refresh that meant a per-pixel comparison: zero residual
below `y=40`, and every remaining delta a 2–9 pixel band at the rounded corners
(`x≈248`, `x≈1067`) — i.e. exactly the rasterisation the spec's comment describes,
and no layout shift.

## Group 7 — renaming this repository · scheduled for cutover

Target slug: **`MaimoryLab/BootAgent-site`** (verified unclaimed). Scheduled for
the cutover alongside Group 1, not before — the work is independent, but doing
both at once means one name change visible to the outside rather than two.

Verified current state: `MaimoryLab/OneAgent-site` is public, Pages is enabled and
built by workflow, and the custom domain `oneagentpro.ai` is verified with HTTPS
enforced (cert covers apex and `www`, valid to 2026-11-05).

What makes this low-risk:

- **The domain is not in the repository.** It lives in Pages settings, and there
  is no tracked `CNAME`. A repository rename does not clear it, and the public
  URL does not change — visitors are unaffected.
- **Nothing reads the old slug at runtime.** No hardcoded origin in any tracked
  file; `SITE_URL` and `BASE_PATH` both come from `actions/configure-pages`.
- **GitHub redirects the old slug** for git remotes, HTML and API, so clones and
  any inbound links keep resolving.

Checklist for the cutover:

1. `gh repo rename BootAgent-site --repo MaimoryLab/OneAgent-site`. Requires
   admin, which the current operator has.
2. Verify `oneagentpro.ai` still serves and `has_pages` is still true. The cert
   and CNAME survive a rename, but this is the one step with a public blast
   radius, so check rather than assume.
3. `git remote set-url origin` on every local clone. The redirect keeps working,
   but a stale remote is a confusing thing to leave behind.
4. Confirm `deploy.yml`'s `preflight` job still passes. It reads
   `has_pages`/`visibility` from `${GITHUB_REPOSITORY}` at runtime, so it follows
   the rename on its own; no edit expected.

`src/lib/downloads.ts` no longer names the old site slug — the comment there was
reworded to "this repository" so it stays correct through the rename. The
`RELEASE_REPOSITORY` fallback in the same file is a *different* slug (the product
repository) and belongs to Group 1.

**The `oneagentpro.ai` domain itself is out of scope here.** It carries the old
name and presumably wants to change eventually, but that is a DNS and
cert project with real downtime risk, and it is fully separable from renaming the
code. Do not bundle it into this work.

## Sequencing

The ordering constraint that matters: **the site must not name a path or a
release the shipped binary does not have.** Everything else is free to move.

1. **Done** — Group 2 (copy), the changelog note and its `title`/`description`,
   Group 4 `package.json`, Group 5(a) file renames, Group 6 snapshots. Landed as
   one commit with `pnpm run test:all` green; PR #27.
2. **Ask upstream, needed before step 3** — does the installer move an existing
   `~/.oneagent/`? Also confirm the final upstream slug and that release assets
   keep the `-<platform>-<arch>` suffix form.
3. **Cutover, only after upstream publishes a renamed release** — Group 1, Group 3
   and Group 7 together, so the product and the site change name in one move:
   - the release-feed slug and its test fixtures, plus the `data/README.md` refresh
     command;
   - the ten `~/.oneagent/` sites, with whatever `06-upgrade.md` needs once the
     migration behaviour is known;
   - re-copy the lock files per `data/README.md` so `oneagent_version` and aider's
     `config_path` update from the source rather than by hand — and check
     `v0.5.1`–`v0.5.3` for contract changes while there;
   - rename the repository to `BootAgent-site` per the Group 7 checklist.
4. **Independent, unscheduled** — Group 5(b) artwork, and the `oneagentpro.ai`
   domain, which is explicitly not part of this work.

## Still open

- **Does the installer migrate an existing `~/.oneagent/`?** The only genuine
  blocker. It decides whether `06-upgrade.md` gets one reassuring sentence or a
  migration procedure, in both locales. Until answered, plan for the harder case.
- **Does `~/.bootagent/` become the literal new path?** Group 3 assumes a
  same-shape rename. Confirm the exact string before editing ten files and a
  pasteable shell command.
- **Not blocking, filed as #28:** the `-installer.exe` release assets have never
  matched the download page's asset regex, so the Windows installers are not
  listed — and the macOS `.dmg` wins over its `.zip` only because feed order
  happens to favour it. Pre-existing, unrelated to the rename, but it lives in the
  same function the cutover touches, so read #28 before editing
  `releaseTargets`.

## Verification

`pnpm run test:all` — vitest, then `astro check` + `astro build` +
`scripts/validate-build.mjs`, then Playwright. `validate-build.mjs` checks every
emitted page is well-formed, so a broken reference from a renamed asset fails the
build rather than shipping.

**Export `GITHUB_TOKEN` before running the e2e suite locally:**

```bash
export GITHUB_TOKEN="$(gh auth token)"
```

Without it the release feed hits the unauthenticated 60-per-hour limit and returns
403. The build degrades to the "not published yet" state by design, and
`site.spec.ts:371`/`:470` then **skip** every download-page test rather than
failing. The run reports a green `198 passed` instead of `213`, having silently
dropped coverage on the pages a rename touches most. `ci.yml` already injects the
token, so CI is unaffected — this only bites locally, and it looks like success.

Then grep for stragglers:

```bash
git ls-files | grep -v pnpm-lock | xargs grep -in oneagent
```

Expect only the deliberate survivors: `MaimoryLab/OneAgent` and the
`RELEASE_REPOSITORY` fallback, the vendored `data/*.lock.json`, the ten
`~/.oneagent/` paths, the changelog history, the macOS screenshot provenance
records, and the `oneagent-theme` storage key.

Checking the rendered output is the stronger test, since it catches a string that
only appears after templating:

```bash
find dist -name '*.html' -exec grep -o '.\{0,45\}OneAgent.\{0,40\}' {} + | sort -u
```

Every line it prints should be explicable as one of the survivors above. After
Group 2 that was 176 occurrences against 799 of the new name.
