import { describe, expect, it } from "vitest";

import { catalog } from "./catalog";
import {
  activationReducer,
  initialActivationState,
  routeForScreen,
  stepPresentation,
} from "./activation";
import { activationDemo, demoAgentStateFor, demoModelsFor } from "./demo-environment";

const scenario = activationDemo.scenario;

function reachProfile() {
  let state = initialActivationState(scenario);
  state = activationReducer(state, { type: "select-agent-tab", tab: "cli" }, scenario);
  state = activationReducer(state, { type: "select-agent", agentId: scenario.selectedAgent.id }, scenario);
  return activationReducer(state, { type: "continue-agents" }, scenario);
}

describe("v0.5.0 activation demo contract", () => {
  /* Fails whenever the pinned baseline moves, which is the point: bumping the
     release here should be a deliberate act that follows an audit of what changed
     upstream, not a value someone edits to make a red test go green.
     v0.5.0 touched the provider editor, settings and transfer pages — none of them
     on the walkthrough's path — so the flow itself needed no change. */
  it("pins the demo to the audited BootAgent release", () => {
    expect(activationDemo.source).toMatchObject({
      release: "v0.5.0",
      commit: "0fbbe9402a50bb5e711275f369d1485efea272e0",
      publishedAt: "2026-08-10",
      verifiedAt: "2026-08-10",
    });
  });

  it("derives provider and install facts from the vendored release catalog", () => {
    expect(scenario.provider).toMatchObject({
      id: "ppio",
      baseUrl: "https://api.ppio.com/openai",
      defaultModel: "deepseek/deepseek-v4-pro",
      fallbackProbeModel: "deepseek/deepseek-v4-flash",
    });
    expect(scenario.selectedAgent).toMatchObject({
      id: "claude-code",
      command: "claude",
      packageManager: "npm",
      packageName: "@anthropic-ai/claude-code",
    });
    expect(demoModelsFor(scenario)).toEqual([
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-flash",
    ]);
    expect(demoModelsFor(scenario)).not.toContain("deepseek/deepseek-v3");
  });

  it("keeps the selected agent uninstalled in the authored demo environment", () => {
    expect(demoAgentStateFor(scenario.selectedAgent.id)).toEqual({ installed: false, configured: false });
    expect(catalog.agents.some((agent) => agent.id === scenario.selectedAgent.id)).toBe(true);
  });
});

describe("route-aligned activation state", () => {
  it("starts on the real Agent screen with the desktop tab selected", () => {
    const state = initialActivationState(scenario);
    expect(state).toMatchObject({
      screen: "agents",
      agentTab: "desktop",
      agentId: null,
      probeState: "idle",
      installState: "idle",
    });
    expect(routeForScreen(state.screen)).toBe("/setup/agents");
  });

  it("keeps Agent selection single-valued while switching tabs", () => {
    let state = initialActivationState(scenario);
    state = activationReducer(state, { type: "select-agent", agentId: "chatgpt-desktop" }, scenario);
    expect(state.agentId).toBe("chatgpt-desktop");

    state = activationReducer(state, { type: "select-agent-tab", tab: "cli" }, scenario);
    expect(state.agentId).toBeNull();
    state = activationReducer(state, { type: "select-agent", agentId: "codex" }, scenario);
    state = activationReducer(state, { type: "select-agent", agentId: "claude-code" }, scenario);
    expect(state.agentId).toBe("claude-code");
  });

  it("uses the real new-profile path and does not gate Model on a probe", () => {
    let state = reachProfile();
    expect(state.screen).toBe("profile");

    state = activationReducer(state, { type: "start-new-profile" }, scenario);
    expect(state).toMatchObject({
      screen: "provider",
      profileMode: "new",
      providerId: "ppio",
      model: "deepseek/deepseek-v4-pro",
    });

    state = activationReducer(state, { type: "continue-provider" }, scenario);
    expect(state.screen).toBe("model");
    expect(state.probeState).toBe("idle");
  });

  it("treats connection testing as optional inline state", () => {
    let state = activationReducer(reachProfile(), { type: "start-new-profile" }, scenario);
    state = activationReducer(state, { type: "start-probe" }, scenario);
    expect(state).toMatchObject({ screen: "provider", probeState: "loading" });

    state = activationReducer(state, { type: "finish-probe", ok: true }, scenario);
    expect(state).toMatchObject({ screen: "provider", probeState: "success" });

    state = activationReducer(state, { type: "continue-provider" }, scenario);
    expect(state.screen).toBe("model");
  });

  it("reuses a saved profile by skipping Provider and Model but still reviewing and installing", () => {
    let state = activationReducer(reachProfile(), { type: "reuse-profile" }, scenario);
    expect(state).toMatchObject({
      screen: "review",
      profileMode: "reuse",
      providerId: "ppio",
      model: "deepseek/deepseek-v4-pro",
    });
    expect(stepPresentation(state, "provider")).toBe("skipped");
    expect(stepPresentation(state, "model")).toBe("skipped");
    expect(stepPresentation(state, "review")).toBe("current");

    state = activationReducer(state, { type: "start-install" }, scenario);
    expect(state).toMatchObject({ screen: "install", installState: "running", taskCenterOpen: true });
  });

  it("runs Model through Review, a durable install task, and Overview", () => {
    let state = activationReducer(reachProfile(), { type: "start-new-profile" }, scenario);
    state = activationReducer(state, { type: "continue-provider" }, scenario);
    state = activationReducer(state, { type: "set-model", value: scenario.provider.defaultModel }, scenario);
    state = activationReducer(state, { type: "continue-model" }, scenario);
    expect(state.screen).toBe("review");

    state = activationReducer(state, { type: "set-profile-label", value: "团队默认 2" }, scenario);
    state = activationReducer(state, { type: "start-install" }, scenario);
    expect(state).toMatchObject({ screen: "install", installState: "running", profileLabel: "团队默认 2" });

    state = activationReducer(state, { type: "finish-install" }, scenario);
    expect(state).toMatchObject({ screen: "install", installState: "success", taskCenterOpen: true });

    state = activationReducer(state, { type: "enter-overview" }, scenario);
    expect(state).toMatchObject({ screen: "overview", installState: "success", taskCenterOpen: false });
    expect(routeForScreen(state.screen)).toBe("/overview");
  });

  it("keeps cancellation separate from reset", () => {
    let state = activationReducer(reachProfile(), { type: "reuse-profile" }, scenario);
    state = activationReducer(state, { type: "start-install" }, scenario);
    state = activationReducer(state, { type: "cancel-install" }, scenario);
    expect(state).toMatchObject({ screen: "install", installState: "cancelled" });

    state = activationReducer(state, { type: "reset" }, scenario);
    expect(state).toEqual(initialActivationState(scenario));
  });
});
