---
title: 升级 BootAgent
description: 在应用内检查更新、下载并重启完成升级，以及升级不会动你已经配好的东西。
order: 6
summary: 设置页检查更新，下载完点重启即可；已写入的 Agent 配置不受影响。
---

升级 BootAgent 本身和升级 Agent 是两件事，这页说的是前者。

## 怎么升

在设置页点"检查更新"。有新版本时会显示版本号，点"立即更新"开始下载。

下载在后台进行，进度在任务中心里。下载完成后按钮变成"**重启并更新**"，点它，应用会重启到新版本。

没有新版本时它会明确说"当前已是最新版本"，而不是静默不动。

## 升级会不会动我配好的东西

不会。升级替换的是 BootAgent 这个应用本身，它不重写你的 Agent 配置文件。

你已经配好的 Codex、Claude Code、OpenClaw 等等，配置文件在各自的位置（`~/.codex/config.toml` 之类），升级不碰它们。配置模版存在 `~/.bootagent/` 里，也保留。

换句话说，升级之后你不需要重新配一遍。

## 从 OneAgent 升级过来

本产品原名 OneAgent，自己的目录是 `~/.oneagent/`。首次启动 BootAgent 时，它会把这个目录迁移过来，你不需要手动搬。

迁移做了这几件事：

- 把 `~/.oneagent/` 的内容复制到 `~/.bootagent/`，**但不含 `runtimes/`**。
- 改写各 Agent 配置里指向旧名的 Provider 条目，比如 Codex 的 `model_providers.oneagent` 变成 `model_providers.bootagent`。涉及 Codex、OpenCode、Kilo、OpenClaw、Kimi Code 和 ZCode 的配置文件；你自己加的 Provider 和其他配置不动。
- 把原目录改名为 `~/.oneagent-migrated-<时间戳>` 保留下来，不删。

**托管安装的运行时和 Agent 需要重装。** `runtimes/` 不在迁移范围内，所以 BootAgent 之前为你装的 Node、uv，以及它装的各个 Agent，都要在 BootAgent 里重新装一次。你的配置在，可执行文件不在。

确认迁移结果没问题之后，可以自己删掉 `~/.oneagent-migrated-<时间戳>`。它留在那里只是为了让你在出问题时能找回原样。

## 升级 Agent 是另一件事

如果你要升级的是某个 Agent 本身（比如 Codex 出了新版），那走的是环境总览里该 Agent 的更新入口，不是设置页。

BootAgent 托管安装的 Agent 默认装最新版本，所以更新就是重新装一次当前最新的。它写配置前依然会[备份](/help/05-backup/)。

## 检查更新失败

如果提示"检查更新失败"，通常是网络到不了发行渠道。这不影响你已经装好的东西继续用——检查更新是一次独立的网络请求，失败了就是没查到，不会让应用进入异常状态。

国内网络下如果反复失败，可以确认一下是否有代理或防火墙拦住了发行渠道。

## 当前还是技术预览版

macOS 版自 v0.7.0 起已签名并经 Apple 公证，升级后首次打开不再被系统拦截。Windows 的 Authenticode 签名还没完成，升级后 SmartScreen 仍可能提示一次，处理方式和[首次安装](/help/01-install/)时一样。

BootAgent 不会提供任何降低你系统安全策略的绕过方法。
