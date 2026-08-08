---
title: 推荐同事用 ChatGPT 桌面版
description: 桌面版比命令行稳定，适合不想折腾终端的同事；它和 Codex CLI 共用同一份配置。
order: 2
summary: 从官方渠道装桌面版，配一次配置命令行也能用。
---

如果同事不熟悉终端，桌面应用是更好的起点：装完就能用，不需要记启动命令，也不会因为 shell 环境的差异出问题。

OneAgent 目前支持两个桌面应用：**ChatGPT Desktop** 和 **WorkBuddy**。

## 怎么装

在环境总览里选桌面端 Agent，点安装。OneAgent 从厂商自己的渠道取当前版本：

- ChatGPT Desktop：macOS 走官方 `.dmg`，Windows 走微软商店
- WorkBuddy：macOS 走官方 `.zip`，Windows 走厂商安装器

两个都不支持 Linux。OneAgent 不重新打包、也不做二次分发，所以你装到的就是厂商发布的那一份。

## 一个值得单独说的好处

**ChatGPT Desktop 和 Codex 命令行共用同一份配置文件**，都是 `~/.codex/config.toml`。

这意味着在 OneAgent 里配一次，桌面版和命令行两边都能用，不用配两遍。对同时用两者的同事，这一点省下的麻烦比看起来多——两份配置分别维护时，很容易出现"命令行能用桌面版不能用"这类难查的问题。

WorkBuddy 不一样，它有自己的配置文件 `~/.workbuddy/models.json`，与其他 Agent 互不影响。

## 没有可锁定的版本号

桌面应用和命令行 Agent 在这一点上不同：OneAgent 取的是厂商端点当前提供的版本，所以环境总览里不会显示"锁定版本"。这不是缺功能，是厂商的分发方式决定的——它们没有像 npm 那样可以指定版本的包管理入口。

## 配好之后

桌面应用从 Dock 或开始菜单打开，没有启动命令。如果你要给它换模型或换 Provider，流程和命令行 Agent 完全一样，见[切换模型与 Provider](/help/03-models/)。
