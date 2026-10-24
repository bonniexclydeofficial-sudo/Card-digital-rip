import { expect, test } from "@playwright/test";

test("pack page publishes odds, pool, EV, buyback, and the seed hash", async ({ page }) => {
  await page.goto("/packs/pack-100");
  const odds = page.getByTestId("pack-odds");
  await expect(odds).toContainText("72%");
  await expect(odds).toContainText("20%");
  await expect(odds).toContainText("6.5%");
  await expect(odds).toContainText("1.4%");
  await expect(odds).toContainText("0.1%");
  await expect(page.getByTestId("pack-ev")).toHaveText("$100.94");
  await expect(page.getByTestId("pack-price")).toHaveText("$100.00");
  await expect(page.getByTestId("buyback-rate")).toHaveText("90%");
  await expect(page.getByTestId("seed-hash")).toHaveText(/^[0-9a-f]{64}$/);
  await expect(page.getByTestId("pool")).toContainText("Example");
  await expect(page.getByTestId("fee-note")).toContainText("Credits cannot be withdrawn");
});

test("the example pull verifies as a match", async ({ page }) => {
  await page.goto("/verify/pull_example");
  await expect(page.getByTestId("verify-status")).toHaveText("Match");
  await expect(page.getByTestId("server-seed")).toHaveText(/^[0-9a-f]{64}$/);
});

test("under-18 and blocked-state signups stop on the restricted page", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/signup");
  await page.fill("#email", `minor-${stamp}@example.com`);
  await page.fill("#username", `minor${stamp}`.slice(0, 20));
  await page.fill("#password", "password-ok");
  await page.fill("#dob", "2015-01-01");
  await page.selectOption("#state", "CA");
  await page.check("#terms");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("restricted-reason")).toContainText("age");

  await page.goto("/signup");
  await page.fill("#email", `geo-${stamp}@example.com`);
  await page.fill("#username", `geo${stamp}`.slice(0, 20));
  await page.fill("#password", "password-ok");
  await page.fill("#dob", "1990-01-01");
  await page.selectOption("#state", "WA");
  await page.check("#terms");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("restricted-reason")).toContainText("geo");
});

test("a signed-in rip plays the original reveal and stops on the drawn tier", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "ada@example.com");
  await page.fill("#password", "rip-demo");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/catalog");
  await page.goto("/packs/pack-25");
  await page.getByTestId("rip").click();
  await page.waitForURL("**/rip/**");
  const stage = page.getByTestId("reveal-stage");
  await expect(stage).toHaveAttribute("data-drawn-tier", /^[0-4]$/);
  const drawn = Number(await stage.getAttribute("data-drawn-tier"));
  const ceiling = Number(await stage.getAttribute("data-meter-ceiling"));
  expect(ceiling).toBe(drawn + 1);
  await expect(stage).toHaveAttribute("data-phase", "decision", { timeout: 15_000 });
  const pos = Number(await stage.getAttribute("data-meter-pos"));
  expect(pos).toBeLessThanOrEqual(ceiling + 1e-6);
  await expect(page.getByRole("button", { name: /Buy back for/ })).toBeVisible();
});

test("the margin guard blocks the thin draft and the CSV dry run writes nothing", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "admin@example.com");
  await page.fill("#password", "admin-demo");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/catalog");
  await page.goto("/admin/packs");
  const guard = page.getByTestId("margin-guard");
  await expect(guard).toContainText("MARGIN");
  await guard.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Publish blocked")).toBeVisible();
  await expect(page.getByTestId("margin-guard")).toContainText("draft");

  await page.goto("/admin/cards");
  await page.getByRole("button", { name: "Dry run" }).click();
  await expect(page.getByTestId("csv-report")).toContainText("Nothing was written");
});

test("a public share card shows the example slab and a verify link", async ({ page }) => {
  await page.goto("/share/pull_example");
  const card = page.getByTestId("share-card");
  await expect(card).toContainText("EXAMPLE");
  await expect(card).toContainText("Field Notes");
  await expect(page.getByRole("link", { name: "Verify this pull" })).toHaveAttribute("href", "/verify/pull_example");
});

test("legal pages stay marked draft and state the buyback and arbitration rules", async ({ page }) => {
  await page.goto("/legal/terms");
  await expect(page.getByTestId("legal-draft")).toContainText("DRAFT");
  await expect(page.locator("body")).toContainText("72 hours");
  await expect(page.locator("body")).toContainText("JAMS");
  await expect(page.locator("body")).toContainText("Delaware");
  await expect(page.locator("body")).toContainText("$250");
  await page.goto("/legal/buyback");
  await expect(page.locator("body")).toContainText("separate");
  await expect(page.locator("body")).not.toContainText("jackpot");
});
