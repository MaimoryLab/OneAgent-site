import type { SiteAgent, SiteCatalogV2 } from "./explorer";

type DemoStatus = "ready" | "attention" | "guide-only" | "not-installed";
type DemoVersion = "locked" | "behind" | null;

export interface DemoAgentState {
  installed: boolean;
  configured: boolean;
  status: DemoStatus;
  version: DemoVersion;
  hasBackup: boolean;
}

/* Cursor used to hold the guide-only slot here. Upstream removed it — and every
   other guide-only entry — from agents.lock.json, so the catalog now has no
   agent that returns an official-setup path, and authoring a state for one would
   mean inventing a catalog entry the installer does not have. The second branch
   is now a desktop application, which is what upstream added in its place. */
export const DEMO_AGENT_STATES: Readonly<Record<string, DemoAgentState>> = {
  codex: { installed: true, configured: false, status: "attention", version: "behind", hasBackup: true },
  "claude-code": { installed: true, configured: true, status: "ready", version: "locked", hasBackup: true },
  "chatgpt-desktop": { installed: true, configured: false, status: "attention", version: null, hasBackup: false },
  opencode: { installed: false, configured: false, status: "not-installed", version: null, hasBackup: false },
};

/* The product discovers models from the endpoint's own /v1/models. These lists
   stand in for one such response. The first entry of each is the provider's real
   fallback_probe_model from oneagent/catalog.py — including the fact that the
   same DeepSeek build is published under a different id per provider, which is
   why the product cannot share one constant. */
const DEMO_MODELS: Readonly<Record<string, readonly string[]>> = {
  ppio: ["deepseek/deepseek-v3", "qwen/qwen3-coder-480b", "moonshotai/kimi-k2"],
  novita: ["deepseek/deepseek_v3", "qwen/qwen3-235b-a22b", "meta-llama/llama-4-maverick"],
};

/* A custom endpoint has no published catalog, so the demo shows the product's
   documented recovery instead of inventing a list: type the id by hand. */
export const DEMO_CUSTOM_MODEL_HINT = "deepseek/deepseek-v3";

export function demoModelsFor(providerId: string | null): readonly string[] {
  return (providerId && DEMO_MODELS[providerId]) || [];
}

export function missingDemoAgentIds(
  catalog: SiteCatalogV2,
  states: Readonly<Record<string, DemoAgentState>> = DEMO_AGENT_STATES,
): string[] {
  const ids = new Set(catalog.agents.map((agent) => agent.id));
  return Object.keys(states).filter((id) => !ids.has(id)).sort();
}

/**
 * The agents the console offers on its first screen: the ones with an authored
 * state above, in catalog order.
 *
 * This used to be `catalog.agents.slice(0, 4)`, which returned the same four
 * only because their ranks happened to be 1-4. When upstream renumbered the
 * auto agents to 1-5, Cursor moved to rank 6 and fell off the screen — taking a
 * branch the demo needs with it, and nothing failed until an end-to-end test
 * timed out looking for a button. Selecting by authored state instead means a
 * rank change reorders this list but cannot empty it.
 */
export function featuredDemoAgents(
  catalog: SiteCatalogV2,
  states: Readonly<Record<string, DemoAgentState>> = DEMO_AGENT_STATES,
): SiteAgent[] {
  return catalog.agents.filter((agent) => agent.id in states);
}

export function demoStateFor(agent: SiteAgent): DemoAgentState {
  const explicit = DEMO_AGENT_STATES[agent.id];
  if (explicit) return explicit;
  if (agent.support.officialInstallGuide) {
    return { installed: false, configured: false, status: "guide-only", version: null, hasBackup: false };
  }
  return { installed: false, configured: false, status: "not-installed", version: null, hasBackup: false };
}
