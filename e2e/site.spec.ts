import { test, expect, type Page } from "@playwright/test";
import axe from "axe-core";
import { readFileSync } from "node:fs";

const criticalPages = ["/", "/explore/", "/downloads/", "/agents/", "/security/", "/help/", "/help/03-models/"];

/* Mirrors translatedRoutes in src/i18n/index.ts. It cannot be imported here:
   that module reads import.meta.env.BASE_URL, which only exists under Vite, and
   Playwright runs this file in plain Node. The englishPages list below is the
   guard — every route named here has to have an /en/ page that gets audited, so
   the two drifting apart fails rather than going unnoticed. */
const translatedRoutes = ["", "downloads/", "quickstart/", "explore/", "security/", "help/"];

test("critical pages fit the viewport without horizontal scrolling", async ({ page }) => {
  for (const path of criticalPages) {
    await page.goto(path);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `${path} overflows its ${dimensions.viewport}px viewport`).toBeLessThanOrEqual(dimensions.viewport);
  }
});

test("home presents one activation entry without claiming a real scan", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("激活你的 AI 开发环境");
  await expect(page.locator(".hero-actions").getByRole("button", { name: "开始激活演示" })).toBeVisible();
  await expect(page.locator(".hero-actions").getByRole("link")).toHaveCount(0);

  const console = page.locator("#activation-console");
  await console.scrollIntoViewIfNeeded();
  await expect(console).toHaveAttribute("data-screen", "agents");
  await expect(console).toHaveAttribute("data-route", "/setup/agents");
  await expect(console).toHaveAttribute("data-source-release", "v0.5.0");
  await expect(console).toHaveAttribute("data-autoplaying", "true");
  await expect(page.getByText("示例环境", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("不访问设备", { exact: true })).toBeVisible();
  await expect(page.locator('input[type="password"], input[name*="key" i]')).toHaveCount(0);
  /* The channel note is deliberately not on this page any more — it is stated in
     full on /downloads/ and /security/, both asserted below. What the home page
     must not do is imply a signed release, so the absence is the assertion. */
  await expect(page.locator(".hero-note")).toHaveCount(0);
  await expect(page.locator(".hero-brand")).toContainText("BootAgent");
  /* The demo is a replica of the product UI, so it is excluded from search
     snippets; without this the home page had no usable summary in results. */
  await expect(page.locator(".activation-shell")).toHaveAttribute("data-nosnippet", "");
});

test("activation demo uses the v0.5.0 English product vocabulary", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/");
  const console = page.locator("#activation-console");
  await expect(console.locator('[data-nav-id="overview"]')).toHaveText("Environment overview");
  await expect(console.locator('[data-nav-id="providers"]')).toHaveText("Provider");
  await expect(console.locator('[data-nav-id="profiles"]')).toHaveText("Profiles");
  await expect(console.locator('[data-utility-id="tasks"]')).toContainText("Task center");
  await expect(console.locator('[data-utility-id="settings"]')).toContainText("Settings");
  await expect(console.locator('[data-step-id="profile"]')).toContainText("Select a profile");
  await expect(console.locator('[data-step-id="review"]')).toContainText("Review");
});

test("activation demo follows the v0.5.0 new-profile path through Overview", async ({ page }) => {
  const fetches: string[] = [];
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType())) fetches.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const console = page.locator("#activation-console");
  await page.getByRole("button", { name: "开始激活演示" }).click();

  await expect(console).toHaveAttribute("data-screen", "agents");
  await console.getByRole("tab", { name: "命令行 Agent" }).click();
  await console.getByRole("radio", { name: "选择 Claude Code" }).click();
  await console.getByRole("button", { name: /^继续/ }).click();

  await expect(console).toHaveAttribute("data-screen", "profile");
  await expect(console).toHaveAttribute("data-route", "/setup/profile");
  await expect(console.getByText("团队默认", { exact: true })).toBeVisible();
  await console.getByRole("button", { name: /新建配置模版/ }).click();

  await expect(console).toHaveAttribute("data-screen", "provider");
  await expect(console.getByRole("combobox", { name: "模型服务" })).toContainText("PPIO");
  const continueWithoutProbe = console.getByRole("button", { name: /继续选择模型/ });
  await expect(continueWithoutProbe).toBeEnabled();
  await expect(console.getByText("连接测试是可选的，可以直接继续选择模型")).toBeVisible();

  await console.getByRole("button", { name: "测试连接" }).click();
  await expect(console.getByText(/正在验证端点和 Key/)).toBeVisible();
  await expect(console.getByText(/Anthropic Messages connection test passed/)).toBeVisible();
  await continueWithoutProbe.click();

  await expect(console).toHaveAttribute("data-screen", "model");
  await expect(console.getByLabel("手动输入模型 ID")).toHaveValue("deepseek/deepseek-v4-pro");
  await expect(console.getByText("deepseek/deepseek-v3", { exact: true })).toHaveCount(0);
  await console.getByRole("radio", { name: /deepseek\/deepseek-v4-pro/ }).click();
  await console.getByRole("button", { name: /^继续/ }).click();

  await expect(console).toHaveAttribute("data-screen", "review");
  await expect(console.getByRole("heading", { name: "确认激活" })).toBeVisible();
  await expect(console.getByText("~/.claude/settings.json", { exact: true })).toBeVisible();
  await expect(console.getByText("~/.bootagent/profile.json", { exact: true })).toBeVisible();
  const reviewFitsWindow = await console.evaluate((root) => {
    const windowRect = root.querySelector<HTMLElement>("[data-console-window]")!.getBoundingClientRect();
    const footerRect = root.querySelector<HTMLElement>(".activation-page-footer")!.getBoundingClientRect();
    return footerRect.top >= windowRect.top && footerRect.bottom <= windowRect.bottom + 1;
  });
  expect(reviewFitsWindow, "the fixed Review actions must stay inside the product window").toBe(true);
  await console.getByLabel("配置模版名称").fill("团队默认 2");
  await console.getByRole("button", { name: /开始安装/ }).click();

  await expect(console).toHaveAttribute("data-screen", "install");
  await expect(console).toHaveAttribute("data-route", "/tasks/install/claude-code");
  await expect(console.getByText("@anthropic-ai/claude-code", { exact: false })).toBeVisible();
  const installLog = console.locator(".activation-install-log pre");
  await expect(installLog).toContainText("$ npm install -g --registry=https://registry.npmmirror.com/");
  await expect(installLog).not.toContainText("\\n");
  expect(await installLog.innerText()).toContain("\n$ claude --version");
  await expect(console.locator("[data-task-popover]")).toBeVisible();
  await expect(console.locator("[data-task-status]")).toContainText("安装完成", { timeout: 5000 });
  await console.getByRole("button", { name: /进入总览/ }).click();

  await expect(console).toHaveAttribute("data-screen", "overview");
  await expect(console).toHaveAttribute("data-route", "/overview");
  await expect(console.getByRole("heading", { name: "环境总览" })).toBeVisible();
  await expect(console.locator('[data-nav-id="overview"]')).toHaveClass(/is-active/);
  await expect(console.getByText("团队默认 2", { exact: true })).toBeVisible();
  await expect(console.getByRole("button", { name: /启动/ })).toBeVisible();

  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => {
    const axeApi = (window as typeof window & { axe: typeof axe }).axe;
    return axeApi.run(document.querySelector("#activation-console")!, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  const serious = result.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  expect(fetches, "the public demo must not call a local or remote activation API").toEqual([]);
});

