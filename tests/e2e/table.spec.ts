import { expect, test } from '@playwright/test';

test('mesa renderiza, navega, redimensiona e libera o canvas ao sair', async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/play');
  const canvas = page.locator('canvas');
  const view = page.getByLabel('Visão da mesa');
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeEnabled();
  await expect(canvas).toHaveCount(1);
  await expect(view).toHaveText('100% · 0°');
  // Verify actual pixels from a real WebGL render, not just canvas existence.
  const initial = await canvas.screenshot();
  await page.getByRole('button', { name: 'Ampliar zoom' }).click();
  await expect(view).toHaveText('125% · 0°');
  expect(await canvas.screenshot()).not.toEqual(initial);
  await page.getByRole('button', { name: 'Girar 90°' }).click();
  await expect(view).toHaveText('125% · 90°');
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Home');
  await expect(view).toHaveText('100% · 0°');
  const box = (await canvas.boundingBox())!;
  if (isMobile) {
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 45, y: y + 30 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 30, { steps: 4 });
    const dragged = await canvas.screenshot();
    await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 60);
    expect(await canvas.screenshot()).toEqual(dragged);
    await page.mouse.up();
  }
  expect(await canvas.screenshot()).not.toEqual(initial);
  await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.getByRole('button', { name: 'Centralizar' }).click();
  expect(await canvas.screenshot()).toEqual(initial);
  await page.getByRole('button', { name: 'Ampliar zoom' }).click();
  await page.getByRole('button', { name: 'Girar 90°' }).click();
  await page.setViewportSize(isMobile ? { width: 844, height: 390 } : { width: 1000, height: 700 });
  await expect(view).toHaveText('125% · 90°');
  await page.getByRole('button', { name: 'Centralizar' }).click();
  await expect(view).toHaveText('100% · 0°');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.screenshot({ path: testInfo.outputPath('mesa.png'), fullPage: true });
  await page.getByRole('link', { name: 'Início' }).click();
  await expect(canvas).toHaveCount(0);
  await page.getByRole('link', { name: 'Iniciar' }).click();
  await expect(canvas).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeEnabled();
  await page.reload();
  await expect(view).toHaveText('100% · 0°');
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeEnabled();
  expect(errors).toEqual([]);
});


test('explica indisponibilidade gráfica e permite tentar novamente', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/play');
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível abrir a mesa' })).toContainText('Não foi possível abrir a mesa');
  await expect(page.getByRole('button', { name: 'Ampliar zoom' })).toBeDisabled();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível abrir a mesa' })).toContainText('Não foi possível abrir a mesa');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Início' }).click();
  await expect(page).toHaveURL('/');
});
