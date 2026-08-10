import type { AgentKind } from "./explorer";
import type { DemoScenario, DemoStepId } from "./demo-environment";

export type ActivationScreen = "agents" | "profile" | "provider" | "model" | "review" | "install" | "overview";
export type ProbeState = "idle" | "loading" | "success" | "error";
export type InstallState = "idle" | "running" | "success" | "cancelled" | "failure";
export type ProfileMode = "new" | "reuse" | null;
export type StepPresentation = "upcoming" | "current" | "complete" | "skipped";

export interface ActivationState {
  screen: ActivationScreen;
  agentTab: AgentKind;
  agentId: string | null;
  profileMode: ProfileMode;
  providerId: string | null;
  probeModel: string;
  probeState: ProbeState;
  model: string;
  profileLabel: string;
  installState: InstallState;
  taskCenterOpen: boolean;
}

export type ActivationAction =
  | { type: "reset" }
  | { type: "select-agent-tab"; tab: AgentKind }
  | { type: "select-agent"; agentId: string }
  | { type: "continue-agents" }
  | { type: "reuse-profile" }
  | { type: "start-new-profile" }
  | { type: "select-provider"; providerId: string; defaultModel?: string }
  | { type: "set-probe-model"; value: string }
  | { type: "start-probe" }
  | { type: "finish-probe"; ok: boolean }
  | { type: "continue-provider" }
  | { type: "set-model"; value: string }
  | { type: "continue-model" }
  | { type: "set-profile-label"; value: string }
  | { type: "start-install" }
  | { type: "finish-install" }
  | { type: "fail-install" }
  | { type: "cancel-install" }
  | { type: "enter-overview" }
  | { type: "dismiss-task" }
  | { type: "toggle-task-center" }
  | { type: "back" };

const screenStep: Record<Exclude<ActivationScreen, "overview">, DemoStepId> = {
  agents: "agent",
  profile: "profile",
  provider: "provider",
  model: "model",
  review: "review",
  install: "install",
};

const stepOrder: DemoStepId[] = ["agent", "profile", "provider", "model", "review", "install"];

export function initialActivationState(scenario: DemoScenario): ActivationState {
  return {
    screen: "agents",
    agentTab: scenario.initialAgentTab,
    agentId: null,
    profileMode: null,
    providerId: null,
    probeModel: "",
    probeState: "idle",
    model: "",
    profileLabel: scenario.newProfileLabels["zh-CN"],
    installState: "idle",
    taskCenterOpen: false,
  };
}

function newProfileState(state: ActivationState, scenario: DemoScenario): ActivationState {
  return {
    ...state,
    screen: "provider",
    profileMode: "new",
    providerId: scenario.provider.id,
    probeModel: "",
    probeState: "idle",
    model: scenario.provider.defaultModel,
    profileLabel: scenario.newProfileLabels["zh-CN"],
    installState: "idle",
    taskCenterOpen: false,
  };
}

export function activationReducer(
  state: ActivationState,
  action: ActivationAction,
  scenario: DemoScenario,
): ActivationState {
  switch (action.type) {
    case "reset":
      return initialActivationState(scenario);
    case "select-agent-tab":
      if (state.screen !== "agents" || action.tab === state.agentTab) return state;
      return { ...state, agentTab: action.tab, agentId: null };
    case "select-agent":
      return state.screen === "agents" ? { ...state, agentId: action.agentId } : state;
    case "continue-agents":
      return state.screen === "agents" && state.agentId ? { ...state, screen: "profile" } : state;
    case "reuse-profile":
      if (state.screen !== "profile") return state;
      return {
        ...state,
        screen: "review",
        profileMode: "reuse",
        providerId: scenario.existingProfile.providerId,
        model: scenario.existingProfile.model,
        profileLabel: scenario.existingProfile.labels["zh-CN"],
        probeModel: "",
        probeState: "idle",
      };
    case "start-new-profile":
      return state.screen === "profile" ? newProfileState(state, scenario) : state;
    case "select-provider":
      if (state.screen !== "provider") return state;
      return {
        ...state,
        providerId: action.providerId,
        probeModel: "",
        probeState: "idle",
        model: action.defaultModel ?? (action.providerId === scenario.provider.id ? scenario.provider.defaultModel : ""),
      };
    case "set-probe-model":
      return state.screen === "provider" ? { ...state, probeModel: action.value, probeState: "idle" } : state;
    case "start-probe":
      return state.screen === "provider" && state.providerId
        ? { ...state, probeState: "loading" }
        : state;
    case "finish-probe":
      return state.screen === "provider" && state.probeState === "loading"
        ? { ...state, probeState: action.ok ? "success" : "error" }
        : state;
    case "continue-provider":
      return state.screen === "provider" && state.providerId ? { ...state, screen: "model" } : state;
    case "set-model":
      return state.screen === "model" ? { ...state, model: action.value } : state;
    case "continue-model":
      return state.screen === "model" && state.model.trim() ? { ...state, screen: "review" } : state;
    case "set-profile-label":
      return state.screen === "review" && state.profileMode === "new"
        ? { ...state, profileLabel: action.value }
        : state;
    case "start-install":
      return state.screen === "review"
        ? { ...state, screen: "install", installState: "running", taskCenterOpen: true }
        : state;
    case "finish-install":
      return state.screen === "install" && state.installState === "running"
        ? { ...state, installState: "success" }
        : state;
    case "fail-install":
      return state.screen === "install" && state.installState === "running"
        ? { ...state, installState: "failure" }
        : state;
    case "cancel-install":
      return state.screen === "install" && state.installState === "running"
        ? { ...state, installState: "cancelled" }
        : state;
    case "enter-overview":
      return state.screen === "install"
        ? { ...state, screen: "overview", taskCenterOpen: false }
        : state;
    case "dismiss-task":
      return { ...state, taskCenterOpen: false };
    case "toggle-task-center":
      return { ...state, taskCenterOpen: !state.taskCenterOpen };
    case "back":
      switch (state.screen) {
        case "profile":
          return { ...initialActivationState(scenario), agentTab: state.agentTab, agentId: state.agentId };
        case "provider":
          return { ...state, screen: "profile", profileMode: null, providerId: null, probeState: "idle" };
        case "model":
          return { ...state, screen: "provider" };
        case "review":
          return { ...state, screen: state.profileMode === "reuse" ? "profile" : "model" };
        default:
          return state;
      }
  }
}

export function routeForScreen(screen: ActivationScreen, agentId = "claude-code"): string {
  switch (screen) {
    case "agents":
      return "/setup/agents";
    case "profile":
      return "/setup/profile";
    case "provider":
      return "/setup/provider";
    case "model":
      return "/setup/model";
    case "review":
      return "/setup/review";
    case "install":
      return `/tasks/install/${encodeURIComponent(agentId)}`;
    case "overview":
      return "/overview";
  }
}

export function stepPresentation(state: ActivationState, step: DemoStepId): StepPresentation {
  if (state.profileMode === "reuse" && (step === "provider" || step === "model")) return "skipped";
  if (state.screen === "overview") return "complete";

  const current = screenStep[state.screen];
  const currentIndex = stepOrder.indexOf(current);
  const index = stepOrder.indexOf(step);
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "current";
  return "upcoming";
}
