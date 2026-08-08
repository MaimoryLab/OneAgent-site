import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Help articles, one Markdown file per topic per locale.
 *
 * The locale lives in the directory rather than in frontmatter so that a missing
 * translation is visible in the file tree, and so `getCollection` can filter by
 * id prefix without reading every entry. The id of
 * `src/content/help/zh-CN/03-models.md` is `zh-CN/03-models`.
 *
 * This is the site's first content collection. Everything else — the page shell,
 * canonical URL, hreflang alternates, og:image — still comes from BaseLayout, so
 * a Markdown body cannot bypass the guarantees scripts/validate-build.mjs
 * enforces on every emitted page.
 */
const help = defineCollection({
  /* generateId is overridden because the default slugifies the path, which
     lowercases the locale directory: `zh-CN/01-install.md` becomes the id
     `zh-cn/01-install`. Filtering by a `zh-CN/` prefix then silently matched
     nothing and every page rendered empty. Keeping the directory name verbatim
     makes the id agree with the folder it came from. */
  loader: glob({
    base: "./src/content/help",
    pattern: "**/*.md",
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z.object({
    title: z.string(),
    /** Used as the page description, so it has to stand alone in a search result. */
    description: z.string(),
    /* Ordering is explicit rather than taken from the filename: inserting a
       ninth article between two existing ones should not mean renaming the files
       after it, which would break every inbound link to them. */
    order: z.number().int().positive(),
    /** One line for the index page. Shorter than description, and not a summary
     *  of the whole article — it answers "is this the page I need?". */
    summary: z.string(),
  }),
});

export const collections = { help };