test("activation demo reuses a saved profile by skipping Provider and Model but still installs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const console = page.locator("#activation-console");
  await page.getByRole("button", { name: "开始激活演示" }).click();
  await console.getByRole("tab", { name: "命令行 Agent" }).click();
  await console.getByRole("radio", { name: "选择 Claude Code" }).click();
  await console.getByRole("button", { name: /^继续/ }).click();

  await expect(console).toHaveAttribute("data-screen", "profile");
  await console.getByRole("button", { name: /^继续/ }).click();

  await expect(console).toHaveAttribute("data-screen", "review");
  await expect(console.locator('[data-step-id="provider"]')).toHaveAttribute("data-presentation", "skipped");
  await expect(console.locator('[data-step-id="model"]')).toHaveAttribute("data-presentation", "skipped");
  await expect(console.getByLabel("配置模版名称")).toBeHidden();
  await console.getByRole("button", { name: /开始安装/ }).click();
  await expect(console).toHaveAttribute("data-screen", "install");
  await expect(console).not.toHaveAttribute("data-screen", "overview");
});

test("activation Review keeps its fixed actions inside the 1180 by 760 reference viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the reference viewport only needs one browser project");
  await page.setViewportSize({ width: 1180, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const console = page.locator("#activation-console");
  await page.getByRole("button", { name: "开始激活演示" }).click();
  await console.getByRole("tab", { name: "命令行 Agent" }).click();
  await console.getByRole("radio", { name: "选择 Claude Code" }).click();
  await console.getByRole("button", { name: /^继续/ }).click();
  await console.getByRole("button", { name: /新建配置模版/ }).click();
  await console.getByRole("button", { name: /继续选择模型/ }).click();
  await console.getByRole("radio", { name: /deepseek\/deepseek-v4-pro/ }).click();
  await console.getByRole("button", { name: /^继续/ }).click();

  const geometry = await console.evaluate((root) => {
    const windowRect = root.querySelector<HTMLElement>("[data-console-window]")!.getBoundingClientRect();
    const body = root.querySelector<HTMLElement>(".activation-page-body")!;
    const footerRect = root.querySelector<HTMLElement>(".activation-page-footer")!.getBoundingClientRect();
    const startButtonRect = root
      .querySelector<HTMLElement>('[data-action="start-install"]')!
      .getBoundingClientRect();
    return {
      bodyOverflow: body.scrollHeight - body.clientHeight,
      footerBottom: footerRect.bottom,
      startButtonBottom: startButtonRect.bottom,
      windowBottom: windowRect.bottom,
    };
  });
  expect(geometry.bodyOverflow, "the desktop Review should show its full summary without scrolling").toBeLessThanOrEqual(1);
  expect(geometry.footerBottom, "the Review footer must not be clipped").toBeLessThanOrEqual(geometry.windowBottom + 1);
  expect(geometry.startButtonBottom, "the Start installation action must remain visible").toBeLessThanOrEqual(
    geometry.windowBottom + 1,
  );

  await page.setViewportSize({ width: 680, height: 900 });
  const narrowGeometry = await console.evaluate((root) => {
    const window = root.querySelector<HTMLElement>("[data-console-window]")!;
    const workspace = root.querySelector<HTMLElement>(".activation-workspace")!;
    const windowRect = window.getBoundingClientRect();
    const footerRect = root.querySelector<HTMLElement>(".activation-page-footer")!.getBoundingClientRect();
    const noteRect = root
      .querySelector<HTMLElement>('[data-footer-screen="review"] .activation-route-note')!
      .getBoundingClientRect();
    return {
      footerBottom: footerRect.bottom,
      noteBottom: noteRect.bottom,
      windowBottom: windowRect.bottom,
      workspaceOverflow: workspace.scrollHeight - Math.round(workspace.getBoundingClientRect().height),
    };
  });
  expect(narrowGeometry.workspaceOverflow, "the narrow workspace must not overflow its clipped window").toBeLessThanOrEqual(1);
  expect(narrowGeometry.footerBottom, "the narrow Review footer must stay inside the product window").toBeLessThanOrEqual(
    narrowGeometry.windowBottom + 1,
  );
  expect(narrowGeometry.noteBottom, "the backup note must remain legible at the narrow breakpoint").toBeLessThanOrEqual(
    narrowGeometry.windowBottom + 1,
  );
});

test("reduced motion starts on Agent and leaves autoplay disabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const console = page.locator("#activation-console");
  await expect(console).toHaveAttribute("data-screen", "agents");
  await expect(console).not.toHaveAttribute("data-autoplaying", "true");
  const trigger = page.getByRole("button", { name: "开始激活演示" });
  await trigger.focus();
  const scrollBeforeReplay = await page.evaluate(() => window.scrollY);
  await trigger.click();
  await expect(console).toHaveAttribute("data-screen", "agents");
  expect(await page.evaluate(() => window.scrollY), "replay must not scroll under reduced motion").toBe(scrollBeforeReplay);
  expect(
    await console.evaluate((element) => element.contains(document.activeElement)),
    "replay must not move focus into the product window under reduced motion",
  ).toBe(false);
  const animations = await console.evaluate((element) =>
    element.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length,
  );
  expect(animations).toBe(0);
});

test("activation demo plays itself through to Overview without a click", async ({ page }) => {
  const fetches: string[] = [];
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType())) fetches.push(request.url());
  });
  await page.goto("/");
  const console = page.locator("#activation-console");
  await console.scrollIntoViewIfNeeded();

  await expect(console).toHaveAttribute("data-screen", "overview", { timeout: 40_000 });
  await expect(console.getByRole("heading", { name: "环境总览" })).toBeVisible();
  await expect(console).not.toHaveAttribute("data-autoplaying", "true");
  await expect(console.getByRole("button", { name: /启动/ })).toBeVisible();
  expect(fetches, "an unattended demo must not call anything either").toEqual([]);
});

test("interacting during autoplay stops it where it stands", async ({ page }) => {
  await page.goto("/");
  const console = page.locator("#activation-console");
  await console.scrollIntoViewIfNeeded();
  await expect(console).toHaveAttribute("data-autoplaying", "true");
  await expect(console).toHaveAttribute("data-screen", /^(agents|profile|provider|model|review)$/);

  await console.locator("[data-panel]:visible").click({ position: { x: 8, y: 8 } });
  await expect(console).not.toHaveAttribute("data-autoplaying", "true");
  const takenOverAt = await console.getAttribute("data-screen");
  await page.waitForTimeout(4000);
  expect(await console.getAttribute("data-screen"), "autoplay resumed after takeover").toBe(takenOverAt);

  await page.getByRole("button", { name: "开始激活演示" }).click();
  await expect(console).toHaveAttribute("data-screen", "agents");
  await expect(console).not.toHaveAttribute("data-autoplaying", "true");
});

test("autoplay never takes keyboard focus", async ({ page }) => {
  await page.goto("/");
  const console = page.locator("#activation-console");
  await console.scrollIntoViewIfNeeded();

  const insideConsole = () =>
    page.evaluate(() => Boolean(document.querySelector("#activation-console")?.contains(document.activeElement)));
  for (let sample = 0; sample < 130; sample += 1) {
    expect(await insideConsole(), "autoplay moved focus into the console").toBe(false);
    if ((await console.getAttribute("data-screen")) === "overview") break;
    await page.waitForTimeout(250);
  }
  await expect(console).toHaveAttribute("data-screen", "overview", { timeout: 40_000 });
});

