---
title: Switching models and providers
description: Change the model or model service an agent already uses, including what a gateway like OpenClaw needs restarted afterwards.
order: 3
summary: Four steps to change a model, and what each agent needs before it takes effect.
---

This is the most common thing to do, and the thing most people are reluctant to touch. So first: **you can get back to where you were**. The mechanism is in [Backups and rolling back](/en/help/05-backup/). This page is about the operation.

## Four steps

1. Select the agent in the environment overview
2. Choose a configuration template, or create a new one
3. Choose a provider, enter a key, and verify the connection
4. Pick a model, check the review screen, then start installing

The review screen lists which file is about to be written and what the backup policy is. It is worth reading before you click.

## The model list is fetched live

OneAgent does not carry a hardcoded list of models. It asks the provider's endpoint what is currently available, which means:

- When a provider adds a model, you can select it immediately; you do not wait for a OneAgent release
- If a provider does not expose a model list, OneAgent asks you to type the model id rather than showing an empty list as if there were nothing

## What to do afterwards

This differs per agent, and OneAgent prints the right command on the result screen. The reasoning is here because **the intuitive action is often the wrong one**.

**Command-line agents** (Codex, Claude Code, Opencode, Kilo CLI) read their configuration at startup, so quit the running process and start it again.

**Aider** needs arguments, and OneAgent assembles the full command for you:

```
aider --env-file ~/.oneagent/aider.env --model openai/<your model>
```

**OpenClaw** is the one to be careful with. Its gateway is a long-lived background process, and many people have registered it as a service that starts at login. The configuration is re-read **when the gateway restarts**, not when you reopen a terminal command. So run:

```
openclaw gateway restart
```

Closing and reopening a terminal will not apply the change, and it is easy to misread that as "OneAgent did not write anything".

**Desktop applications** need quitting and reopening.

## One extra step the first time you configure OpenClaw

If this is the first time OneAgent has configured OpenClaw, the command it gives you is `openclaw onboard` rather than a gateway restart. The model service is configured, but the gateway still needs its channels paired before it can do anything — and that is OpenClaw's own interactive flow, which OneAgent does not do on your behalf.

## Getting back to the previous model

Configuration templates keep combinations you saved earlier; apply one directly. See [Configuration templates](/en/help/04-templates/). If what you want back is the configuration that existed before OneAgent touched it, see [Backups and rolling back](/en/help/05-backup/).
