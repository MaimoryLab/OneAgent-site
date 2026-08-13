---
title: Upgrading BootAgent
description: Check for updates in the app, download, restart to apply — and why upgrading does not disturb what you already configured.
order: 6
summary: Check for updates in settings and restart when it downloads; agent configuration is untouched.
---

Upgrading BootAgent and upgrading an agent are two different things. This page is the first one.

## How to upgrade

Click "check for updates" in settings. If there is a newer version it shows the version number; click to start the download.

The download runs in the background with progress in the task centre. When it finishes, the button becomes **restart and update**. Click it and the app restarts on the new version.

When there is nothing new it says so explicitly rather than doing nothing visible.

## Does upgrading disturb my configuration

No. An upgrade replaces the BootAgent application. It does not rewrite your agents' configuration files.

Whatever you configured for Codex, Claude Code, OpenClaw and so on stays where it is (`~/.codex/config.toml` and friends). Configuration templates live in `~/.oneagent/` and are kept too.

You do not need to reconfigure anything after an upgrade.

## Upgrading an agent is separate

To upgrade an agent itself — a new Codex release, say — use that agent's update action in the environment overview, not the settings page.

Agents that BootAgent installs are installed at their latest version, so updating one means installing the current latest again. It still [takes a backup](/en/help/05-backup/) before writing configuration.

## When the update check fails

"Check for updates failed" usually means the network could not reach the distribution channel. It does not affect anything already installed — the check is a single independent request, and a failed one leaves the app in a normal state.

If it fails repeatedly on a mainland-China network, check whether a proxy or firewall is blocking the distribution channel.

## Still a technical preview

macOS notarisation and Windows signing are not finished, so after upgrading, the first launch may be blocked once by the operating system again. Handle it the way you did at [first install](/en/help/01-install/).

That step disappears once signing is complete. Until then BootAgent will not document any way around your operating system's security policy.