test("Explorer restores shareable state and returns focus after the drawer closes", async ({ page }) => {
  await page.goto("/explore/?agent=claude-code&provider=ppio&platform=macos&protocol=anthropic");
  const explorer = page.locator("compatibility-explorer");
  const drawer = explorer.locator("[data-explorer-drawer]");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "Claude Code" })).toBeVisible();
  await expect(explorer.locator('[data-filter="platform"]')).toHaveValue("macos");
  await expect(explorer.locator('[data-filter="provider"]')).toHaveValue("ppio");
  await expect(explorer.locator('[data-filter="protocol"]')).toHaveValue("anthropic");

  await drawer.getByRole("button", { name: "关闭详情" }).click();
  await expect(page).not.toHaveURL(/agent=/);

  const card = explorer.locator('[data-agent-card][data-agent-id="claude-code"]');
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(card).toBeFocused();
});

test("Explorer filters only catalog-backed combinations", async ({ page }) => {
  await page.goto("/explore/");
  const explorer = page.locator("compatibility-explorer");
  await explorer.locator('[data-filter="platform"]').selectOption("windows");
  await explorer.locator('[data-filter="protocol"]').selectOption("responses");
  await explorer.locator('[data-filter="provider"]').selectOption("ppio");
  /* Two agents speak Responses on Windows: the Codex CLI and ChatGPT Desktop,
     which shares Codex's configuration while being a separate product at install
     time. Asserting the set rather than a count keeps the test honest about
     which ones matched. */
  const visible = explorer.locator("[data-agent-card]:visible");
  await expect(visible).toHaveCount(2);
  expect(await visible.evaluateAll((cards) => cards.map((card) => (card as HTMLElement).dataset.agentId).sort()))
    .toEqual(["chatgpt-desktop", "codex"]);
  await expect(page).toHaveURL(/platform=windows/);
  await expect(page).toHaveURL(/protocol=responses/);
  await expect(page).toHaveURL(/provider=ppio/);
});

/* A coming-soon agent has no protocol to compare against a provider, so every
   pair including it would render as "unsupported" — a claim about the provider
   rather than the truth, that BootAgent does not support the agent yet. It belongs
   on the catalog page and not in the verdict grid.
 *
 * The rule is asserted against whatever is currently planned rather than against
 * a hardcoded list. Upstream v0.3.0 shipped openclaw and hermes, which this test
 * used to name as planned — so a fixed list turns the invariant into a fact about
 * one release, and the test fails for the wrong reason the next time the catalog
 * moves. `planned-agents.json` is legitimately empty today, and an empty planned
 * set is a vacuous pass, which is the honest outcome: there is nothing to exclude. */
test("Explorer leaves coming-soon agents out of the verdict grid", async ({ page }) => {
  const planned = Object.keys(
    (JSON.parse(readFileSync("data/planned-agents.json", "utf8")) as { agents: Record<string, unknown> }).agents,
  );
  await page.goto("/explore/");
  const explorer = page.locator("compatibility-explorer");
  for (const id of planned) {
    await expect(explorer.locator(`[data-agent-card][data-agent-id="${id}"]`)).toHaveCount(0);

    // A shared URL naming one must not restore it either.
    await page.goto(`/explore/?agent=${id}`);
    await expect(explorer.locator("[data-agent-card].is-selected")).toHaveCount(0);
  }
});

/* The download page renders from whatever the GitHub Releases feed returned at
   build time. With no published release the whole platform picker is replaced by
   a "not published yet" notice, which is the correct page — but it means the
   picker tests have nothing to drive.
 *
 * They skip rather than being deleted or loosened. A release exists in the repo
 * this site ships from, so these assertions are the ones that catch a regression
 * there; silently dropping them would mean the download flow rots unnoticed the
 * next time a build does have artifacts. The skip reason names the cause so a red
 * run is not mistaken for a broken picker.
 */
async function skipWithoutPublishedRelease(page: Page) {
  await page.goto("/downloads/");
  const hasPicker = await page.locator("[data-platform-picker]").count();
  test.skip(hasPicker === 0, "no release is published, so the page renders the unavailable notice");
}

/* The expected digest used to be read from the site's own release-index.json and
   compared against the page. That artifact is gone — release data now comes from
   GitHub Releases at build time — so there is no second copy to cross-check
   against, and asserting the shape of what the page prints is what remains. A
   64-hex digest and a real download link are still worth gating: an empty or
   truncated checksum is exactly what a reader cannot verify with. */
test("download center recommends an available artifact but keeps manual choices", async ({ page }) => {
  await skipWithoutPublishedRelease(page);
  const picker = page.getByRole("group", { name: "选择平台与架构" });
  await expect(picker).toBeVisible();
  const platform = (id: string) => picker.locator(`input[type="radio"][value="${id}"]`);

  /* The "this platform is not published yet" state used to be asserted here, first
     against windows-x64 and then against linux-x64. Both assertions decayed the
     same way: upstream shipped the platform, the artifact became real, and the test
     was left checking that a working download was absent. As of v0.6.0 every target
     in the picker has an asset, so there is no platform left to assert it against —
     the state is unreachable from the live feed by construction.
   *
     It is covered deterministically instead by "lists targets with no asset as
     planned rather than dropping them" in src/lib/release-channel.test.ts, which
     stubs the feed and does not depend on what upstream happens to ship. Do not
     reintroduce it here against whichever platform is currently missing. */
  await platform("macos-arm64").check();
  await expect(page.getByRole("link", { name: "下载 macOS 预览版" })).toBeVisible();
  const active = page.locator("[data-release-panel].is-active");
  await expect(active.locator(".hash-value")).toHaveText(/^[a-f0-9]{64}$/);
  /* Scoped to the active panel, as the sibling test below already does. Every
     platform panel is in the DOM with only CSS hiding the inactive ones, so an
     unscoped match was passing on the coincidence that one platform had an
     artifact; with four published it resolves to four nodes and fails strict mode. */
  await expect(active.getByText("未签名、未公证", { exact: true })).toBeVisible();

  /* Windows shipping is the substance of the v0.3.0 sync, so it is asserted
     rather than left implied: the parsing bug that prompted this dropped three of
     four assets, and a green suite that never checks a second platform would not
     have caught it. */
  await platform("windows-x64").check();
  await expect(active.locator(".hash-value")).toHaveText(/^[a-f0-9]{64}$/);
});

/* Security and enterprise came out of the chrome, but the pages did not go
   anywhere. The security page is where the release evidence, the privacy
   statement and the Stable gate are written down, and the footer is now the only
   route to it, so removing the nav entry and keeping the page reachable are
   asserted together — otherwise a later cleanup drops the page and the trust
   claims leave with it. The #privacy and #release-evidence anchors are checked
   because other documents cite them directly, not just the page. */
