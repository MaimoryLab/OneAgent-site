---
title: Configuration templates
description: Save a provider-and-model pair and reuse it across agents, and where the API key sits in all this.
order: 4
summary: Save a combination once, then apply it to other agents without re-entering a key.
---

A configuration template is a saved "provider plus model" pair with a name you chose. Next time you configure a different agent, pick the template instead of choosing a provider, entering a key and selecting a model again.

If you use one agent and one provider, you can ignore this feature. It exists for the case where the same model service has to be configured for three or four agents.

## Saving one

At the second step of the flow, choose "create a new template", walk through the provider and model steps, and the review screen saves the combination. You can name it yourself.

## Applying one

Next time, choose "apply a saved template" at the second step. The provider and model steps are skipped — the combination is already decided, no new credential is being introduced, and there is no new connection to verify.

Those two steps show as skipped in the step indicator rather than disabled.

## The API key is not in the template

A template records **which provider and which model**, not the key. Keys are stored separately; the template only carries a flag for whether a key exists for that provider.

That has a practical consequence: sharing a template with a colleague gives them the configuration structure, not your credentials. If you do want to move keys as well, that is a different operation — see [Migrating configuration](/en/help/07-migration/), which has a security point you need to read.

## One template, many agents

Templates and agents are separate. The same template can be applied to Codex, Claude Code and Opencode, each writing its own configuration file, without interfering with each other.

The reverse also holds: changing one agent's configuration does not change the others that used the same template. A template is a model to copy at apply time, not a live link. Getting this backwards leads to expecting one edit to propagate everywhere.

## Where to manage them

The "Templates" item in the sidebar lists all of them, for review and deletion. Deleting a template does not undo configuration already written to an agent — those files are written, and changing them means going through [switching models](/en/help/03-models/) again.
