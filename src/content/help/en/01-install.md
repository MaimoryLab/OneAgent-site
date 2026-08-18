---
title: Installing and first launch
description: How to install on each platform, the release's signing state, and what BootAgent writes to your machine.
order: 1
summary: What differs per platform, including each platform's signing state.
---

If you only want to get one agent working, read [Quickstart](/en/quickstart/) instead — that is the six-step shortest path. This page covers what it leaves out: the differences between platforms, and what BootAgent actually writes to your machine.

## Which build to download

The [download centre](/en/downloads/) recommends a build for your system, but every platform's artifact is listed on the same page, so you can pick manually.

To verify a download, check it against the checksum manifest GitHub Releases publishes with each release; if the value you compute does not match, do not run the file.

## macOS: signed and notarised

From v0.7.0 the macOS artifact carries a Developer ID signature and Apple notarisation. Open the DMG, drag the app into Applications and launch it normally — there is no "cannot verify the developer" block any more.

If you are opening v0.6.x or an earlier preview, Gatekeeper still stops it — those packages were unsigned. Do not add an allowance for an old build; [upgrade to the current version](/en/downloads/) instead. BootAgent will not document any way around your operating system's security policy.

## Windows and Linux

Windows Authenticode signing is not done yet, so SmartScreen may warn about an unknown publisher on first run. Confirm the download source and the SHA-256 before continuing.

Linux has no system-level signing gate. Download it, make it executable, run it.

## What BootAgent installs

It is an application. It does not sit in the background, install a system service, or change your shell configuration. Only two kinds of file are ever written:

**An agent's configuration file.** Each agent has its own location — Codex uses `~/.codex/config.toml`, Claude Code uses `~/.claude/settings.json`. Nothing is written until you confirm it in the interface, and a backup is always taken first. See [Backups and rolling back](/en/help/05-backup/).

**BootAgent's own directory.** `~/.bootagent/`, holding configuration templates and any runtime it installed for you.

## Runtimes do not depend on what you already have

Most command-line agents need Node. If your machine does not have it, BootAgent installs one into `~/.bootagent/runtimes/` — it does not touch a system Node and does not change your PATH. If you already have one, it uses that.

Packages and runtimes go through the npmmirror (Aliyun) registry by default, so a mainland-China network needs no extra proxy configuration.

## Once it is installed

The first screen is an environment overview: for every agent on this machine, whether it is installed, configured, or absent. Those three are listed separately on purpose — installed and configured are different states, and collapsing them into one checkmark hides what to do next.

Next you can [configure a desktop agent](/en/help/02-desktop/), or go straight to [switching an agent's model](/en/help/03-models/).