test("security and enterprise leave the navigation but stay reachable", async ({ page }) => {
  for (const path of ["/", "/en/"]) {
    await page.goto(path);
    await expect(page.locator(".site-header").getByRole("link", { name: /安全|Security/ })).toHaveCount(0);
    await expect(page.locator(".site-header").getByRole("link", { name: /企业服务|Enterprise/ })).toHaveCount(0);
    await expect(page.locator(".site-footer").getByRole("link", { name: /安全与隐私|Security & privacy/ })).toHaveCount(0);
    await expect(page.locator(".site-footer").getByRole("link", { name: /企业服务|Enterprise/ })).toHaveCount(0);
    // The footer's other two entries are the only route to them, so they stay.
    await expect(page.locator(".site-footer").getByRole("link", { name: /支持与反馈|Support & feedback/ })).toBeVisible();
    await expect(page.locator(".site-footer").getByRole("link", { name: "GitHub Releases" })).toBeVisible();
  }

  for (const path of ["/security/", "/en/security/", "/enterprise/"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} must stay published`).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.goto("/security/");
  await expect(page.locator("#privacy")).toBeAttached();
  await expect(page.locator("#release-evidence")).toBeAttached();
});

// The picker is a real radio group rather than a styled listbox, so arrow keys
// have to move the selection — that behaviour is the reason for the markup.
test("platform picker is keyboard operable", async ({ page }) => {
  await skipWithoutPublishedRelease(page);
  const picker = page.getByRole("group", { name: "选择平台与架构" });
  await picker.locator('input[value="macos-arm64"]').focus();
  await page.keyboard.press("ArrowDown");
  await expect(picker.locator('input[value="macos-x64"]')).toBeChecked();
  await expect(page.locator('[data-release-panel="macos-x64"]')).toHaveClass(/is-active/);
  await page.keyboard.press("ArrowUp");
  await expect(picker.locator('input[value="macos-arm64"]')).toBeChecked();
  await expect(page.getByRole("link", { name: "下载 macOS 预览版" })).toBeVisible();
  // The ring belongs to the card, not the 16px dot inside it.
  await expect(picker.locator('input[value="macos-arm64"]')).toHaveCSS("outline-style", "none");
});

// The detection note is a server-rendered localised template that the client
// fills in from the DOM. Reading those templates off the wrong element leaves
// every branch as an empty string, which blanks the note instead of failing
// loudly — so both locales assert real text with no placeholder left behind.
for (const [route, expected] of [
  ["/downloads/", "已识别为"],
  ["/en/downloads/", "Detected as"],
] as const) {
  test(`the download page explains its platform detection in the page's language (${route})`, async ({ page }) => {
    await page.goto(route);
    const note = page.locator("[data-detected-note]");
    // The note lives inside the platform picker, which is absent when no release
    // is published. Same reason as skipWithoutPublishedRelease above.
    test.skip((await note.count()) === 0, "no release is published, so the page renders the unavailable notice");
    await expect(note).toContainText(expected);
    await expect(note).not.toContainText("{");
  });
}

/* Replaces a test that opened /agents/cursor/ to check the guide-only path.
 * Upstream removed Cursor — and every other guide-only entry — from
 * agents.lock.json, so the catalog has no agent left whose install path is an
 * official flow, and there is nothing to point that assertion at.
 *
 * The distinction worth keeping is the one that replaced it: a desktop
 * application and a command-line agent are different products, and the page must
 * not describe one with the other's facts. A desktop app has no launch command
 * and no pinned version; both are installed by BootAgent.
 */
test("a desktop application is described as a desktop application", async ({ page }) => {
  await page.goto("/agents/chatgpt-desktop/");
  await expect(page.getByText("桌面端 Agent", { exact: true }).first()).toBeVisible();
  // Rendered twice by design: once as a fact cell, once as a summary chip.
  await expect(page.getByText("BootAgent 可管理安装", { exact: true }).first()).toBeVisible();
  // Shares Codex's config target, which is the fact a reader needs before install.
  await expect(page.getByText(/\.codex\/config\.toml/)).toBeVisible();
  // No CLI facts invented for it.
  await expect(page.getByText("启动命令", { exact: true })).toHaveCount(0);
});

/* A coming-soon agent has a page so a reader can find out what is planned, but
   that page must not print an install, config, protocol or platform contract —
   there is no catalog entry to read one from, and a null rendered in a fact cell
   reads as a capability claim.
 *
 * Driven from planned-agents.json for the same reason as the Explorer test above:
 * this named openclaw, which v0.3.0 now ships with a config adapter, so the test
 * was asserting that a genuinely supported agent claims no support. Skips when
 * nothing is planned — there is no page to check, and a fabricated one would test
 * the fixture rather than the site. */
test("a coming-soon agent claims no support it does not have", async ({ page }) => {
  const planned = Object.keys(
    (JSON.parse(readFileSync("data/planned-agents.json", "utf8")) as { agents: Record<string, unknown> }).agents,
  );
  test.skip(planned.length === 0, "No planned agents in the catalog, so there is no coming-soon page to assert on.");

  for (const id of planned) {
    await page.goto(`/agents/${id}/`);
    await expect(page.getByText("即将支持").first()).toBeVisible();
    for (const claim of ["BootAgent 可管理安装", "BootAgent 可管理配置", "按官方方式安装"]) {
      await expect(page.getByText(claim, { exact: true })).toHaveCount(0);
    }
  }
});

/* Replaces a test that fetched the site's own release-index.json and asserted the
   artifact it published. The site no longer publishes that file, so the guarantee
   worth keeping is the one a reader depends on: the download page states the
   channel honestly, prints a digest they can check, and sends them to the
   official release rather than a mirror the site invented. */
