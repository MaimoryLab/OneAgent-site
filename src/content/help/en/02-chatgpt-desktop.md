---
title: Recommending ChatGPT Desktop
description: The desktop app is steadier than a CLI for colleagues who would rather not use a terminal, and it shares one config file with Codex.
order: 2
summary: Install the desktop app from the vendor; configure once and the CLI works too.
---

If a colleague is not comfortable in a terminal, a desktop application is the better starting point: it works once installed, there is no launch command to remember, and it will not break because of a difference in their shell environment.

OneAgent supports two desktop applications today: **ChatGPT Desktop** and **WorkBuddy**.

## Installing

Pick the desktop agent in the environment overview and click install. OneAgent fetches whatever version the vendor currently serves:

- ChatGPT Desktop: the official `.dmg` on macOS, the Microsoft Store on Windows
- WorkBuddy: the official `.zip` on macOS, the vendor's installer on Windows

Neither runs on Linux. OneAgent does not repackage or redistribute either one, so what you install is what the vendor published.

## One benefit worth stating on its own

**ChatGPT Desktop and the Codex CLI share the same configuration file**, `~/.codex/config.toml`.

Configure it once in OneAgent and both the desktop app and the CLI work. For anyone who uses both, this saves more trouble than it appears to: maintaining two separate configs is how you end up with "it works in the terminal but not in the app", which is a tedious thing to diagnose.

WorkBuddy is different — it owns `~/.workbuddy/models.json` and does not interact with any other agent's configuration.

## There is no version to pin

This is where desktop applications differ from command-line agents: OneAgent installs whatever the vendor's endpoint currently serves, so the environment overview shows no pinned version.

That is not a missing feature. It follows from how these products are distributed — there is no package-manager entry point where a version could be requested.

## After it is configured

A desktop application opens from the Dock or Start menu; there is no launch command. If you want to change its model or provider, the flow is identical to a command-line agent — see [Switching models and providers](/en/help/03-models/).
