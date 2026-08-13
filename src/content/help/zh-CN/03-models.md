---
title: 切换模型与 Provider
description: 给已经在用的 Agent 换模型或换模型服务，包括 OpenClaw 这类网关换完之后要重启什么。
order: 3
summary: 换模型的四步操作，以及换完之后每个 Agent 各自要做什么才生效。
---

这是最常用的一件事，也是最多人不敢动的一件事。先说结论：**改坏了能退回去**，机制见[备份与回退](/help/05-backup/)。本页只讲操作。

## 四步

1. 在环境总览里选中要改的 Agent
2. 选一个配置模版，或新建一个
3. 选 Provider 并填 Key，然后验证连接
4. 从模型列表里挑一个，进确认页核对，点开始安装

确认页会列出即将写入哪个文件、以及备份策略。这一屏值得看一眼再点。

## 模型列表是实时拉取的

BootAgent 不维护一份写死的模型清单。它去问 Provider 的接口当前有哪些模型可用，所以：

- Provider 上了新模型，你立刻能选到，不用等 BootAgent 更新
- 如果某个 Provider 不提供模型列表接口，BootAgent 会让你手动输入模型 ID，而不是假装列表为空

## 换完之后要做什么

这一步各 Agent 不同，BootAgent 会在结果页给出对应的命令，照着做就行。这里说明背后的原因，因为**按直觉操作反而容易踩坑**。

**命令行 Agent（Codex、Claude Code、Opencode、Kilo CLI）** 在启动时读配置，所以退出正在跑的进程、重新启动即可。

**Aider** 需要带参数启动，BootAgent 会把完整命令拼好给你：

```
aider --env-file ~/.oneagent/aider.env --model openai/<你选的模型>
```

**OpenClaw** 是最需要注意的一个。它的网关是常驻后台进程，很多人把它注册成了开机自启服务。配置是在**网关重启时**重新读取的，不是在你重开终端命令时。所以要执行：

```
openclaw gateway restart
```

如果你按直觉去关掉终端再打开，配置不会生效，然后很容易误判成"BootAgent 没写进去"。

**桌面应用** 退出应用再打开即可。

## 首次配置 OpenClaw 的额外一步

如果这是你第一次让 BootAgent 配置 OpenClaw，它给出的命令会是 `openclaw onboard` 而不是重启网关。原因是模型服务配好了，但网关还需要配对渠道才能真正干活——那一步是 OpenClaw 自己的交互流程，BootAgent 不代做。

## 想换回原来的

配置模版会保留你之前存过的组合，直接套用即可，见[配置模版](/help/04-templates/)。如果你要退回的是 BootAgent 之前那份配置，见[备份与回退](/help/05-backup/)。
