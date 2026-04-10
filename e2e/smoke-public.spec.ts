import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("home, blog and contact render key content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1, name: "Blog" })).toBeVisible();
    await expect(page.getByText("Subscribe via RSS")).toBeVisible();

    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Contact");
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Message")).toBeVisible();
  });

  test("keyboard navigation reaches skip link and nav", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();

    await page.keyboard.press("Tab");
    // Brand/home link should be next reachable link in the sticky navbar.
    await expect(page.getByRole("link", { name: /home/i }).first()).toBeFocused();
  });
});
