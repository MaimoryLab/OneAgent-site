import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import rights from "../../public/images/agents/asset-rights.json";
import guideRights from "../../public/images/guide/asset-rights.json";

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

/* The two manifests record different things and so require different fields.
   Agent marks are third-party artwork redistributed under a licence, so each
   names one and points at its text. The guide screenshots picture macOS system
   UI, where the basis is fair use rather than a grant — they carry `shows` and
   `basis` instead, and demanding a `license` of them would be asserting a grant
   that was never made. What both must have is a source, an owner, and a digest. */
const universalFields = ["file", "source", "copyrightOwner"];

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
        for (const field of [...universalFields, "license", "licenseSource"]) {
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

/* public/images/guide/ carries its own manifest and had no guard at all, which is
   the same gap this file was written to close for the agent marks — a screenshot
   could be swapped for one containing an account name or device name and nothing
   would notice. NOTICE states these contain no identifying detail; the digests are
   what make that claim checkable. */
const guideDirectory = join(process.cwd(), "public/images/guide");
const guideFiles = readdirSync(guideDirectory).filter((name) => name !== "asset-rights.json");
const guideRecorded = Object.entries(guideRights.assets as Record<string, Record<string, string>>);

describe("guide screenshots are auditable", () => {
  it("records every screenshot that ships, and ships every one it records", () => {
    expect(guideFiles.map((name) => name.replace(/\.(png|jpg|jpeg)$/, "")).sort())
      .toEqual(guideRecorded.map(([id]) => id).sort());
  });

  for (const [id, asset] of guideRecorded) {
    describe(id, () => {
      it("names what it shows, its source, owner and the basis for including it", () => {
        for (const field of [...universalFields, "shows", "basis"]) {
          expect(asset[field], `${id} is missing ${field}`).toBeTruthy();
        }
      });

      it("matches its recorded SHA-256", () => {
        expect(asset.sha256, `${id} has no digest`).toMatch(/^[a-f0-9]{64}$/);
        const digest = createHash("sha256").update(readFileSync(join(guideDirectory, asset.file))).digest("hex");
        expect(digest, `${id} does not match its recorded digest`).toBe(asset.sha256);
      });
    });
  }
});
