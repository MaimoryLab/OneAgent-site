# Verifying a change to this site

Traps this repository has actually sprung, and the check that catches each one.
Every entry below is here because it caught something real, or because it failed
to and something shipped that should not have. Written during the BootAgent
rename; the failures cited are from that work.

## A green e2e run can be missing its most relevant coverage

`pnpm run test:e2e` without a token reports **213 passed** or **198 passed**
depending on the GitHub rate limit, and both look like success.

The download page's tests skip themselves when no release is visible
(`e2e/site.spec.ts:371`, `:470`). That is deliberate — a fork with no releases
should not fail the suite — but an exhausted unauthenticated budget looks
identical to a fork. Once `api.github.com` returns 403, the build renders the "not
published yet" state and every download-page assertion skips.

```bash
export GITHUB_TOKEN="$(gh auth token)"   # before test:e2e, every time
```

If the run reports fewer than 213 passed, read the skip list before believing it:

```bash
pnpm exec playwright test --reporter=json 2>/dev/null \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["stats"])'
```

CI injects the token already, so this only bites locally — which is worse, because
local is where you decide whether to push.

## A passing visual snapshot does not mean the baseline is current

`e2e/activation.visual.spec.ts` allows `maxDiffPixels: 1_500`, sized for the
rounded window edge. Text changes inside `ActivationConsole` can fit under it.

The rename changed the brand name rendered in the console sidebar and **all six
baselines still passed**. Left alone they would have kept showing the old product
name indefinitely while reporting green.

Two consequences:

- A snapshot refresh here cannot be justified by "the test failed". Decide whether
  the baseline should change, then make it change.
- `--update-snapshots` only rewrites baselines for *failing* tests. On a passing
  suite it is a no-op that looks like it worked. Use `--update-snapshots=all`.

After regenerating, diff the PNGs rather than trusting the tolerance. For the
rename that meant confirming zero residual below `y=40` and that every remaining
delta was a 2–9 pixel band at `x≈248` / `x≈1067` — the corner rasterisation the
spec's own comment describes.

## Check whether a failure predates your change

The dark-scheme test at `e2e/site.spec.ts:1213` samples
`document.documentElement` at `waitUntil: "commit"` and fails intermittently under
parallel load. It is unrelated to whatever you are changing.

Before attributing any failure to your work, run that test alone, and run it on
`main`:

```bash
pnpm exec playwright test -g "<test name>"
```

Two passes in isolation plus a pass on `main` is enough to call it pre-existing.
Saying "my change broke this" when it did not sends the next person to the wrong
file.

## Bulk find-and-replace will hit the file you exempted

The rename's audit named `src/lib/downloads.ts:48` as must-not-change: the release
feed's repository literal, which pointed at a repository that did not exist yet.
A `sed` sweep over 77 files changed it anyway, breaking the header's GitHub link
and the download page. The e2e suite caught it; the sweep did not.

Exempt by path, in the file list, not by intention:

```bash
git ls-files > /tmp/all.txt
grep -E '^src/' /tmp/all.txt \
  | grep -v -e 'src/lib/downloads.ts' -e 'src/pages/changelog/index.astro' \
  > /tmp/targets.txt
```

Then read the diff of every excluded file's *neighbours* — a sweep that got one
exemption right often got another wrong.

## Verify rendered output, not just source

Source greps miss strings assembled by templating, and they cannot tell a
deliberate survivor from an oversight. The build is the artefact that ships:

```bash
find dist -name '*.html' -exec grep -o '.\{0,45\}OneAgent.\{0,40\}' {} + | sort -u
```

Every line should be explicable. After the rename's copy pass that was 176
deliberate occurrences (upstream URLs, real release asset names quoted from the
live feed, vendored lock text, changelog history) against 799 of the new name.

`pnpm run build` also runs `astro check` and `scripts/validate-build.mjs`, which
fails on a malformed page or a broken reference — so a renamed asset with a stale
reference fails the build rather than shipping. Run it before believing a rename
is complete.

## Confirm a style class exists before using it

`global.css` has `.callout-index` and `.callout-body` but no bare `.callout`.
A `class="callout"` added during the rename rendered unstyled and had to be
replaced with `.hero-note`. Grep `src/styles/global.css` for the selector first.

## Do not edit vendored data

`data/agents.lock.json` and `data/providers.lock.json` are copies of upstream
manifests. They carry upstream's own field names and text. Update them by
re-copying from a released tag per [`data/README.md`](../data/README.md) and
reading the diff — never by hand-editing a field to what you expect it to become.

The same applies to `public/images/guide/asset-rights.json`, which records what is
visible *inside* the macOS screenshots. Editing that text to match a rename makes
the provenance record describe something the images do not show.

## When a tool contradicts itself, park the question

While auditing the upstream lock file, three probe methods returned mutually
exclusive answers about a single field name, including one comparison that
reported identical SHA-256 digests and different files in the same output.

The correct move was to record what each method reported, park the question, and
ask upstream — not to pick the convenient answer and edit a vendored file. Two
contradictory reads is the signal to stop probing; a third costs budget and
produces the worst output yet.

## Renaming binaries

Verify a `git mv` did not re-encode anything, since an image that silently changed
bytes is easy to miss and impossible to spot in review:

```bash
git show "HEAD:$old" | shasum -a 256
shasum -a 256 "$new"
```

If `git status` shows `A` + `D` instead of `R`, the rename detection lost the
pairing (a mid-operation interruption does this). `git add -u` on the deletions
restores it; confirm `R` appears before committing.
