/* Vendored under data/ rather than read from the BootAgent repository. The site
   describes what a published release supports, so it must not follow that
   repository's HEAD: an agent added there but not yet shipped would be
   advertised as available. data/README.md records where these came from and how
   to refresh them. */
import agentLock from "../../data/agents.lock.json";
import providerConfig from "../../data/providers.lock.json";
/* Desktop applications and planned agents have no generated lock file upstream —
   the first live in a Go registry, the second are an intention rather than a
   contract. Both are hand-transcribed and kept in their own files so refreshing
   the vendored lock copies cannot silently drop them. */
import desktopConfig from "../../data/desktop-agents.json";
import plannedConfig from "../../data/planned-agents.json";
/* The site-facing shapes are declared once, in explorer.ts, because the explorer
   is what constrains them: it narrows platforms and protocols to the ids it can
   actually render a compatibility verdict for. Re-declaring them here would let
   a new protocol reach the pages while the explorer silently calls it
   unsupported. */
import type { PlatformId, ProtocolId, SiteAgent, SiteCatalogV2, SiteProvider, ProviderProtocolStatus } from "./explorer";

const adapterProtocols: Record<string, ProtocolId> = {
  codex: "responses",
  "claude-code": "anthropic",
  opencode: "openai",
  "kilo-cli": "openai",
  aider: "openai",
  workbuddy: "openai",
};

interface AgentSource {
  name?: string;
  group?: string;
  rank?: number;
  platforms?: string[];
  command?: string;
  config_mode: "auto" | "guide";
  config_adapter?: string;
  config_path?: string;
  guide?: string;
  package?: {
    manager?: string;
    name?: string;
    version?: string;
    source?: string;
    license?: string;
    license_url?: string;
  };
}

/* The group ids come from agents.lock.json, but the labels do not live there —
   the lock file is the installer's contract and has no room for display copy.
   Anything not listed falls back to its own id, so a new group appears on the
   site as soon as it appears in the lock rather than vanishing from the list. */
const groupNames: Record<string, string> = {
  auto: "One-click configurable",
  gateway: "Gateway agents",
  platform: "Official account agents",
  desktop: "Desktop applications",
};

interface DesktopSource {
  name?: string;
  config_adapter: string;
  shared_config_agent?: string;
  config_path?: string;
  protocol?: string;
  install?: Record<string, string>;
  rank?: number;
}

interface PlannedSource {
  name?: string;
  group?: string;
  rank?: number;
}

interface ProviderSource {
  name?: string;
  home: string;
  key_management_url?: string;
  base_url: string;
  anthropic_base_url?: string;
  default_model?: string;
  fallback_probe_model?: string;
  relationship?: "none" | "referral" | "sponsor";
  disclosure?: string;
  referral_url?: string;
  order?: number;
  protocols?: Record<string, string>;
}


const cliAgents = Object.entries(agentLock.agents as Record<string, AgentSource>)
  .map(([id, meta]): SiteAgent => {
    const managedConfig = meta.config_mode === "auto" && Boolean(meta.config_adapter);
    return {
      id,
      name: meta.name ?? id,
      kind: "cli",
      status: "available",
      group: meta.group ?? "other",
      rank: meta.rank ?? 99,
      /* Both are shown on the site so a reader can check what BootAgent will run
         and which file it will write before installing anything. guide-only
         agents have neither, and null keeps that visible rather than printing an
         empty string that looks like a missing value. */
      command: meta.command ?? null,
      configPath: meta.config_path ?? null,
      packageManager: meta.package?.manager ?? null,
      packageName: meta.package?.name ?? null,
      platforms: (meta.platforms ?? []) as PlatformId[],
      lockedVersion: meta.package?.version ?? null,
      source: meta.package?.source ?? null,
      license: meta.package?.license ?? null,
      licenseUrl: meta.package?.license_url ?? null,
      guide: meta.guide ?? null,
      protocol: managedConfig ? adapterProtocols[meta.config_adapter!] ?? null : null,

      support: {
        managedInstall: meta.config_mode === "auto" && Boolean(meta.package),
        officialInstallGuide: meta.config_mode === "guide",
        managedConfig,
      },
    };
  });

