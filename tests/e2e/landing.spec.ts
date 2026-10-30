import { expect, test } from "@playwright/test";

test("landing responsiva e início por toque ou mouse", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Quebra-cabeça/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const start = page.getByRole("button", { name: "Iniciar" });
  const box = await start.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("landing.png"), fullPage: true });
  if (isMobile) await start.tap(); else await start.click();
  await expect(page.getByRole("status")).toContainText("A montagem ainda não está disponível");
  await page.reload();
  await expect(page.getByRole("status")).toBeEmpty();
  expect(errors).toEqual([]);
});

test("teclado e movimento reduzido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Iniciar" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Estamos preparando a mesa");
});