test("download page states the channel and links to the official release", async ({ page }) => {
  await skipWithoutPublishedRelease(page);
  /* Scoped to the active panel throughout. All four platform panels are in the
     DOM and only CSS hides the inactive ones, so an unscoped text match resolves
     against a hidden copy first and fails on visibility. */
  const active = page.locator("[data-release-panel].is-active");
  await expect(active.getByText("未签名技术预览版", { exact: true })).toBeVisible();
  await expect(active.locator(".hash-value")).toHaveText(/^[a-f0-9]{64}$/);
  const download = active.getByRole("link", { name: /下载 .* 预览版/ });
  await expect(download).toHaveAttribute("href", /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\//);
});

/* The Gatekeeper guide replaced a promise the site made in five places: that it
   documented no way around the OS security policy. Reversing that was a decision,
   so the shape of what replaced it is asserted rather than left to review.
 *
 * The load-bearing part is the boundary. Telling a reader how to allow one app is
 * a different act from telling them to disable Gatekeeper, and the second must
 * never appear — including by someone later "simplifying" the guide into a
 * one-line spctl command, which is the shortcut this test exists to block. */
for (const [locale, path] of [["zh", "/quickstart/"], ["en", "/en/quickstart/"]] as const) {
  test(`${locale} first-launch guide allows one app without weakening the system`, async ({ page }) => {
    await page.goto(path);

    /* The side index is display:none below the desktop breakpoint, so navigating
       through it only proves anything where it is rendered. Where it is hidden the
       heading still has to be reachable by fragment — that is the link the
       download page and the page's own warning notice both point at. */
    const index = page.locator(".side-index").getByRole("link", { name: /macOS/ });
    if (await index.isVisible()) {
      await index.click();
    } else {
      await page.goto(`${path}#macos-gatekeeper`);
    }
    await expect(page.locator("#macos-gatekeeper")).toBeVisible();

    /* Never present, in either language. `spctl --master-disable` turns Gatekeeper
       off machine-wide, which is exactly what the surviving half of the promise
       says BootAgent will not ask for. */
    await expect(page.getByText("spctl --master-disable", { exact: false })).toHaveCount(1);
    await expect(page.locator("code", { hasText: "spctl --master-disable" })).toBeVisible();

    // Four steps, each with a screenshot that actually resolves.
    const steps = page.locator(".guide-steps > li");
    await expect(steps).toHaveCount(4);
    const images = page.locator(".guide-steps img");
    await expect(images).toHaveCount(4);
    const count = await images.count();
    for (let index = 0; index < count; index += 1) {
      const image = images.nth(index);
      /* naturalWidth is 0 for an image that 404ed, which is how a base-path
         mistake shows up — the English page is under /en/, so a relative src
         would resolve to a path that does not exist. */
      await expect
        .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      // Screenshots carry meaning here, so none may ship with an empty alt.
      await expect(image).not.toHaveAttribute("alt", "");
    }

    // The trade-off is stated rather than buried: signing removes the need for this.
    await expect(page.getByText(locale === "zh" ? /签名与公证完成后/ : /Once signing and notarisation are done/)).toBeVisible();
  });
}

test("the download page routes to the first-launch guide instead of promising silence", async ({ page }) => {
  for (const [path, target] of [["/downloads/", "quickstart/#macos-gatekeeper"], ["/en/downloads/", "en/quickstart/#macos-gatekeeper"]] as const) {
    await page.goto(path);
    /* The old copy said the site documented no way around the security policy.
       A link to the guide is what replaced it; asserting the link keeps the two
       pages from drifting back into contradicting each other. */
    /* Located by destination rather than by link text: the two locales word the
       link differently ("macOS 首次打开指南" / "first-launch guide"), and the
       guarantee is that the route exists, not how it is phrased. */
    const link = page.locator(`a[href$="${target}"]`);
    await expect(link.first()).toBeVisible();
  }
});

/* The desktop article moved from /help/02-chatgpt-desktop/ to /help/02-desktop/
   once its title stopped naming one of the two applications it documents. The old
   URL was published and indexed, so it stays as a stub.
 *
 * Pages serves static files and has no redirect rules, so this cannot be a 301 —
 * which is exactly why it needs a test. A stub that looks like a normal page is
 * the kind of thing a later cleanup deletes, and nothing else would notice the
 * inbound links breaking. Asserted per locale, because the two stubs point at
 * different destinations and swapping them would be invisible in review. */
for (const [locale, oldPath, newPath] of [
  ["zh", "/help/02-chatgpt-desktop/", "/help/02-desktop/"],
  ["en", "/en/help/02-chatgpt-desktop/", "/en/help/02-desktop/"],
] as const) {
  test(`${locale} retired desktop URL still reaches its successor`, async ({ page }) => {
    await page.goto(oldPath);

    /* The meta refresh is what carries a real browser across, so the assertion is
       that navigation actually happened rather than that the tag is present. */
    await expect(page).toHaveURL(new RegExp(`${newPath.replace(/\//g, "\\/")}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      locale === "zh" ? "配置桌面端 Agent" : "Configuring desktop agents",
    );
  });

  test(`${locale} retired desktop URL does not compete with its successor in search`, async ({ page }) => {
    const response = await page.goto(oldPath, { waitUntil: "commit" });
    expect(response?.status(), `${oldPath} must not 404`).toBe(200);

    /* Read from the raw HTML: the meta refresh has usually already navigated by
       the time a locator would resolve, and these tags belong to the stub rather
       than to the page it lands on. */
    const html = await response!.text();
    expect(html, "the stub must be noindex").toMatch(/<meta name="robots" content="noindex">/);
    expect(html, "the stub must name its successor as canonical").toMatch(
      new RegExp(`<link rel="canonical" href="[^"]*${newPath}"`),
    );
    // A stub with no visible link is a dead end wherever the refresh does not run.
    expect(html, "the stub must link its successor in the body").toContain(`href="${newPath}"`);
  });
}

test("the sitemap lists the live help URL and not the retired one", async ({ page }) => {
  const response = await page.goto("/sitemap-0.xml");
  const xml = await response!.text();

  expect(xml).toContain("/help/02-desktop/");
  /* A noindex page in the sitemap asks crawlers to index something that asks not
     to be indexed, which is the contradiction the sitemap filter exists to avoid. */
  expect(xml, "a noindex stub must not be advertised to crawlers").not.toContain("02-chatgpt-desktop");
});

/* The header's GitHub link points at the product repository, MaimoryLab/BootAgent —
   not at this site's own repository. Getting that wrong is both easy and quiet:
   both URLs resolve, so nothing 404s and a reader is simply sent to the wrong
   place. downloads.ts already had exactly this bug with GITHUB_REPOSITORY.
 *
 * The count itself is deliberately not asserted. It is fetched at build time and
 * changes on its own, so pinning a number would make this fail for a reason
 * unrelated to the code — and it is omitted entirely when the API is rate
 * limited, which is a normal state for a local run. */
test("the header links the product repository and stays keyboard reachable", async ({ page, viewport }) => {
  await page.goto("/");
  const isNarrow = (viewport?.width ?? 1280) <= 920;

  const link = page.locator(".site-header a.github-stars");
  if (isNarrow) {
    /* .header-link is display:none below 920px, so the mobile menu is the only
       route to the repository at this width — an entry that has to exist, or the
       chrome loses the link entirely on a phone. */
    await expect(link).toBeHidden();
    await page.locator(".mobile-menu summary").click();
    const menuLink = page.locator(".mobile-menu nav a", { hasText: "GitHub" });
    await expect(menuLink).toHaveAttribute("href", "https://github.com/MaimoryLab/BootAgent");
    return;
  }

  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://github.com/MaimoryLab/BootAgent");
  /* The visible text is a bare number when present, so the accessible name has to
     come from aria-label — "3" alone tells a screen-reader user nothing. */
  await expect(link).toHaveAttribute("aria-label", /GitHub/);
  await expect(link).not.toHaveAttribute("aria-label", /^\s*$/);
});

test("the header's GitHub link needs no third-party request", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith("http://127.0.0.1") && !url.startsWith("http://localhost")) external.push(url);
  });
  await page.goto("/");
  await expect(page.locator(".site-header")).toBeVisible();

  /* The count is baked in at build time on purpose: the CSP is default-src 'self'
     with no connect-src exception, so a client-side call to api.github.com would
     be blocked, and a third-party badge image would report every visitor to that
     host. Both would show up here. */
  expect(external, "rendering the header must not call out to a third party").toEqual([]);
});

/* The three settings-and-source controls read as one group by sharing a height,
   radius and translucent fill — not by having a container drawn around them. The
   assertion is the sharing, because that is the whole mechanism: if one of them
   drifts to a different height or radius the group silently stops reading as one. */
test("the header's settings controls read as one group", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) <= 920, "the grouped controls are hidden below this width by design");

  await page.goto("/");
  const controls = page.locator(".site-header .header-control");
  await expect(controls).toHaveCount(3);

  const shapes = await controls.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        height: Math.round(node.getBoundingClientRect().height),
        radius: style.borderRadius,
        background: style.backgroundColor,
      };
    }),
  );
  const [first] = shapes;
  for (const shape of shapes) {
    expect(shape.height, "grouped controls must share a height").toBe(first.height);
    expect(shape.radius, "grouped controls must share a radius").toBe(first.radius);
    expect(shape.background, "grouped controls must share a fill").toBe(first.background);
  }
  /* Translucent on purpose: the controls sit on the header's material rather than
     punching opaque holes through it. A solid fill here would mean the grouping
     was achieved by covering the blur instead of layering on it. */
  expect(first.background, "the group's fill should be translucent").toMatch(/rgba|\/\s*0?\.\d/);
});

/* A scroll edge, not a hard divider. At the top of a page the header has nothing
   to separate itself from, so the old 1px border was a rule drawn around nothing —
   and it looked identical at scroll 0 and scroll 2000. The separation now appears
   only when content is actually passing underneath. */
