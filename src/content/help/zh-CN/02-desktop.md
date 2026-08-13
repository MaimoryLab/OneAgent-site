---
title: 配置桌面端 Agent
description: ChatGPT Desktop 与 WorkBuddy 的安装来源、各自写哪份配置文件，以及桌面应用为什么没有锁定版本号。
order: 2
summary: 两个桌面应用的安装来源与配置位置；ChatGPT Desktop 与 Codex 共用一份配置。
---

除命令行 Agent 之外，BootAgent 支持两个桌面应用：**ChatGPT Desktop** 和 **WorkBuddy**。它们从 Dock 或开始菜单打开，没有启动命令。

## 安装来源

在环境总览里选择桌面端 Agent 并点击安装。BootAgent 从厂商自己的分发渠道获取当前版本：

| Agent | macOS | Windows |
| --- | --- | --- |
| ChatGPT Desktop | 官方 `.dmg` | 微软商店 |
| WorkBuddy | 官方 `.zip` | 厂商安装器 |

两者都不支持 Linux。BootAgent 不重新打包、不做二次分发，你安装到的就是厂商发布的那一份。

## 配置文件位置

`ChatGPT Desktop` 与 Codex 命令行共用同一份配置：`~/.codex/config.toml`。在 BootAgent 里配置一次，两者都会读到同一份结果，不需要配置两遍。

反过来说，改动会同时影响两者。如果你只想调整其中一个，先确认另一个也接受这次改动——它们之间没有独立的配置层。

WorkBuddy 使用自己的 `~/.workbuddy/models.json`，与其他 Agent 互不影响。

## 没有可锁定的版本号

这是桌面应用与命令行 Agent 的一处实际差异：BootAgent 取的是厂商端点当前提供的版本，因此环境总览里不显示锁定版本。

原因在分发方式——这两个产品没有 npm 那样可以指定版本的包管理入口，所以没有可锁定的目标。命令行 Agent 有，环境总览会显示它们的锁定版本。

## 修改模型或 Provider

流程与命令行 Agent 完全一致，见[切换模型与 Provider](/help/03-models/)。
