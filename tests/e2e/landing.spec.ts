import { expect, test } from '@playwright/test';

test('Iniciar abre a mesa por toque ou mouse', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Quebra-cabeça/);
  const start = page.getByRole('link', { name: 'Iniciar' });
  const box = await start.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  if (isMobile) await start.tap(); else await start.click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole('heading', { name: 'Mesa tranquila' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});

test('teclado abre a mesa com movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Iniciar' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/play$/);
});