test("the header separates itself from content only once content passes under it", async ({ page }) => {
  await page.goto("/");
  const header = page.locator(".site-header");
  const edge = page.locator(".scroll-edge");

  await expect(header).not.toHaveAttribute("data-scrolled", /.*/);
  await expect(edge).toHaveCSS("opacity", "0");

  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(header).toHaveAttribute("data-scrolled", "");
  await expect(edge).toHaveCSS("opacity", "1");

  /* Flush against the header's bottom edge, or the gradient reads as a detached
     band with a gap above it. The offset comes from --header-height, which the
     narrow breakpoint overrides — so this is asserted at whatever width the
     project runs, not just the wide one. */
  const [headerBottom, edgeTop] = await Promise.all([
    header.evaluate((node) => Math.round(node.getBoundingClientRect().bottom)),
    edge.evaluate((node) => Math.round(node.getBoundingClientRect().top)),
  ]);
  expect(edgeTop, "the scroll edge must sit flush under the header").toBe(headerBottom);

  // Returning to the top puts it back, rather than latching on first scroll.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(header).not.toHaveAttribute("data-scrolled", /.*/);
  await expect(edge).toHaveCSS("opacity", "0");
});

/* The scroll edge and the group's fill are both translucent, so both have to
   answer `prefers-reduced-transparency`. The separation the gradient provided
   comes back as the border it replaced — a reader who asked for less transparency
   still needs to see where the chrome ends, and dropping the gradient without
   restoring the border would leave them with neither. */
test("the header's material degrades for a reader who asks for less transparency", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    /* Playwright has no reducedTransparency option, so the media feature is
       emulated over CDP directly. */
    const session = await context.newCDPSession(page);
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    await page.goto("/");

    const state = await page.evaluate(() => {
      const header = document.querySelector(".site-header")!;
      const control = document.querySelector(".header-control")!;
      return {
        blur: getComputedStyle(header).backdropFilter,
        border: getComputedStyle(header).borderBottomWidth,
        edge: getComputedStyle(document.querySelector(".scroll-edge")!).display,
        controlFill: getComputedStyle(control).backgroundColor,
      };
    });

    expect(state.blur, "the material should stop blurring").toBe("none");
    expect(state.edge, "the translucent gradient should be gone").toBe("none");
    expect(state.border, "and the border it replaced should come back").not.toBe("0px");
    expect(state.controlFill, "the grouped controls should become solid").not.toMatch(/rgba\([^)]*0?\.\d+\)/);
  } finally {
    await context.close();
  }
});

test("serves its own stylesheet and Agent marks rather than 404ing on them", async ({ page }) => {
  // A base path build (SITE_URL/BASE_PATH, as the Pages job uses) emits an
  // absolute <base href>, and the CSP declares base-uri 'self'. Serving such a
  // build from a different origin makes the browser reject the base tag, every
  // asset path 404s, and each page still answers 200 as unstyled HTML. Only the
  // rendered result catches that, so assert on it.
  const missing: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) missing.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.goto("/agents/", { waitUntil: "networkidle" });
  expect(missing, "every asset the page asks for must exist").toEqual([]);
  // A stylesheet that failed to load leaves the UA default, not this palette.
  // --paper on the light theme; update with that token.
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(239, 234, 224)");
  const brokenMarks = await page.evaluate(
    () => document.images.length && [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
  );
  expect(brokenMarks, "Agent marks must render").toBe(0);
});

test.describe("hero particles", () => {
  const frameDigest = (path: string) =>
    `(() => { const c = document.querySelector('${path}'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0; return h; })()`;

  test("animates by default", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("[data-hero-particles]");
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    const first = await page.evaluate(frameDigest("[data-hero-particles]"));
    await page.waitForTimeout(400);
    expect(await page.evaluate(frameDigest("[data-hero-particles]"))).not.toBe(first);
  });

  // The CSS prefers-reduced-motion block only clamps CSS animations, so the
  // canvas has to opt out in script. Only a real reduced-motion context proves it.
  test("paints a static frame under reduced motion", async ({ browser }) => {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.goto("/");
    const first = await page.evaluate(frameDigest("[data-hero-particles]"));
    await page.waitForTimeout(400);
    expect(await page.evaluate(frameDigest("[data-hero-particles]"))).toBe(first);
    await page.close();
  });
});

test("ships a local-only content policy and no third-party scripts", async ({ page }) => {
  await page.goto("/");
  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("form-action 'self'");
  await expect(page.locator('script[src^="http://"], script[src^="https://"]')).toHaveCount(0);
  await expect(page.locator('iframe, object, embed')).toHaveCount(0);
});

for (const path of criticalPages) {
  test(`has no serious accessibility violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.addScriptTag({ content: axe.source });
    const result = await page.evaluate(async () => {
      const axeApi = (window as typeof window & { axe: typeof axe }).axe;
      return axeApi.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
    });
    const serious = result.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

// axe treats <canvas> as an image node and gives up resolving the background
// behind it, so every hero and header text node comes back "incomplete" rather
// than pass — the particle layer hides exactly the copy most worth checking.
// Dropping the decoration first is what actually gates those colours.
test("hero text contrast is proven once the decorative canvas is removed", async ({ page }) => {
  await page.goto("/");
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => {
    document.querySelector("[data-hero-particles]")?.remove();
    const axeApi = (window as typeof window & { axe: typeof axe }).axe;
    return axeApi.run(document, { runOnly: ["color-contrast"] });
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  expect(result.incomplete, JSON.stringify(result.incomplete, null, 2)).toEqual([]);
});

/* WCAG 1.4.11 wants 3:1 for a focus indicator, and nothing else in this suite
 * measures it: axe's color-contrast rule evaluates text only, so a focus ring can
 * fail without any of the accessibility tests above going red. This one did —
 * --focus-ring was translucent and composited to 1.55:1 on the light theme, close
 * to invisible for the keyboard-only users it exists for.
 *
 * Computed against the ring's own painted colour and the ground behind it, in
 * both themes, since the two tokens are set independently.
 */
for (const scheme of ["light", "dark"] as const) {
  test(`focus ring meets WCAG non-text contrast in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");

    const ratio = await page.evaluate(() => {
      /* Resolved by the browser rather than parsed here. A token can be any CSS
         colour syntax — #rrggbb, rgb(), rgba(), a named colour — and hand-rolling
         that parse is how this test first shipped broken: a regex for digit runs
         turned "#2467f2" into [2467, 2, 0] and "#ececef" into [0, 0, 0], so it
         compared two meaningless numbers and passed against the very value it
         was written to reject. Painting the colour and reading it back cannot
         disagree with what the user sees. */
      const probe = document.createElement("span");
      probe.style.display = "none";
      document.body.append(probe);
      const resolve = (token: string): [number, number, number, number] => {
        probe.style.color = "";
        probe.style.color = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
        const parts = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [];
        return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
      };
      const ring = resolve("--focus-ring");
      const ground = resolve("--paper");
      probe.remove();

      const luminance = ([r, g, b]: number[]) => {
        const channel = (c: number) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      // The ring is painted over the ground, so an alpha below 1 has to be
      // composited before measuring — that is exactly what the old value hid.
      const composited = ring.slice(0, 3).map((c, i) => c * ring[3] + ground[i] * (1 - ring[3]));
      const [lighter, darker] = [luminance(composited), luminance(ground)].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    });

    expect(ratio, `focus ring contrast in ${scheme} mode`).toBeGreaterThanOrEqual(3);
  });
}

