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
- **This repository is being renamed too**, from `OneAgent-site`.
- The site is **live at the custom domain `oneagentpro.ai`** (verified, HTTPS
  enforced, cert covers `oneagentpro.ai` and `www`). The domain is configured in
  the repository's Pages settings, not in a tracked `CNAME` file — so renaming
  the repository does not disturb it, and `SITE_URL` keeps arriving from
  `actions/configure-pages`. A domain change is a separate project from this
  rename; see Group 7.

## Baseline

311 case-insensitive occurrences across 70 tracked text files, plus 5 brand
binaries whose filenames carry the name. `pnpm-lock.yaml` is clean. No
occurrence in `LICENSE` other than the copyright holder, which does not change.

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

## Group 1 — blocked on upstream

These break the moment we change them ahead of upstream, or stay broken until
upstream moves. Do them in the cutover commit, not before.

| Location | Current | Note |
| --- | --- | --- |
| `src/lib/downloads.ts:48` | `RELEASE_REPOSITORY \|\| "MaimoryLab/OneAgent"` | The release feed default. Points at a 404 until upstream's repo is renamed. GitHub redirects renamed repos for the API too, so this keeps working through the rename — but the fallback literal should still end up correct. |
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

- The `-installer.exe` assets do **not** match the regex, which anchors the
  platform-arch pair to the end of the name before the extension. They are
  invisible to the download page today. That is pre-existing behaviour and not
  caused by the rename — worth a separate issue, but do not let it get diagnosed
  as rename fallout later.
- The site is currently a release behind its own data: `data/README.md` records an
  audit against `v0.5.0`. Re-copying the lock files at cutover (step 3) closes
  that gap, so check whether `v0.5.1`–`v0.5.3` changed the contract rather than
  assuming the files are still byte-identical.

## Group 2 — user-visible copy, safe to change now

Independent of upstream. This is the bulk of the work.

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

## Group 3 — the `~/.oneagent/` home directory

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

## Group 4 — identifiers and stored state

- **`localStorage` key `oneagent-theme`** — `src/components/ThemeToggle.astro:39`
  and `src/layouts/BaseLayout.astro:89`. Both must change together or the toggle
  desyncs from the inline theme script. Renaming the key silently resets every
  returning visitor's theme to system default. Cheapest correct option: leave
  the key as-is. It is invisible to users, and a rename buys nothing. If it must
  change, read the old key as a fallback and migrate on first load.
- **`package.json:2`** — `"name": "oneagent-public-site"`. Private package, no
  registry, safe to rename.
- **`RELEASE_REPOSITORY`** — env var name is product-neutral. No change.
- **`SITE_URL` / `BASE_PATH`** — no change, and no hardcoded origin anywhere in
  the repository (checked: no `oneagentpro`, no `github.io`, no tracked `CNAME`).
  `deploy.yml:120-128` reads both from `actions/configure-pages`. See Group 7.

## Group 5 — brand assets

Five binaries carry the name in their filename:

```
public/images/brand/oneagent-app-icon-192.png
public/images/brand/oneagent-app-icon-512.png
public/images/brand/oneagent-logo-mark-256.png
public/images/brand/oneagent-logo.png
public/images/oneagent-overview.jpg
```

Referenced from `public/site.webmanifest:10-11`,
`src/components/BrandMark.astro:6`, `src/layouts/BaseLayout.astro:26`.
`public/favicon.png` has a neutral filename but the same artwork question.

Two separable decisions: (a) rename the files, (b) redraw the artwork. Renaming
alone is a `git mv` plus three reference updates. Redrawing is a design task and
should not block the copy rename. `NOTICE:38-42` describes these as the
product's own mark and notes upstream traces its vector mark from
`oneagent-logo.png` — coordinate (b) with upstream so the two do not diverge.

`public/images/oneagent-overview.jpg` is the default Open Graph image
(`BaseLayout.astro:26`). If it contains rendered UI with the old name in it, it
is stale content regardless of its filename.

## Group 6 — visual snapshots

`e2e/activation.visual.spec.ts-snapshots/` holds 6 PNG baselines. Any rename
that changes rendered text inside `ActivationConsole` invalidates them.
Regenerate with `pnpm exec playwright test --update-snapshots` and eyeball the
diff — a snapshot update is the one step where a real regression can hide behind
an expected change. The `-v040` in the filenames tracks the upstream flow
version, not the product name; leave it.

