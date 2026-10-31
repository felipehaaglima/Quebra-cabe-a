import { expect, type Page } from '@playwright/test';
export async function ready(page: Page) {
  await expect(page.getByRole('button', { name: 'Bolsas', exact: true })).toBeEnabled();
  const tools = page.getByRole('button', { name: 'Ferramentas', exact: true });
  if (await tools.getAttribute('aria-expanded') !== 'true') await tools.click();
  await expect(page.getByRole('button', { name: 'Centralizar', exact: true })).toBeVisible();
  await page.getByLabel('Reduzir movimento', { exact: true }).check();
  // Wait for the ResizeObserver to use the newly available canvas height.
  await expect.poll(() => page.locator('canvas').evaluate((canvas) => Math.abs(canvas.clientHeight - (canvas as HTMLCanvasElement).height / (devicePixelRatio > 2 ? 2 : devicePixelRatio)) < 2)).toBe(true);
}