/* Every desktop application BootAgent installs is installed by BootAgent — the
   registry pairs each one with its own install function, so there is no
   guide-only desktop app to model. Both currently ship a config adapter too,
   which is why managedConfig follows the adapter rather than a mode flag the
   source does not carry. */
const desktopAgents = Object.entries(desktopConfig.agents as Record<string, DesktopSource>)
  .map(([id, meta]): SiteAgent => ({
    id,
    name: meta.name ?? id,
    kind: "desktop",
    status: "available",
    group: "desktop",
    rank: meta.rank ?? 99,
    /* A desktop application is launched from the dock, not a shell, so it has no
       command to print. The install source per platform is the equivalent fact,
       and it is carried in `platforms` below. */
    command: null,
    configPath: meta.config_path ?? null,
    packageManager: null,
    packageName: null,
    platforms: Object.keys(meta.install ?? {}) as PlatformId[],
    /* BootAgent installs the vendor's current build from the vendor's own
       endpoint; there is no pinned version to quote, and no package manifest
       declaring a license for the site to repeat. */
    lockedVersion: null,
    source: null,
    license: null,
    licenseUrl: null,
    guide: null,
    protocol: meta.protocol ? adapterProtocols[meta.config_adapter] ?? (meta.protocol as ProtocolId) : null,
    support: {
      managedInstall: true,
      officialInstallGuide: false,
      managedConfig: Boolean(meta.config_adapter),
    },
  }));

/* A planned agent carries no support claims at all: every flag is false and
   every contract field null, because there is no entry in agents.lock.json to
   read one from. The pages render this as "coming soon", and the explorer skips
   it, so an absence of evidence cannot read as a capability. */
const plannedAgents = Object.entries(plannedConfig.agents as Record<string, PlannedSource>)
  .map(([id, meta]): SiteAgent => ({
    id,
    name: meta.name ?? id,
    kind: "cli",
    status: "planned",
    group: meta.group ?? "other",
    rank: meta.rank ?? 99,
    command: null,
    configPath: null,
    packageManager: null,
    packageName: null,
    platforms: [],
    lockedVersion: null,
    source: null,
    license: null,
    licenseUrl: null,
    guide: null,
    protocol: null,
    support: { managedInstall: false, officialInstallGuide: false, managedConfig: false },
  }));

/* Ranks are only meaningful within a source: the desktop registry numbers its
   two entries from 1, as does the planned list, so sorting the merged array by
   rank would interleave them with the command-line agents. Each source is sorted
   on its own and then concatenated — command-line first, then desktop, then the
   coming-soon entries last, which is also the order the pages present them. */
const byRank = (left: SiteAgent, right: SiteAgent) => left.rank - right.rank || left.id.localeCompare(right.id);
const agents = [
  ...cliAgents.sort(byRank),
  ...desktopAgents.sort(byRank),
  ...plannedAgents.sort(byRank),
];

const providers = Object.entries(providerConfig.providers as Record<string, ProviderSource>)
  .map(([id, meta]): SiteProvider => ({
    id,
    name: meta.name ?? id,
    home: meta.home,
    keyManagementUrl: meta.key_management_url ?? meta.home,
    baseUrl: meta.base_url,
    anthropicBaseUrl: meta.anthropic_base_url ?? "",
    defaultModel: meta.default_model ?? "",
    fallbackProbeModel: meta.fallback_probe_model ?? providerConfig.default_fallback_probe_model ?? "",
    relationship: meta.relationship ?? "none",
    disclosure: meta.disclosure ?? "",
    referralUrl: meta.referral_url ?? "",
    protocols: Object.entries(meta.protocols ?? {}).map(([protocolId, status]) => ({
      id: protocolId as ProtocolId,
      status: status as ProviderProtocolStatus,
    })),
    order: meta.order ?? 99,
  }))
  .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));

const groups = [...new Set(agents.map((agent) => agent.group))].map((id) => ({
  id,
  name: groupNames[id] ?? id,
}));

/* Typed as the schema the pages and the explorer already consume, so this module
   is a drop-in for the generated catalog.json it replaces. schema_version is
   asserted rather than read from the lock file: it versions this site-facing
   shape, not the installer contract the lock file carries. */
export const catalog: SiteCatalogV2 = { schema_version: 2, groups, agents, providers };
