const platformIds = ["macos", "linux", "windows"] as const;
export type PlatformId = (typeof platformIds)[number];

const protocolIds = ["openai", "anthropic", "responses"] as const;
export type ProtocolId = (typeof protocolIds)[number];

/* Upstream's vocabulary, and it has grown: v0.6.0's provider data introduced
   `route-present-unverified` and `not-supported` alongside the four already here.
   `unsupported` is kept because older vendored data still carries it. */
export type ProviderProtocolStatus =
  | "implementation-supported"
  | "release-candidate-required"
  | "route-present-unverified"
  | "verified"
  | "not-supported"
  | "unsupported";

interface SiteAgentSupport {
  managedInstall: boolean;
  officialInstallGuide: boolean;
  managedConfig: boolean;
}

/* A command-line agent is installed from a package manager and probed with
   `--version`; a desktop application is installed from a vendor download and has
   neither. They are separate products upstream — internal/desktopapp is its own
   package precisely because a desktop app has no package-manager command or CLI
   version probe — so the distinction is carried here rather than inferred from a
   null command. */
export type AgentKind = "cli" | "desktop";

/* `available` is the only kind of support the catalog can prove. `planned` is an
   agent BootAgent intends to support and does not yet: it has no entry in
   agents.lock.json, so there is no install or config contract to describe, and
   the explorer must not offer it as a combination a reader could act on. */
export type AgentStatus = "available" | "planned";

export interface SiteAgent {
  id: string;
  name: string;
  kind: AgentKind;
  status: AgentStatus;
  group: string;
  rank: number;
  command: string | null;
  configPath: string | null;
  packageManager: string | null;
  packageName: string | null;
  platforms: PlatformId[];
  lockedVersion: string | null;
  source: string | null;
  license: string | null;
  licenseUrl: string | null;
  guide: string | null;
  protocol: ProtocolId | null;
  support: SiteAgentSupport;
}

interface SiteProviderProtocol {
  id: ProtocolId;
  status: ProviderProtocolStatus;
}

export interface SiteProvider {
  id: string;
  name: string;
  home: string;
  keyManagementUrl: string;
  baseUrl: string;
  anthropicBaseUrl: string;
  defaultModel: string;
  fallbackProbeModel: string;
  relationship: "none" | "referral" | "sponsor";
  disclosure: string;
  referralUrl: string;
  protocols: SiteProviderProtocol[];
  order: number;
}

interface SiteAgentGroup {
  id: string;
  name: string;
}

export interface SiteCatalogV2 {
  schema_version: 2;
  groups: SiteAgentGroup[];
  agents: SiteAgent[];
  providers: SiteProvider[];
}

export type Compatibility = "verified" | "supported" | "preview-gate" | "unsupported";

export interface RecommendedCombination {
  agentId: string;
  providerId: string;
}

export interface ExplorerSearchState {
  agent: string | null;
  provider: string | null;
  platform: PlatformId | null;
  protocol: ProtocolId | null;
}

function protocolStatusFor(provider: SiteProvider, protocol: ProtocolId | null): ProviderProtocolStatus {
  if (!protocol) return "unsupported";
  return provider.protocols.find((entry) => entry.id === protocol)?.status ?? "unsupported";
}

export function compatibilityFor(agent: SiteAgent, provider: SiteProvider): Compatibility {
  switch (protocolStatusFor(provider, agent.protocol)) {
    case "verified":
      return "verified";
    case "implementation-supported":
      return "supported";
    /* Both mean "the path exists but nothing has confirmed it end to end", which is
       the gate, not a refusal. Letting `route-present-unverified` fall through to
       the default would have printed 不支持 against a provider that publishes the
       route — a claim about the provider stronger than the data behind it, and the
       exact confusion `release-candidate-required` is already carved out to avoid. */
    case "release-candidate-required":
    case "route-present-unverified":
      return "preview-gate";
    default:
      return "unsupported";
  }
}

export function recommendedCombination(catalog: SiteCatalogV2): RecommendedCombination | null {
  const agents = [...catalog.agents].sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id));
  const providers = [...catalog.providers].sort(
    (left, right) => left.order - right.order || left.name.localeCompare(right.name),
  );

  for (const agent of agents) {
    if (agent.status !== "available") continue;
    if (!agent.support.managedConfig || !agent.protocol) continue;
    const provider = providers.find((candidate) => {
      const compatibility = compatibilityFor(agent, candidate);
      return compatibility === "supported" || compatibility === "verified";
    });
    if (provider) return { agentId: agent.id, providerId: provider.id };
  }
  return null;
}

function isPlatform(value: string | null): value is PlatformId {
  return Boolean(value && platformIds.includes(value as PlatformId));
}

function isProtocol(value: string | null): value is ProtocolId {
  return Boolean(value && protocolIds.includes(value as ProtocolId));
}

export function parseExplorerSearch(search: string, catalog: SiteCatalogV2): ExplorerSearchState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  /* A planned agent is dropped rather than selected: a shared URL naming one
     would otherwise restore a combination the explorer cannot give a verdict
     for, since a planned agent has no protocol to compare against. */
  const requestedAgent = catalog.agents.find((agent) => agent.id === params.get("agent")) ?? null;
  const selectedAgent = requestedAgent?.status === "available" ? requestedAgent : null;
  let selectedProvider = catalog.providers.find((provider) => provider.id === params.get("provider")) ?? null;
  const requestedPlatform = params.get("platform");
  const requestedProtocol = params.get("protocol");

  let platform = isPlatform(requestedPlatform) ? requestedPlatform : null;
  let protocol = isProtocol(requestedProtocol) ? requestedProtocol : null;

  if (selectedAgent) {
    if (platform && !selectedAgent.platforms.includes(platform)) platform = null;
    if (protocol && selectedAgent.protocol !== protocol) protocol = null;
    if (selectedProvider && compatibilityFor(selectedAgent, selectedProvider) === "unsupported") selectedProvider = null;
  }
  if (selectedProvider && protocol && protocolStatusFor(selectedProvider, protocol) === "unsupported") {
    selectedProvider = null;
  }

  return {
    agent: selectedAgent?.id ?? null,
    provider: selectedProvider?.id ?? null,
    platform,
    protocol,
  };
}

export function serializeExplorerSearch(state: ExplorerSearchState): string {
  const params = new URLSearchParams();
  if (state.agent) params.set("agent", state.agent);
  if (state.provider) params.set("provider", state.provider);
  if (state.platform) params.set("platform", state.platform);
  if (state.protocol) params.set("protocol", state.protocol);
  return params.toString();
}