## Group 7 — renaming this repository

Confirmed as in scope. Verified current state: `MaimoryLab/OneAgent-site` is
public, Pages is enabled and built by workflow, and the custom domain
`oneagentpro.ai` is verified with HTTPS enforced (cert covers apex and `www`,
valid to 2026-11-05).

What makes this low-risk:

- **The domain is not in the repository.** It lives in Pages settings, and there
  is no tracked `CNAME`. A repository rename does not clear it, and the public
  URL does not change — visitors are unaffected.
- **Nothing reads the old slug at runtime.** No hardcoded origin in any tracked
  file; `SITE_URL` and `BASE_PATH` both come from `actions/configure-pages`.
- **GitHub redirects the old slug** for git remotes, HTML and API, so clones and
  any inbound links keep resolving.

What still needs doing:

- `git remote set-url origin` on every local clone. The redirect works, but a
  stale remote is a confusing thing to leave behind. Current: `origin` →
  `https://github.com/MaimoryLab/OneAgent-site.git`.
- `src/lib/downloads.ts:44` names the old slug in a comment explaining why
  `GITHUB_REPOSITORY` must not be used as the release source. Update the name;
  keep the explanation, it is still the reason the code is written this way.
- Confirm Pages and the domain still resolve after the rename before announcing
  anything. `has_pages` and the cert survive a rename, but verify rather than
  assume — this is the one step with a public blast radius.
- Re-check that `deploy.yml`'s `preflight` job still passes. It reads
  `has_pages`/`visibility` from `${GITHUB_REPOSITORY}` at runtime, so it follows
  the rename on its own; no edit expected.

**The `oneagentpro.ai` domain itself is out of scope here.** It carries the old
name and presumably wants to change eventually, but that is a DNS and
cert project with real downtime risk, and it is fully separable from renaming the
code. Do not bundle it into this work.

## Suggested sequencing

The ordering constraint that matters: **the site must not name a path or a
release the shipped binary does not have.** Everything else is free to move.

1. **Now, no upstream dependency** — Group 2 (copy), the changelog note and its
   `title`/`description`, Group 4 `package.json`, Group 5(a) file renames. One
   commit per group, `pnpm run test:all` on each. Regenerate Group 6 snapshots in
   the same commit as the copy change so the diff has one cause.
2. **Ask upstream now, needed before step 4** — does the installer move an
   existing `~/.oneagent/`? Also confirm the final upstream slug and that release
   assets keep the `-<platform>-<arch>` suffix form.
3. **Repository rename (Group 7)** — independent of upstream, can land any time
   after step 1. Verify Pages and `oneagentpro.ai` still serve, then fix local
   remotes and the comment at `src/lib/downloads.ts:44`.
4. **Cutover, only after upstream publishes a renamed release** — Group 1 plus
   Group 3 in one commit, then re-copy the lock files per `data/README.md` so
   `oneagent_version` and aider's `config_path` update from the source rather
   than by hand. Check `v0.5.1`–`v0.5.3` for contract changes while there.
5. **Independent, unscheduled** — Group 5(b) artwork, and the `oneagentpro.ai`
   domain, which is explicitly not part of this work.

## Still open

- **Does the installer migrate an existing `~/.oneagent/`?** The only genuine
  blocker. It decides whether `06-upgrade.md` gets one reassuring sentence or a
  migration procedure, in both locales. Until answered, plan for the harder case.
- **Does `~/.bootagent/` become the literal new path?** Group 3 assumes a
  same-shape rename. Confirm the exact string before editing ten files and a
  pasteable shell command.
- **Not blocking, but worth filing separately:** the `-installer.exe` release
  assets have never matched the download page's asset regex
  (`src/lib/downloads.ts:200`), so Windows installers are not listed today.

## Verification

`pnpm run test:all` — vitest, then `astro check` + `astro build` +
`scripts/validate-build.mjs`, then Playwright. `validate-build.mjs` checks every
emitted page is well-formed, so a broken reference from a renamed asset fails
the build rather than shipping. After the copy change, grep for stragglers:

```bash
git ls-files | grep -v pnpm-lock | xargs grep -in oneagent
```

Expect only the deliberate survivors: `MaimoryLab` in `LICENSE`/`NOTICE`, the
changelog history, and whatever Group 3 defers.
