import activationContract from "../../data/activation-demo.json";

import { catalog } from "./catalog";
import type { AgentKind, SiteAgent, SiteProvider } from "./explorer";

export type DemoLocale = "zh-CN" | "en";

export interface DemoAgentState {
  installed: boolean;
  configured: boolean;
}

export interface ExplorerDemoAgentState extends DemoAgentState {
  status: "ready" | "attention" | "guide-only" | "not-installed";
  version: "locked" | "behind" | null;
  hasBackup: boolean;
}

export interface DemoNavigationItem {
  id: string;
  route?: string;
  labels: Record<DemoLocale, string>;
}

export type DemoStepId = "agent" | "profile" | "provider" | "model" | "review" | "install";

export interface DemoStep {
  id: DemoStepId;
  route: string;
  labels: Record<DemoLocale, string>;
}

export interface DemoProfile {
  id: string;
  labels: Record<DemoLocale, string>;
  providerId: string;
  model: string;
}

export interface DemoScenario {
  platform: "macos";
  initialAgentTab: AgentKind;
  autoplayAgentTab: AgentKind;
  selectedAgent: SiteAgent;
  provider: SiteProvider;
  existingProfile: DemoProfile;
  newProfileLabels: Record<DemoLocale, string>;
  paths: {
    agentConfig: string;
    environmentSummary: string;
  };
  registry: string;
  installedVersion: string;
}

export interface ActivationDemoContract {
  schemaVersion: 1;
  source: {
    release: string;
    commit: string;
    publishedAt: string;
    verifiedAt: string;
  };
  navigation: DemoNavigationItem[];
  utilityNavigation: DemoNavigationItem[];
  steps: DemoStep[];
  scenario: DemoScenario;
}

type RawLabel = { "zh-CN": string; en: string };
type RawContract = typeof activationContract;

function labelsOf(value: RawLabel): Record<DemoLocale, string> {
  return { "zh-CN": value["zh-CN"], en: value.en };
}

function requiredAgent(id: string): SiteAgent {
  const agent = catalog.agents.find((candidate) => candidate.id === id && candidate.status === "available");
  if (!agent) throw new Error(`Activation demo agent ${id} is missing from the vendored catalog`);
  return agent;
}

function requiredProvider(id: string): SiteProvider {
  const provider = catalog.providers.find((candidate) => candidate.id === id);
  if (!provider) throw new Error(`Activation demo provider ${id} is missing from the vendored catalog`);
  if (!provider.defaultModel || !provider.fallbackProbeModel) {
    throw new Error(`Activation demo provider ${id} is missing model defaults`);
  }
  return provider;
}

const raw = activationContract as RawContract;
const selectedAgent = requiredAgent(raw.scenario.selected_agent_id);
const provider = requiredProvider(raw.scenario.provider_id);

export const activationDemo: ActivationDemoContract = {
  schemaVersion: 1,
  source: {
    release: raw.source.release,
    commit: raw.source.commit,
    publishedAt: raw.source.published_at,
    verifiedAt: raw.source.verified_at,
  },
  navigation: raw.navigation.map((item) => ({
    id: item.id,
    route: item.route,
    labels: labelsOf(item),
  })),
  utilityNavigation: raw.utility_navigation.map((item) => ({
    id: item.id,
    route: "route" in item ? item.route : undefined,
    labels: labelsOf(item),
  })),
  steps: raw.steps.map((step) => ({
    id: step.id as DemoStepId,
    route: step.route,
    labels: labelsOf(step),
  })),
  scenario: {
    platform: raw.scenario.platform as "macos",
    initialAgentTab: raw.scenario.initial_agent_tab as AgentKind,
    autoplayAgentTab: raw.scenario.autoplay_agent_tab as AgentKind,
    selectedAgent,
    provider,
    existingProfile: {
      id: raw.scenario.existing_profile.id,
      labels: labelsOf(raw.scenario.existing_profile.label),
      providerId: provider.id,
      model: provider.defaultModel,
    },
    newProfileLabels: labelsOf(raw.scenario.new_profile_label),
    paths: {
      agentConfig: raw.scenario.paths.agent_config,
      environmentSummary: raw.scenario.paths.environment_summary,
    },
    registry: raw.scenario.registry,
    installedVersion: raw.scenario.installed_version,
  },
};

const authoredStates = activationContract.scenario.agent_states as Record<string, DemoAgentState>;

export function demoAgentStateFor(agentId: string): DemoAgentState {
  return authoredStates[agentId] ?? { installed: false, configured: false };
}

export function demoModelsFor(scenario: DemoScenario = activationDemo.scenario): string[] {
  return [...new Set([scenario.provider.defaultModel, scenario.provider.fallbackProbeModel].filter(Boolean))];
}

export function demoAgentsForTab(kind: AgentKind): SiteAgent[] {
  return catalog.agents
    .filter((agent) => agent.status === "available" && agent.kind === kind)
    .sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id));
}

export function localizedDemoLabel(value: { labels: Record<DemoLocale, string> }, locale: DemoLocale): string {
  return value.labels[locale];
}

/* The Explorer has its own illustrative machine-state fixture. It is intentionally
 * separate from the activation walkthrough, whose audited v0.4.0 scenario starts
 * with Claude Code uninstalled so the install task remains truthful. */
const explorerStates: Readonly<Record<string, ExplorerDemoAgentState>> = {
  codex: { installed: true, configured: false, status: "attention", version: "behind", hasBackup: true },
  "claude-code": { installed: true, configured: true, status: "ready", version: "locked", hasBackup: true },
  "chatgpt-desktop": { installed: true, configured: false, status: "attention", version: null, hasBackup: false },
  opencode: { installed: false, configured: false, status: "not-installed", version: null, hasBackup: false },
};

export function demoStateFor(agent: SiteAgent): ExplorerDemoAgentState {
  const explicit = explorerStates[agent.id];
  if (explicit) return explicit;
  if (agent.support.officialInstallGuide) {
    return { installed: false, configured: false, status: "guide-only", version: null, hasBackup: false };
  }
  return { installed: false, configured: false, status: "not-installed", version: null, hasBackup: false };
}
