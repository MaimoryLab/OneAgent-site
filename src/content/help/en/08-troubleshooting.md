---
title: Troubleshooting
description: Organised by symptom — a change that did not take effect, an empty model list, an agent that will not install, a blocked first launch.
order: 8
summary: Look up what you are seeing, not which feature it belongs to.
---

Organised by symptom rather than by feature: when something is wrong, what you know is what you saw, not which module produced it.

## I changed the model but the agent still uses the old one

The most common one, and usually not a failed write.

**Check the restart first.** Agents read configuration at different moments. Command-line agents need quitting and restarting. **OpenClaw needs its gateway restarted** (`openclaw gateway restart`) — its gateway is a long-lived process, and reopening a terminal command does not make it re-read anything. Desktop applications need quitting and reopening.

The full list is in [Switching models and providers](/en/help/03-models/).

**Then check the write.** Open the configuration file. If an entry named `oneagent` is in there, the write succeeded and the problem is in the restart.

## The model list is empty

BootAgent's model list comes from the provider's endpoint, not a built-in list. An empty one usually means:

- That provider does not expose a model list. BootAgent will ask you to type the model id instead; do that
- The key is wrong or lacks permission, so the endpoint refused. Confirm the connection verifies first

## Connection verification fails

If you are using your own endpoint, check the address format. BootAgent applies the same rules the app applies, and rejects:

- Anything not starting with `http://` or `https://`
- A username or password embedded in the URL (`https://user:pass@...`)
- Control characters

With a provider from the catalogue, a failure is usually the key. Note that some provider protocols are marked as requiring release-candidate evidence; those combinations are not judged Ready, and that is deliberate — not a failure, just not verified far enough to promise.

## An agent will not install

**Check the network first.** Packages and runtimes go through the npmmirror (Aliyun) registry by default, which usually needs no extra configuration on a mainland-China network. A proxy or firewall may need to allow it.

**You do not need to install Node yourself.** BootAgent installs the runtime it needs into `~/.oneagent/runtimes/` without touching a system Node or your PATH. So "I don't have Node" is not the reason.

## The operating system blocks the first launch

This is not a failure. What ships today is an unsigned, unnotarised technical preview, so both macOS Gatekeeper and Windows SmartScreen stop it once.

[Quickstart](/en/quickstart/) has four screenshots for macOS. You only do this once.

## I want to undo a change

Every write is preceded by a timestamped backup; rename it back. See [Backups and rolling back](/en/help/05-backup/).

## When you report it

If none of the above helps, see the [support](/support/)<span class="lang-hint">in Chinese</span> page. When reporting, remove your username, local absolute paths and any keys — none of that is needed to diagnose a problem, and it is hard to take back once sent.
