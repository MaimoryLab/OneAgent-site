import type { Locale } from "./index";

/**
 * Chrome and shared-component copy. Page prose stays in the page templates —
 * only strings reused across pages, or read by more than one component, belong
 * here.
 */
const strings = {
  "zh-CN": {
    "site.title": "BootAgent — 可信的本地 AI 开发环境激活器",
    /* Names the agents and protocols by hand. The previous copy ("用一个可信的本地
       流程，激活你自己的 Agent、账号和 Provider。") described the flow without ever
       saying what it operates on, so it matched no query and gave a search engine
       nothing to prefer over the page's own text — which on the home page is
       mostly demo-console labels. */
    "site.description": "BootAgent 在本机检测并安装 Claude Code、Codex、OpenCode 等编码 Agent，连接 OpenAI 或 Anthropic 兼容的 Provider，写入配置前先验证协议并自动备份。API Key 与配置只留在你自己的电脑上。",
    "skip.main": "跳到主要内容",
    "nav.home": "BootAgent 首页",
    "nav.downloads": "下载",
    "nav.quickstart": "快速开始",
    "nav.help": "帮助文档",
    "nav.explorer": "配置",
    "nav.agents": "Agent",
    "nav.providers": "Provider",
    "nav.support": "支持",
    "nav.changelog": "更新日志",
    "nav.primary": "主导航",
    "nav.mobile": "移动端导航",
    "nav.openMenu": "打开导航菜单",
    /* Only ever shown on an English page, where it warns that the target has no
       translation yet. A Chinese reader never sees it, but the key exists in both
       dictionaries so useTranslations stays exhaustive. */
    "nav.chineseOnly": "仅中文",
    "nav.menu": "菜单",
    /* The header button says what it downloads, not which channel it is. The
       channel is a property of today's build, and the download page states it in
       full — a chrome button that reads "下载预览版" on every page of the site made
       "preview" the loudest word about the product. */
    "cta.download": "下载 BootAgent",
    "theme.toggle": "切换深色模式",
    "lang.switch": "切换语言",
    "breadcrumb.label": "面包屑",
    "breadcrumb.home": "首页",
    "footer.tagline": "可信的本地 AI 开发环境激活器。",
    "footer.boundary": "不提供共享 Key，不代理模型请求，不重新分发第三方 Agent。",
    "footer.start": "开始",
    "footer.capability": "能力",
    "footer.trust": "信任",
    "footer.downloadCenter": "下载中心",
    "footer.agentCatalog": "Agent 兼容目录",
    "footer.providerCatalog": "Provider 目录",
    "footer.supportFeedback": "支持与反馈",
    "footer.releaseIndex": "GitHub Releases",
    /* A link to the page that states the channel in full, rather than the raw
       slug it used to print. A channel id is release-feed vocabulary and means
       nothing to a reader who has not already read /security/ — where the
       channel, each platform's signing status and what the channel does not
       claim are all set out. */
    "footer.channel": "发行渠道与完整性",
    /* The count is as fresh as the last deploy, so the label says "查看源码"
       rather than implying a live figure. */
    "github.label": "在 GitHub 上查看 BootAgent 源码",
    "github.labelWithCount": "在 GitHub 上查看 BootAgent 源码，已获 {count} 个 star",
  },
  en: {
    "site.title": "BootAgent — a trustworthy local AI development environment activator",
    /* See the Chinese entry for why this names agents and protocols outright. */
    "site.description": "BootAgent detects and installs coding agents like Claude Code, Codex and OpenCode on your own machine, connects them to any OpenAI- or Anthropic-compatible provider, and verifies the protocol and backs up existing config before writing anything. Your API keys never leave your computer.",
    "skip.main": "Skip to main content",
    "nav.home": "BootAgent home",
    "nav.downloads": "Downloads",
    "nav.quickstart": "Quickstart",
    "nav.help": "Help",
    "nav.explorer": "Explorer",
    "nav.agents": "Agents",
    "nav.providers": "Providers",
    "nav.support": "Support",
    "nav.changelog": "Changelog",
    "nav.primary": "Primary navigation",
    "nav.mobile": "Mobile navigation",
    "nav.openMenu": "Open navigation menu",
    "nav.chineseOnly": "in Chinese",
    "nav.menu": "Menu",
    /* See the Chinese entry. */
    "cta.download": "Download BootAgent",
    "theme.toggle": "Toggle dark mode",
    "lang.switch": "Change language",
    "breadcrumb.label": "Breadcrumb",
    "breadcrumb.home": "Home",
    "footer.tagline": "A trustworthy local AI development environment activator.",
    "footer.boundary": "No shared keys, no proxied model requests, no redistribution of third-party agents.",
    "footer.start": "Start",
    "footer.capability": "Capabilities",
    "footer.trust": "Trust",
    "footer.downloadCenter": "Download centre",
    "footer.agentCatalog": "Agent compatibility",
    "footer.providerCatalog": "Provider catalogue",
    "footer.supportFeedback": "Support & feedback",
    "footer.releaseIndex": "GitHub Releases",
    /* See the Chinese entry. */
    "footer.channel": "Release channel & integrity",
    "github.label": "View the BootAgent source on GitHub",
    "github.labelWithCount": "View the BootAgent source on GitHub, {count} stars",
  },
} as const;

export type UIKey = keyof (typeof strings)["zh-CN"];

export function useTranslations(locale: Locale) {
  return (key: UIKey): string => strings[locale][key] ?? strings["zh-CN"][key];
}
