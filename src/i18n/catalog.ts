import type { Locale } from "./index";

/**
 * Catalogue enum labels. protocolLabels and platformLabels are absent on
 * purpose — their values are proper nouns ("OpenAI Chat Completions", "macOS")
 * and stay in src/lib/content.ts, shared by both languages.
 */
const catalog = {
  "zh-CN": {
    agentDescriptions: {
      codex: "OpenAI 的终端编码 Agent，OneAgent 管理 Responses 协议配置。",
      "claude-code": "Anthropic 的终端编码 Agent，使用 Anthropic-compatible 配置。",
      cursor: "AI 编辑器；OneAgent 只提供官方安装与登录引导，不写入私有配置。",
      opencode: "开源终端编码 Agent，使用 OpenAI-compatible 协议。",
      "kilo-cli": "多模型命令行 Agent，OneAgent 可管理安装与 OpenAI-compatible 配置。",
      aider: "结对编程式仓库编辑 Agent，模型在启动命令中明确选择。",
      "chatgpt-desktop": "OpenAI 的桌面应用；与 Codex CLI 共用 ~/.codex 配置，但安装时是两个独立产品。",
      workbuddy: "桌面端 Agent 应用；自有 ~/.workbuddy/models.json 配置，使用 OpenAI-compatible 协议。",
      openclaw: "多渠道 Agent 网关；OneAgent 可管理安装与模型 Provider 配置，网关启动与渠道配对仍由 openclaw onboard 完成。",
      hermes: "自我成长型 Agent 框架；OneAgent 通过官方安装脚本安装并管理其 YAML 配置。",
    } as Record<string, string>,
    groupLabels: {
      auto: "OneAgent 可管理",
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
    plannedNote: "OneAgent 计划支持，目前还没有可用的安装或配置流程。",
    protocolStatusLabels: {
      "implementation-supported": "实现已接入",
      "release-candidate-required": "需 Release Candidate 实证",
      verified: "已验证",
      unsupported: "不支持",
    } as Record<string, string>,
    agentFallbackDescription: "按项目公开能力提供安装或配置支持。",
  },
  en: {
    agentDescriptions: {
      codex: "OpenAI's terminal coding agent; OneAgent manages its Responses protocol configuration.",
      "claude-code": "Anthropic's terminal coding agent, configured through an Anthropic-compatible endpoint.",
      cursor: "AI editor. OneAgent only points you at the official install and sign-in, and writes no private config.",
      opencode: "Open-source terminal coding agent using the OpenAI-compatible protocol.",
      "kilo-cli": "Multi-model command-line agent. OneAgent can manage both install and OpenAI-compatible config.",
      aider: "Pair-programming repository editor; the model is named explicitly at launch.",
      "chatgpt-desktop": "OpenAI's desktop app. It shares Codex's ~/.codex configuration but is a separate product at install time.",
      workbuddy: "Desktop agent application; owns its own ~/.workbuddy/models.json and speaks the OpenAI-compatible protocol.",
      openclaw: "Multi-channel agent gateway. OneAgent installs it and writes its model provider; starting the gateway and pairing channels stay with `openclaw onboard`.",
      hermes: "Self-improving agent framework. OneAgent installs it via the official script and manages its YAML configuration.",
    } as Record<string, string>,
    groupLabels: {
      auto: "OneAgent-managed",
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
    plannedNote: "OneAgent plans to support this. There is no install or configuration flow for it yet.",
    protocolStatusLabels: {
      "implementation-supported": "Implemented",
      "release-candidate-required": "Needs release-candidate evidence",
      verified: "Verified",
      unsupported: "Unsupported",
    } as Record<string, string>,
    agentFallbackDescription: "Install or configuration support follows the project's published capabilities.",
  },
} as const;

export function useCatalogLabels(locale: Locale) {
  return catalog[locale];
}
