import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards the focus indicator against being drawn in a colour nobody can see.
 *
 * WCAG 1.4.11 wants 3:1 for a focus indicator, and the e2e suite already measures
 * the `--focus-ring` token's contrast in both themes. What it cannot measure is
 * whether every rule *uses* that token: `:focus-visible` on a `tabindex="-1"`
 * element is never satisfied by a programmatic `.focus()` — the browser grants it
 * only when focus arrived by keyboard — so a panel focused by script cannot be
 * driven into its focus state from a test at all. Reading the source is what
 * remains, and it is the layer a regression would be introduced at anyway.
 *
 * The rule that prompted this: the activation panel's indicator was
 * `box-shadow: 0 0 0 3px var(--blue-soft)`, and `--blue-soft` is a pale fill
 * (#e8f0fb light, #14283c dark) rather than a ring colour — far below 3:1 on the
 * surface behind it. The panel is a programmatic focus target between steps, so a
 * keyboard user met it on every advance.
 */
const styleSources = () => {
  const files: { path: string; text: string }[] = [];
  const add = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) add(path);
      else if (/\.(astro|css)$/.test(entry.name)) files.push({ path, text: readFileSync(path, "utf8") });
    }
  };
  add(join(process.cwd(), "src"));
  return files;
};

/* Tokens that name a soft fill. These exist to tint a surface, and none of them
   clears the contrast a focus indicator needs. */
const fillTokens = ["--blue-soft", "--green-soft", "--orange-soft", "--red-soft", "--surface-muted", "--surface-pressed"];

describe("focus indicator", () => {
  const sources = styleSources();

  it("finds the stylesheets it is meant to be checking", () => {
    // A path change that silently emptied this list would make every case below
    // pass while checking nothing.
    expect(sources.length).toBeGreaterThan(5);
    expect(sources.some((file) => file.path.endsWith("global.css"))).toBe(true);
  });

  it("never draws a focus indicator in a soft fill colour", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      for (const line of file.text.split("\n")) {
        if (!line.includes(":focus")) continue;
        // A comment discussing the tokens is not a rule using them.
        if (/^\s*(\/\*|\*|\/\/)/.test(line)) continue;
        for (const token of fillTokens) {
          if (line.includes(token)) offenders.push(`${file.path}: ${line.trim()}`);
        }
      }
    }
    expect(offenders, "focus indicators must use --focus-ring, not a surface tint").toEqual([]);
  });

  /* forced-colors discards both `box-shadow` and any authored colour, so a ring
     expressed only as a shadow disappears entirely in Windows High Contrast. Each
     shadow-based indicator needs an outline fallback in a system colour keyword. */
  it("restates shadow-based focus rings for forced-colors", () => {
    for (const file of sources) {
      const shadowRings = file.text
        .split("\n")
        .filter((line) => line.includes(":focus-visible") && line.includes("box-shadow") && !/^\s*(\/\*|\*)/.test(line));
      if (shadowRings.length === 0) continue;
      expect(
        file.text.includes("forced-colors: active"),
        `${file.path} draws a focus ring with box-shadow but has no forced-colors fallback`,
      ).toBe(true);
    }
  });
});
