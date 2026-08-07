import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import rights from "../../public/images/agents/asset-rights.json";

/*
 * The rule this file enforces was established the hard way. The site once shipped
 * eight vendor marks with no provenance record at all — three with no auditable
 * basis anywhere, and three that were full-colour vendor logos rather than the
 * MIT-licensed glyphs their filenames implied. Nothing failed, because nothing
 * checked.
 *
 * Upstream guards the same invariant in agents.test.tsx. Without an equivalent
 * here, a mark can be dropped into public/images/agents/ and reach the published
 * site with no licence, which is a copyright problem and a trademark one besides.
 */
/* Resolved from the working directory rather than import.meta.url: under Vite the
   latter yields a /@fs/-prefixed virtual path that readdirSync cannot open. */
const directory = join(process.cwd(), "public/images/agents");
const licensesDirectory = join(process.cwd(), "licenses");

const imageFiles = readdirSync(directory).filter((name) => name !== "asset-rights.json");
const recorded = Object.entries(rights.assets as Record<string, Record<string, string>>);

describe("bundled agent marks are auditable", () => {
  // The two directions are separate failures. An unrecorded file is a licensing
  // hazard; a record with no file is a stale manifest that would let the next
  // reader believe an absent mark is covered.
  it("records every image that ships, and ships every image it records", () => {
    expect(imageFiles.map((name) => name.replace(/\.(svg|png)$/, "")).sort())
      .toEqual(recorded.map(([id]) => id).sort());
  });

  for (const [id, asset] of recorded) {
    describe(id, () => {
      it("names a source, licence, owner and licence text", () => {
        for (const field of ["file", "source", "license", "licenseSource", "copyrightOwner"]) {
          expect(asset[field], `${id} is missing ${field}`).toBeTruthy();
        }
        expect(asset.source, `${id} source must be a URL`).toMatch(/^https?:\/\//);
      });

      // A digest that does not match means the file was edited, replaced, or came
      // from somewhere other than the recorded source. Any of the three
      // invalidates the licence claim, which is the whole point of recording it.
      it("matches its recorded SHA-256", () => {
        expect(asset.sha256, `${id} has no digest`).toMatch(/^[a-f0-9]{64}$/);
        const digest = createHash("sha256").update(readFileSync(join(directory, asset.file))).digest("hex");
        expect(digest, `${id} does not match its recorded digest`).toBe(asset.sha256);
      });

      it("points at a licence text that exists", () => {
        const name = asset.licenseSource.replace(/^licenses\//, "");
        expect(readdirSync(licensesDirectory), `${id} references a missing licence`).toContain(name);
      });
    });
  }
});
