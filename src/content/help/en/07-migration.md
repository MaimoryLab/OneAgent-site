---
title: Migrating configuration
description: Export model services and templates to a file for another machine — and why an unencrypted export writes your API key in plain text.
order: 7
summary: Export your configuration to move it; if it contains a key, encrypt it.
---

When you change machines, or want to hand a colleague a working setup, you can export your model services and configuration templates to a file and import it elsewhere.

The entry point is "import and export" in settings.

## Exporting

Select the model services and templates to take with you. BootAgent then asks **whether to encrypt**.

That choice matters. The next section is about it.

Then pick a location to save, and you get a file.

## On encryption: do not skip this

If the model services you export have API keys stored, **choosing not to encrypt writes those keys into the file in plain text**.

That file may later sit in cloud storage, get sent in a group chat, or stay in a downloads folder for months. Anyone who obtains it can read your key directly.

So:

- **The export contains keys** → encrypt it and set a password
- **You only want the structure** (provider addresses, model choices) without keys → unencrypted is fine

Encryption derives a key from your password with PBKDF2 and encrypts with AES-GCM. The password is not stored in the file. **It cannot be recovered** — lose the password and the file is useless, with no back door and no reset. Record it somewhere you can reliably retrieve.

## Importing

Use the same entry point on the other machine and select the file. If it is encrypted you will be asked for the password.

Before writing anything, BootAgent lists what the file contains and what would be added or overwritten, and waits for you to confirm.

## What the error messages mean

**"Wrong password, or the file is damaged"** — these two cannot be distinguished cryptographically: a failed decryption gives no evidence about which one it was. Check the password first, then whether the file transferred intact.

**"This file's version (N) is not supported; only version 1 is"** — the file came from a newer BootAgent than this one. Upgrade this machine and try again.

**"Invalid file format; check that this is a BootAgent export"** — wrong file, or a file that did not come from the export feature.

**"Model service data is invalid; the file may have been edited by hand"** — the structure is right but the contents are not what was expected, usually because someone opened it in a text editor. Export a fresh one.

## What migration does not include

The export covers model services and configuration templates. It does **not** include the configuration files already written to individual agents.

So after importing, you still walk through [the configuration flow](/en/help/03-models/) to apply a template to an agent. That is deliberate: which agents exist on the target machine, and where, is not necessarily the same as on the source, and copying configuration files across would be a good way to write a broken one.
