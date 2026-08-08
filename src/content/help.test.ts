import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/*
 * Guards the help collection against the drift nothing else catches.
 *
 * `astro check` validates each file against the schema, and the build fails on a
 * broken link — but neither notices that the English directory has seven articles
 * where Chinese has eight. That would ship an /en/help/ index quietly missing a
 * page, with no error anywhere.
 *
 * Read from disk rather than through getCollection: importing astro:content pulls
 * in the Vite content pipeline, and these assertions are about the files.
 */
const root = join(process.cwd(), "src/content/help");
const locales = ["zh-CN", "en"] as const;

interface Article {
  slug: string;
  order: number;
  fields: Record<string, string>;
}

function read(locale: string): Article[] {
  return readdirSync(join(root, locale))
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const text = readFileSync(join(root, locale, name), "utf8");
      const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      const fields: Record<string, string> = {};
      for (const line of frontmatter.split("\n")) {
        const match = line.match(/^([a-z]+):\s*(.+)$/);
        if (match) fields[match[1]] = match[2].trim();
      }
      return { slug: name.replace(/\.md$/, ""), order: Number(fields.order), fields };
    });
}

describe("help collection", () => {
  const byLocale = new Map(locales.map((locale) => [locale, read(locale)]));

  it("has the same articles in every locale", () => {
    const [reference, ...others] = locales.map((locale) => ({
      locale,
      slugs: byLocale.get(locale)!.map((article) => article.slug).sort(),
    }));
    for (const other of others) {
      expect(other.slugs, `${other.locale} does not match ${reference.locale}`).toEqual(reference.slugs);
    }
  });

  it("is not empty", () => {
    // A loader misconfiguration once made getCollection return nothing while the
    // build still succeeded, rendering an index page with no entries.
    expect(byLocale.get("zh-CN")!.length).toBeGreaterThan(0);
  });

  for (const locale of locales) {
    describe(locale, () => {
      const articles = byLocale.get(locale)!;

      it("gives every article a title, description, order and summary", () => {
        for (const article of articles) {
          for (const field of ["title", "description", "order", "summary"]) {
            expect(article.fields[field], `${locale}/${article.slug} is missing ${field}`).toBeTruthy();
          }
        }
      });

      /* Order decides both the index sequence and the previous/next links. A
         duplicate makes that sequence depend on filesystem order, which differs
         between machines. */
      it("orders articles uniquely", () => {
        const orders = articles.map((article) => article.order);
        expect(new Set(orders).size, `${locale} has duplicate order values`).toBe(orders.length);
      });

      it("agrees with the other locale on each article's position", () => {
        for (const article of articles) {
          const counterpart = byLocale
            .get(locale === "zh-CN" ? "en" : "zh-CN")!
            .find((candidate) => candidate.slug === article.slug);
          if (counterpart) {
            expect(article.order, `${article.slug} is ordered differently per locale`).toBe(counterpart.order);
          }
        }
      });
    });
  }

  /* Body links are absolute so they resolve against <base> rather than the
     current directory. An English article linking `/help/…` instead of
     `/en/help/…` silently lands the reader on the Chinese page — the build
     cannot catch it, because both paths exist. */
  it("keeps English body links inside the English tree", () => {
    for (const article of byLocale.get("en")!) {
      const text = readFileSync(join(root, "en", `${article.slug}.md`), "utf8");
      const stray = [...text.matchAll(/\]\((\/(?!en\/)[a-z0-9/-]+\/)\)/g)].map(([, href]) => href);
      /* A link that leaves English on purpose is allowed, but only when the
         source says so beside it — the same hint the nav uses. */
      const unmarked = stray.filter((href) => !text.includes(`](${href})<span class="lang-hint"`));
      expect(unmarked, `en/${article.slug} links to Chinese without a hint`).toEqual([]);
    }
  });
});
