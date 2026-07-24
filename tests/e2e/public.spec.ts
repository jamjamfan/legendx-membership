import { expect, test } from "@playwright/test";

test("public journey explains all three stages", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /學識，成事/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "由 $980 財技班開始" }),
  ).toBeVisible();
  await expect(page.getByText("STAGE 01", { exact: true })).toBeVisible();
  await expect(page.getByText("STAGE 02", { exact: true })).toBeVisible();
  await expect(page.getByText("STAGE 03", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "將你嘅推薦，變成下一位學員嘅起點。" }),
  ).toBeVisible();
});

test("course page exposes session and checkout path", async ({ page }) => {
  await page.goto("/course/1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "從財商覺醒，到時間自由",
  );
  await expect(
    page.getByRole("heading", { name: "揀財技 3 班或財技 4 班。" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: /報讀呢一班|加入候補|建立帳戶/ })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "新場次準備中" }),
  ).toBeVisible();
  await expect(page.getByText("財技 3 班 · 三晚時間自由藍圖")).toHaveCount(0);
});

test("production member and admin portals fail closed", async ({ page }) => {
  await page.goto("/member");
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByRole("heading", { name: "會員登入" })).toBeVisible();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByRole("heading", { name: "會員登入" })).toBeVisible();
});

test("production readiness and demo-only routes fail closed", async ({
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(503);
  const body = await health.json();
  expect(body.status).toBe("degraded");
  expect(body.database).toBe("not_configured");
  expect(body.integrations.every((item: { ready: boolean }) => !item.ready)).toBe(
    true,
  );

  const demoCalendar = await request.get("/api/calendar/demo.ics");
  expect(demoCalendar.status()).toBe(404);
});

test("mobile navigation is keyboard accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.locator('summary[aria-label="開啟導覽選單"]');
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("navigation", { name: "流動版導覽" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "流動版導覽" }).getByRole("link", {
      name: "會員登入",
    }),
  ).toBeVisible();
});
