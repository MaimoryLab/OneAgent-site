import { expect, test, type Locator, type Page } from "@playwright/test";

test.skip(
  process.platform !== "darwin",
  "The checked-in visual references use macOS SF/PingFang system fonts; cross-platform behavior is covered by the functional E2E suite.",
);

/* Locator screenshots can rasterize the rounded 1px window edge on either side
   of a fractional page offset. That accounts for roughly the window width in
   changed edge pixels; 1,500 tolerates that edge only, while still rejecting a
   shifted footer, missing panel, or changed content block. */
const visualOptions = { animations: "disabled", maxDiffPixels: 1_500 } as const;

async function openManualDemo(page: Page) {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "开始激活演示" }).click();
  const console = page.locator("#activation-console");
  await expect(console).toHaveAttribute("data-screen", "agents");
  return console;
}

async function reachProvider(console: Locator) {
  await console.getByRole("tab", { name: "命令行 Agent" }).click();
  await console.getByRole("radio", { name: "选择 Claude Code" }).click();
  await console.getByRole("button", { name: /^继续/ }).click();
  await console.getByRole("button", { name: /新建配置模版/ }).click();
  await expect(console).toHaveAttribute("data-screen", "provider");
}

async function reachReview(console: Locator) {
  await reachProvider(console);
  await console.getByRole("button", { name: /继续选择模型/ }).click();
  await console.getByRole("radio", { name: /deepseek\/deepseek-v4-pro/ }).click();
  await console.getByRole("button", { name: /^继续/ }).click();
  await expect(console).toHaveAttribute("data-screen", "review");
}

test("activation v0.4.0 desktop screens keep their visual contract", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser project is enough for the macOS reference baseline");
  await page.setViewportSize({ width: 1180, height: 760 });
  const console = await openManualDemo(page);
  await page.mouse.move(1170, 20);
  await expect(console).toHaveScreenshot("activation-agents-v040.png", visualOptions);

  await reachProvider(console);
  await page.mouse.move(1170, 20);
  await expect(console).toHaveScreenshot("activation-provider-v040.png", visualOptions);

  await console.getByRole("button", { name: /继续选择模型/ }).click();
  await console.getByRole("radio", { name: /deepseek\/deepseek-v4-pro/ }).click();
  await console.getByRole("button", { name: /^继续/ }).click();
  await page.mouse.move(1170, 20);
  await expect(console).toHaveScreenshot("activation-review-v040.png", visualOptions);

  await console.getByRole("button", { name: /开始安装/ }).click();
  await expect(console.locator("[data-task-status]")).toContainText("安装完成", { timeout: 5000 });
  await page.mouse.move(1170, 20);
  await expect(console).toHaveScreenshot("activation-install-complete-v040.png", visualOptions);

  await console.getByRole("button", { name: /进入总览/ }).click();
  await page.mouse.move(1170, 20);
  await expect(console).toHaveScreenshot("activation-overview-v040.png", visualOptions);
});

test("activation v0.4.0 remains legible at the narrow breakpoint", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser project is enough for the macOS reference baseline");
  await page.setViewportSize({ width: 680, height: 900 });
  const console = await openManualDemo(page);
  await reachReview(console);
  await expect(console).toHaveScreenshot("activation-review-narrow-v040.png", visualOptions);
});
