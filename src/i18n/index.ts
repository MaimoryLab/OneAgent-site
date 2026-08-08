export const locales = ["zh-CN", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh-CN";

/** Prefix carried in the URL for each locale; the default locale has none. */
const prefixes: Record<Locale, string> = { "zh-CN": "", en: "en" };

export const htmlLang: Record<Locale, string> = { "zh-CN": "zh-CN", en: "en" };
export const ogLocale: Record<Locale, string> = { "zh-CN": "zh_CN", en: "en_US" };
export const localeNames: Record<Locale, string> = { "zh-CN": "中文", en: "English" };

const base = import.meta.env.BASE_URL;
const baseSegments = base.split("/").filter(Boolean);

/**
 * Reads the locale out of a pathname. Works under a configured base path, where
 * the locale segment is not the first one.
 */
export function localeFromPath(pathname: string): Locale {
  const segments = pathname.split("/").filter(Boolean).slice(baseSegments.length);
  const candidate = segments[0];
  const match = locales.find((locale) => prefixes[locale] && prefixes[locale] === candidate);
  return match ?? defaultLocale;
}

/**
 * Builds an absolute, locale-aware path.
 *
 * Every link has to go through this. Relative hrefs resolve against <base>,
 * which knows nothing about locales, so a relative link on an English page
 * silently lands on the Chinese one — and validate-build.mjs anchors its
 * link check at the root, so it cannot see that happen.
 */
export function localePath(locale: Locale, path = ""): string {
  const clean = path.replace(/^\/+/, "");
  const prefix = prefixes[locale];
  return `${base}${prefix ? `${prefix}/` : ""}${clean}`;
}

/**
 * Routes that exist in every locale. Anything outside this set is Chinese-only
 * for now, and linking it under /en/ would point at a path that was never built
 * — which validate-build.mjs fails the build over. Add a route here in the same
 * change that adds its translation.
 */
export const translatedRoutes = new Set(["", "downloads/", "quickstart/", "explore/", "security/", "help/"]);

/**
 * Prefixes whose every child route is translated, for families generated from a
 * content collection rather than written out one file at a time.
 *
 * `help/` alone would only cover the index: each article is its own route, and
 * listing all eight in the set above would go stale the moment an article is
 * added or renamed. Without this, an article page emitted in both languages
 * declared no hreflang alternates, so nothing told a crawler the two were
 * translations of each other.
 */
const translatedPrefixes = ["help/"];

/** True for a route that exists in every locale, including collection children. */
export function isTranslated(route: string): boolean {
  return translatedRoutes.has(route) || translatedPrefixes.some((prefix) => route.startsWith(prefix));
}

/** Resolves a link to the current locale when translated, Chinese otherwise. */
export function bestLocaleFor(locale: Locale, route: string): Locale {
  return isTranslated(route) ? locale : defaultLocale;
}

/**
 * True when following this link from `locale` lands on a different language.
 *
 * Untranslated routes fall back to Chinese, which is better than a 404 but is a
 * surprise if nothing says so first. Callers use this to mark the link, so the
 * language change is visible before the click rather than after it.
 */
export function switchesLanguage(locale: Locale, route: string): boolean {
  return bestLocaleFor(locale, route) !== locale;
}

/** Strips base and locale, yielding the route shared across languages. */
export function routeWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean).slice(baseSegments.length);
  const first = segments[0];
  if (locales.some((locale) => prefixes[locale] && prefixes[locale] === first)) segments.shift();
  return segments.length ? `${segments.join("/")}/` : "";
}
