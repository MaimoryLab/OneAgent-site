import type { Locale } from "./index";

/**
 * Catalogue enum labels. protocolLabels and platformLabels are absent on
 * purpose — their values are proper nouns ("OpenAI Chat Completions", "macOS")
 * and stay in src/lib/content.ts, shared by both languages.
 */
const catalog = {
  "zh-CN": {
    agentDescriptions: {
      codex: "OpenAI 的终端编码 Agent，BootAgent 管理 Responses 协议配置。",
      "claude-code": "Anthropic 的终端编码 Agent，使用 Anthropic-compatible 配置。",
      cursor: "AI 编辑器；BootAgent 只提供官方安装与登录引导，不写入私有配置。",
      opencode: "开源终端编码 Agent，使用 OpenAI-compatible 协议。",
      "kilo-cli": "多模型命令行 Agent，BootAgent 可管理安装与 OpenAI-compatible 配置。",
      aider: "结对编程式仓库编辑 Agent，模型在启动命令中明确选择。",
      "chatgpt-desktop": "OpenAI 的桌面应用；与 Codex CLI 共用 ~/.codex 配置，但安装时是两个独立产品。",
      workbuddy: "桌面端 Agent 应用；自有 ~/.workbuddy/models.json 配置，使用 OpenAI-compatible 协议。",
      openclaw: "多渠道 Agent 网关；BootAgent 可管理安装与模型 Provider 配置，网关启动与渠道配对仍由 openclaw onboard 完成。",
      hermes: "自我成长型 Agent 框架；BootAgent 通过官方安装脚本安装并管理其 YAML 配置。",
      dsh: "DeepSeek 的终端编码 Agent；BootAgent 可管理安装与 OpenAI-compatible 配置。",
      "kimi-code": "Moonshot 的终端编码 Agent；BootAgent 可管理安装与 OpenAI-compatible 配置。",
      pi: "开源终端编码 Agent；BootAgent 跨其三个配置文件写入 Provider 与默认模型。",
      "dsh-desktop": "DeepSeek Harness 的桌面应用，由第三方 anywhere-labs 构建；与 dsh 命令行共用 ~/.dsh 配置。",
      "claude-desktop": "Anthropic 的桌面应用；BootAgent 可检测与配置，安装走官方下载页。",
      "workbuddy-intl": "WorkBuddy 的国际版桌面应用；与国内版并存安装，各自独立配置。",
      zcode: "Z.ai 的桌面端 Agent；BootAgent 在其 v2 配置中写入自有 Provider 条目。",
    } as Record<string, string>,
    groupLabels: {
      auto: "BootAgent 可管理",
      gateway: "网关 Agent",
      platform: "官方账号 Agent",
      desktop: "桌面端 Agent",
    } as Record<string, string>,
    statusLabels: {
      available: "已支持",
      planned: "即将支持",
    } as Record<string, string>,
    kindLabels: {
      cli: "命令行 Agent",
      desktop: "桌面端 Agent",
    } as Record<string, string>,
    plannedNote: "BootAgent 计划支持，目前还没有可用的安装或配置流程。",
    protocolStatusLabels: {
      "implementation-supported": "实现已接入",
      "release-candidate-required": "需 Release Candidate 实证",
      "route-present-unverified": "有路由，未验证",
      verified: "已验证",
      "not-supported": "不支持",
      unsupported: "不支持",
    } as Record<string, string>,
    agentFallbackDescription: "按项目公开能力提供安装或配置支持。",
  },
  en: {
    agentDescriptions: {
      codex: "OpenAI's terminal coding agent; BootAgent manages its Responses protocol configuration.",
      "claude-code": "Anthropic's terminal coding agent, configured through an Anthropic-compatible endpoint.",
      cursor: "AI editor. BootAgent only points you at the official install and sign-in, and writes no private config.",
      opencode: "Open-source terminal coding agent using the OpenAI-compatible protocol.",
      "kilo-cli": "Multi-model command-line agent. BootAgent can manage both install and OpenAI-compatible config.",
      aider: "Pair-programming repository editor; the model is named explicitly at launch.",
      "chatgpt-desktop": "OpenAI's desktop app. It shares Codex's ~/.codex configuration but is a separate product at install time.",
      workbuddy: "Desktop agent application; owns its own ~/.workbuddy/models.json and speaks the OpenAI-compatible protocol.",
      openclaw: "Multi-channel agent gateway. BootAgent installs it and writes its model provider; starting the gateway and pairing channels stay with `openclaw onboard`.",
      hermes: "Self-improving agent framework. BootAgent installs it via the official script and manages its YAML configuration.",
      dsh: "DeepSeek's terminal coding agent. BootAgent can manage both install and OpenAI-compatible config.",
      "kimi-code": "Moonshot's terminal coding agent. BootAgent can manage both install and OpenAI-compatible config.",
      pi: "Open-source terminal coding agent. BootAgent writes the provider and default model across its three config files.",
      "dsh-desktop": "Desktop app for DeepSeek Harness, built by third-party anywhere-labs; shares the dsh CLI's ~/.dsh configuration.",
      "claude-desktop": "Anthropic's desktop app. BootAgent detects and configures it; installation goes through the official download page.",
      "workbuddy-intl": "WorkBuddy's international desktop build; installs beside the China edition with its own configuration.",
      zcode: "Z.ai's desktop agent. BootAgent writes its own provider entry into the app's v2 configuration.",
    } as Record<string, string>,
    groupLabels: {
      auto: "BootAgent-managed",
      gateway: "Gateway agent",
      platform: "Vendor-account agent",
      desktop: "Desktop application",
    } as Record<string, string>,
    statusLabels: {
      available: "Available",
      planned: "Coming soon",
    } as Record<string, string>,
    kindLabels: {
      cli: "Command-line agent",
      desktop: "Desktop application",
    } as Record<string, string>,
    plannedNote: "BootAgent plans to support this. There is no install or configuration flow for it yet.",
    protocolStatusLabels: {
      "implementation-supported": "Implemented",
      "release-candidate-required": "Needs release-candidate evidence",
      "route-present-unverified": "Route present, unverified",
      verified: "Verified",
      "not-supported": "Not supported",
      unsupported: "Unsupported",
    } as Record<string, string>,
    agentFallbackDescription: "Install or configuration support follows the project's published capabilities.",
  },
} as const;

export function useCatalogLabels(locale: Locale) {
  return catalog[locale];
}