// Navigation animates via the native cross-document path, so the proof is that
// the outgoing document reports a live transition on pageswap. Asserting on the
// CSS alone would still pass if the browser declined to run it.
// Below 920px the nav collapses into a disclosure menu, and the transition is a
// document-level behaviour that does not vary by viewport — one width proves it.
test("navigating between pages runs a cross-document view transition", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 920, "nav links are collapsed at this width");
  await page.goto("/");
  await page.evaluate(() => {
    window.addEventListener("pageswap", (event) => {
      sessionStorage.setItem("vt-ran", (event as PageSwapEvent).viewTransition ? "yes" : "no");
    });
  });
  await page.getByLabel("主导航").getByRole("link", { name: "配置", exact: true }).click();
  await expect(page).toHaveURL(/\/explore\/$/);
  expect(await page.evaluate(() => sessionStorage.getItem("vt-ran"))).toBe("yes");
  // The shared chrome opts out of the crossfade by being named on both pages.
  await expect(page.locator(".site-header")).toHaveCSS("view-transition-name", "site-header");
});

test.describe("hero entrance", () => {
  // .hero-brand leads the stagger now, in place of the removed channel note.
  const heroParts = [".hero-brand", ".eyebrow", ".display", ".lede", ".hero-actions", ".product-shot"];

  test("staggers the hero into place on first paint", async ({ page, viewport }) => {
    await page.goto("/");
    const delays = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => (animation as CSSAnimation).animationName === "hero-rise")
        .map((animation) => Number((animation.effect as KeyframeEffect).getTiming().delay))
        .sort((a, b) => a - b),
    );
    if ((viewport?.width ?? 0) <= 680) {
      // Stacked layout moves the block, not the lines — see the note in global.css.
      expect(delays).toEqual([0, 180]);
    } else {
      expect(delays).toEqual([0, 70, 140, 220, 290, 360]);
    }
  });

  // The previous attempt faded these in, which dropped the largest type on the
  // site below AA for the whole animation. Auditing only the settled page would
  // not have caught it, so sample while the entrance is still running.
  test("keeps hero text readable while the entrance runs", async ({ page }) => {
    await page.goto("/");
    await page.addScriptTag({ content: axe.source });
    const worst = await page.evaluate(async (parts) => {
      document.querySelector("[data-hero-particles]")?.remove();
      for (const selector of [...parts, ".hero-copy"]) {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) continue;
        element.style.animation = "none";
        void element.offsetHeight;
        element.style.animation = "";
      }
      const axeApi = (window as typeof window & { axe: typeof axe }).axe;
      let violations = 0;
      for (let sample = 0; sample < 4; sample += 1) {
        await new Promise((resolve) => setTimeout(resolve, 90));
        const result = await axeApi.run(document, { runOnly: ["color-contrast"] });
        violations += result.violations.reduce((total, entry) => total + entry.nodes.length, 0);
      }
      return violations;
    }, heroParts);
    expect(worst, "hero copy must clear AA at every frame of the entrance").toBe(0);
  });
});

test.describe("english locale", () => {
  // Derived from the route list rather than written out, so adding a translation
  // without auditing its English page is not possible.
  const englishPages = translatedRoutes.map((route) => `/en/${route}`);

  for (const path of englishPages) {
    test(`has no serious accessibility violations: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await page.addScriptTag({ content: axe.source });
      const result = await page.evaluate(async () => {
        document.querySelector("[data-hero-particles]")?.remove();
        const axeApi = (window as typeof window & { axe: typeof axe }).axe;
        return axeApi.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
      });
      const serious = result.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  }

  test("declares reciprocal hreflang alternates with an x-default", async ({ page }) => {
    for (const path of ["/", "/en/", "/explore/", "/en/explore/", "/security/", "/en/security/"]) {
      await page.goto(path);
      const codes = await page.evaluate(() =>
        [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => link.getAttribute("hreflang")),
      );
      expect(new Set(codes), `alternates on ${path}`).toEqual(new Set(["zh-CN", "en", "x-default"]));
    }
  });

  // An untranslated route falls back to Chinese rather than 404ing, which is the
  // right call — but silently swapping the reader's language mid-navigation is
  // not. Every link that does it has to say so before the click.
  test("marks links that fall back to Chinese, and only on English pages", async ({ page }) => {
    await page.goto("/en/");
    /* Security and enterprise left the nav, so the specific links this used to
       name are gone. The sweep below is the real guarantee and covers whatever
       is in the nav now — including the CTA band's untranslated team-services
       link, which is where the hint has to appear on this page. */

    // Every link leaving /en/ for an untranslated route carries the hint.
    const unmarked = await page.evaluate((translated) => {
      return [...document.querySelectorAll("a[href^='/']")]
        .filter((link) => {
          const href = link.getAttribute("href") ?? "";
          if (href.startsWith("/en/") || /\.(json|txt|webmanifest)$/.test(href)) return false;
          const route = href.replace(/^\//, "");
          /* Prefix match, mirroring isTranslated in src/i18n/index.ts: each help
             article is a route of its own, so comparing exactly against "help/"
             would report every one of them as an unmarked language switch. */
          return !translated.some((candidate) => route === candidate || (candidate !== "" && route.startsWith(candidate)));
        })
        .filter((link) => !link.querySelector(".lang-hint"))
        .map((link) => link.getAttribute("href"));
    }, translatedRoutes);
    expect(unmarked, "these links change language without saying so").toEqual([]);

    // The hint is about leaving English; a Chinese reader is already there.
    await page.goto("/");
    await expect(page.locator(".lang-hint")).toHaveCount(0);
  });

  // Switching language has to keep the reader on the page they were reading;
  // dropping them on the home page is the usual failure here.
  test("language switch stays on the equivalent page", async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) < 920, "header actions are collapsed at this width");
    await page.goto("/downloads/");
    await page.getByRole("link", { name: "切换语言" }).click();
    await expect(page).toHaveURL(/\/en\/downloads\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.getByRole("link", { name: "Change language" }).click();
    await expect(page).toHaveURL(/\/downloads\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  });

  test("language switch preserves the Explorer route", async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) < 920, "header actions are collapsed at this width");
    await page.goto("/explore/?platform=macos");
    await page.getByRole("link", { name: "切换语言" }).click();
    await expect(page).toHaveURL(/\/en\/explore\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByRole("link", { name: "Change language" }).click();
    await expect(page).toHaveURL(/\/explore\/$/);
  });

  // Every link on an English page must resolve; an untranslated destination is
  // expected to fall back to Chinese rather than 404 under /en/.
  test("navigation from an english page never lands on a missing route", async ({ page }) => {
    const missing: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) missing.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    await page.goto("/en/", { waitUntil: "networkidle" });
    const targets = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
        .map((anchor) => anchor.href)
        .filter((href) => href.startsWith(location.origin)),
    );
    for (const target of new Set(targets)) {
      const response = await page.request.get(target);
      expect(response.status(), `${target} from /en/`).toBeLessThan(400);
    }
    expect(missing, "assets on /en/ must all exist").toEqual([]);
  });
});

test.describe("dark scheme", () => {
  // The light palette needed five values darkened to clear AA; the dark one is a
  // second, independent set of colours over different grounds, so it needs the
  // same gate rather than an assumption that inverting is safe.
  for (const path of criticalPages) {
    test(`has no serious accessibility violations in the dark: ${path}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(path);
      await expect(page.locator("html")).toHaveClass(/theme-dark/);
      await page.addScriptTag({ content: axe.source });
      const result = await page.evaluate(async () => {
        document.querySelector("[data-hero-particles]")?.remove();
        const axeApi = (window as typeof window & { axe: typeof axe }).axe;
        return axeApi.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
      });
      const serious = result.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  }

  // axe does not measure image contrast, so nothing above would have caught the
  // Codex and OpenCode marks going invisible: they are fill="currentColor" and an
  // <img> resolves that to black regardless of the page.
  test("keeps currentColor agent marks visible without touching brand marks", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/agents/");
    const filters = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLImageElement>(".agent-mark-wrap img")].map((image) => ({
        file: image.src.split("/").pop() ?? "",
        monochrome: image.hasAttribute("data-monochrome"),
        filter: getComputedStyle(image).filter,
      })),
    );
    const monochrome = filters.filter((entry) => entry.monochrome);
    /* Every mark the site ships is a currentColor glyph, so every one of them
       needs inverting in the dark. Listed explicitly rather than counted: a mark
       arriving with its own brand colours must not be added to the monochrome set
       silently, and only naming the files makes that visible here.

       openclaw.svg belongs in this list despite containing #000 and #fff — those
       sit inside a <mask>, where the two are channel values punching out the eyes
       rather than colours that paint anything. */
    expect(monochrome.map((entry) => entry.file).sort()).toEqual([
      "claude-code.svg",
      // Twice: ChatGPT Desktop renders the OpenAI mark rather than a second copy
      // of the same file, so codex.svg appears once per row that uses it.
      "codex.svg",
      "codex.svg",
      // DeepSeek's whale, the same lobe-icons currentColor glyph as the others.
      "dsh.svg",
      "hermes.svg",
      "kilo-cli.svg",
      "openclaw.svg",
      "opencode.svg",
    ]);
    for (const entry of monochrome) expect(entry.filter, entry.file).toBe("invert(1)");
    for (const entry of filters.filter((entry) => !entry.monochrome)) {
      expect(entry.filter, `${entry.file} carries its own colours`).toBe("none");
    }

    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/agents/");
    const light = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLImageElement>(".agent-mark-wrap img")].map(
        (image) => getComputedStyle(image).filter,
      ),
    );
    expect(new Set(light), "no mark is inverted in the light scheme").toEqual(new Set(["none"]));
  });

  test("remembers an explicit choice over the system preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/theme-dark/);

    const toggle = page.getByRole("button", { name: "切换深色模式" });
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/theme-dark/);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    // The inline head script is what makes the choice survive without a flash.
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/theme-dark/);
    await expect(page.getByRole("button", { name: "切换深色模式" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "切换深色模式" }).click();
    await expect(page.locator("html")).not.toHaveClass(/theme-dark/);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/theme-dark/);
  });

  test("paints the resolved theme before first contentful paint", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/", { waitUntil: "commit" });
    // Sampling at commit catches a theme applied late: if the class were set by
    // the deferred module script, the light palette would paint first.
    expect(await page.evaluate(() => document.documentElement.className)).toContain("theme-dark");
  });
});

