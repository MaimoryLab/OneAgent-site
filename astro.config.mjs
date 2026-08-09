import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = process.env.SITE_URL ?? "http://localhost:4321";
const rawBase = process.env.BASE_PATH ?? "/";
const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

export default defineConfig({
  site,
  base,
  output: "static",
  // Chinese stays unprefixed so every published URL keeps working; English is
  // additive under /en/.
  i18n: {
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      /* Retired URLs are kept as redirect stubs for inbound links, but they carry
         noindex and a canonical pointing elsewhere. Listing them would ask
         crawlers to index pages that ask not to be indexed. */
      filter: (page) => !/\/help\/02-chatgpt-desktop\/$/.test(page),
    }),
  ],
  build: {
    assets: "_assets",
  },
  vite: {
    build: {
      sourcemap: false,
    },
  },
});
