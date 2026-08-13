---
title: Backups and rolling back
description: BootAgent backs up a configuration file before overwriting it — what the backup is called, where it goes, and how to restore from it.
order: 5
summary: Every write is preceded by a timestamped backup; rolling back is renaming a file.
---

If you have a configuration you spent a long time getting right, this is the page to read first.

The short version: **BootAgent takes a timestamped backup before it overwrites any configuration file**, and it does not touch the parts of your configuration that are none of its business.

## What a backup looks like

The backup sits beside the original, with a suffix on the filename:

```
~/.openclaw/openclaw.json
~/.openclaw/openclaw.json.backup-20260806143022
```

The timestamp is UTC, `YYYYMMDDHHMMSS`. If more than one write happens in the same second, a counter is appended (`.backup-20260806143022-1`), so backups never overwrite each other.

No backup is created when the original does not exist — there is nothing to protect, and an empty file would only mislead.

## Rolling back

Rename the backup to the original name:

```
cd ~/.openclaw
mv openclaw.json.backup-20260806143022 openclaw.json
```

Then make the agent re-read its configuration the way [Switching models](/en/help/03-models/) describes. For OpenClaw that is `openclaw gateway restart`, not reopening a terminal.

## It does not overwrite your other settings

This matters more than the backup does, because it means you usually will not need to roll back at all.

BootAgent does not rewrite a configuration file wholesale. It reads your existing file and changes only the part it is responsible for. For OpenClaw, it adds an entry named `oneagent` under `models.providers`; everything else you tuned stays exactly as it was.

So if the worry is "will my custom settings survive" — they will.

## Writes are atomic

BootAgent writes a temporary file first and only replaces the real one once that is safely on disk. A power cut, a killed process, or an error halfway through cannot leave a half-written configuration: you either get the complete new file, or the original untouched.

## When a write happens

Only after you click "start installing" on the review screen. Nothing before that writes anything — not selecting an agent, not choosing a provider, not verifying the connection, not picking a model.

The review screen names the file it is about to write, so you can check before clicking.
