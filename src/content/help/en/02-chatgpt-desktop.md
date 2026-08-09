---
title: Configuring desktop agents
description: Where ChatGPT Desktop and WorkBuddy are installed from, which config file each one owns, and why desktop apps have no pinned version.
order: 2
summary: Install sources and config locations for both desktop apps; ChatGPT Desktop shares one file with Codex.
---

Alongside the command-line agents, OneAgent supports two desktop applications: **ChatGPT Desktop** and **WorkBuddy**. Both open from the Dock or Start menu and have no launch command.

## Install sources

Select the desktop agent in the environment overview and click install. OneAgent fetches whatever version the vendor currently serves:

| Agent | macOS | Windows |
| --- | --- | --- |
| ChatGPT Desktop | official `.dmg` | Microsoft Store |
| WorkBuddy | official `.zip` | vendor installer |

Neither runs on Linux. OneAgent does not repackage or redistribute either one, so what you install is what the vendor published.

## Where the configuration lives

`ChatGPT Desktop` shares a configuration file with the Codex CLI: `~/.codex/config.toml`. Configure it once in OneAgent and both read the same result — there is no need to do it twice.

The converse also holds: a change affects both. If you mean to adjust only one of them, check that the other accepts the change too, because there is no separate configuration layer between them.

WorkBuddy uses its own `~/.workbuddy/models.json` and does not interact with any other agent's configuration.

## There is no version to pin

This is one real difference from command-line agents: OneAgent installs whatever the vendor's endpoint currently serves, so the environment overview shows no pinned version.

The reason is distribution. Neither product has a package-manager entry point where a version could be requested, so there is nothing to pin against. Command-line agents do, and the overview shows their pinned versions.

## Changing the model or provider

The flow is identical to a command-line agent — see [Switching models and providers](/en/help/03-models/).