// The interactive console must share the hero copy measure and size to its own
// content at every breakpoint. A clipped wizard can visually cover the next
// section even when overflow hides the pixels.
test("the activation console sits on the same measure as the copy", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => (animation as CSSAnimation).animationName === "hero-rise")
        .map((animation) => animation.finished),
    ),
  );
  const layout = await page.evaluate(() => {
    const edges = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { left: Math.round(rect.left), right: Math.round(rect.right) };
    };
    const panel = document.querySelector<HTMLElement>("[data-console-window]")!;
    const rect = panel.getBoundingClientRect();
    return {
      copy: edges(".hero-copy"),
      console: edges(".product-shot"),
      contentOverflow: panel.scrollHeight - Math.round(rect.height),
      gapBelowConsole: Math.round(
        document.querySelector(".hero + .section")!.getBoundingClientRect().top -
          document.querySelector(".product-shot")!.getBoundingClientRect().bottom,
      ),
    };
  });
  expect(layout.console).toEqual(layout.copy);
  expect(layout.contentOverflow, "the activation console must not clip its own content").toBeLessThanOrEqual(1);
  expect(layout.gapBelowConsole, "the console must not butt against the next section").toBeGreaterThan(16);
});

// Synthetic mouse events never set :hover, so the resting-vs-hovered difference
// is only observable by moving a real pointer.
test("interactive rows and cards respond to hover", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 920, "hover is not the primary input at this width");

  await page.goto("/agents/");
  const row = page.locator(".agent-row").first();
  await expect(row).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await row.hover();
  // --surface on the light theme. No longer pure white: the palette's grounds
  // are warm, so this tracks the token rather than assuming #fff.
  await expect(row).toHaveCSS("background-color", "rgb(251, 249, 244)");
  await expect(row).not.toHaveCSS("box-shadow", "none");

  await page.goto("/providers/");
  const card = page.locator(".provider-card").first();
  const restingBorder = await card.evaluate((el) => getComputedStyle(el).borderColor);
  await card.hover();
  await expect(card).not.toHaveCSS("border-color", restingBorder);
  await expect(card).not.toHaveCSS("transform", "none");
});

/* Press feedback has to land on pointer-down, which is the foundation the rest of
   the interaction work sits on: the moment feedback waits for the release, the
   sense of directness goes. The site had seven `:active` rules against
   twenty-five `:hover` ones, so most of what a visitor taps acknowledged nothing.
 *
 * Asserted by holding the pointer down and reading the computed style, rather
 * than by grepping the stylesheet — a rule that exists but is overridden by a
 * later selector would pass a source check and still feel dead. */
test("the elements a visitor taps acknowledge the press itself", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 920, "these targets are laid out for a pointer at this width");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const console_ = page.locator("#activation-console");
  await page.getByRole("button", { name: "开始激活演示" }).click();
  await console_.getByRole("tab", { name: "命令行 Agent" }).click();
  const agent = console_.locator('[data-agent-id="claude-code"]');

  /* The Agent rows acknowledge pointer-down before the selection state changes. */
  await expect(agent).toHaveCSS("transform", "none");
  const box = await agent.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(agent).not.toHaveCSS("transform", "none");
  await page.mouse.up();

  // The one control whose whole job is leaving the drawer had no feedback at all.
  await page.goto("/explore/");
  await page.locator(".explorer-card").first().click();
  const close = page.locator(".drawer-close");
  await expect(close).toBeVisible();
  const closeResting = await close.evaluate((el) => getComputedStyle(el).backgroundColor);
  const closeBox = await close.boundingBox();
  await page.mouse.move(closeBox!.x + closeBox!.width / 2, closeBox!.y + closeBox!.height / 2);
  await page.mouse.down();
  await expect(close).not.toHaveCSS("background-color", closeResting);
  await page.mouse.up();
});

/* Decorative hover transforms are gated on `(hover: hover)`. Without the gate a
   touch device applies them on tap and then leaves them applied until the next tap
   lands elsewhere, so a card the visitor chose looks stuck mid-animation.
 *
 * All three Playwright projects run Desktop Chrome and only vary the viewport, so
 * none of them emulates a coarse pointer — the narrow ones report
 * `(hover: hover)` just like the wide one. Rather than change the project matrix
 * for one assertion, this drives a real touch-capable context so the media query
 * is evaluated the way a phone would evaluate it. */
test("decorative hover transforms do not apply to a coarse pointer", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("/explore/");
    expect(
      await page.evaluate(() => matchMedia("(hover: hover)").matches),
      "a touch context must not report itself as hover-capable",
    ).toBe(false);

    /* Tapping must not leave the card translated. `:active` still fires — the
       point is that the *lift* is hover-only, so nothing persists after the tap. */
    const card = page.locator(".explorer-card").first();
    await card.tap();
    await expect(card).toHaveCSS("transform", "none");
  } finally {
    await context.close();
  }
});
