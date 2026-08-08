---
title: Installing and first launch
description: How to install on each platform, what the operating system blocks on first launch, and what OneAgent writes to your machine.
order: 1
summary: What differs per platform, and how to get past the first-launch block.
---

If you only want to get one agent working, read [Quickstart](/en/quickstart/) instead — that is the six-step shortest path. This page covers what it leaves out: the differences between platforms, and what OneAgent actually writes to your machine.

## Which build to download

The [download centre](/en/downloads/) recommends a build for your system, but every platform's artifact is listed on the same page, so you can pick manually. Each one carries its filename, size and SHA-256, so you can check it before you download.

Verifying the hash is worth doing. The command is on the download page; if the value you compute does not match the page, do not run the file.

## macOS blocks the first launch

This is not a failure. What ships today is an unsigned, unnotarised technical preview, so Gatekeeper stops it the first time you open it. [Quickstart](/en/quickstart/) has four screenshots walking through how to allow it.

You only do this once. The step disappears once signing and notarisation are done, and until then OneAgent will not document any way around your operating system's security policy.

## Windows and Linux

Windows Authenticode signing is not done either, so SmartScreen may warn about an unknown publisher on first run. Handle it the same way as on macOS.

Linux has no system-level signing gate. Download it, make it executable, run it.

## What OneAgent installs

It is an application. It does not sit in the background, install a system service, or change your shell configuration. Only two kinds of file are ever written:

**An agent's configuration file.** Each agent has its own location — Codex uses `~/.codex/config.toml`, Claude Code uses `~/.claude/settings.json`. Nothing is written until you confirm it in the interface, and a backup is always taken first. See [Backups and rolling back](/en/help/05-backup/).

**OneAgent's own directory.** `~/.oneagent/`, holding configuration templates and any runtime it installed for you.

## Runtimes do not depend on what you already have

Most command-line agents need Node. If your machine does not have it, OneAgent installs one into `~/.oneagent/runtimes/` — it does not touch a system Node and does not change your PATH. If you already have one, it uses that.

Packages and runtimes go through the npmmirror (Aliyun) registry by default, so a mainland-China network needs no extra proxy configuration.

## Once it is installed

The first screen is an environment overview: for every agent on this machine, whether it is installed, configured, or absent. Those three are listed separately on purpose — installed and configured are different states, and collapsing them into one checkmark hides what to do next.

From here you can [recommend ChatGPT Desktop to a colleague](/en/help/02-chatgpt-desktop/), or go straight to [switching an agent's model](/en/help/03-models/).
