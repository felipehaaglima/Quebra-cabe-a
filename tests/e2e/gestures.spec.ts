import { expect, test } from '@playwright/test';

test('pinça e giro com dois dedos ou zoom com roda do mouse', async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/play');
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeEnabled();
  const canvas = page.locator('canvas');
  const view = page.getByLabel('Visão da mesa');
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const initial = await canvas.screenshot();
  if (isMobile) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: x - 50, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: x - 50, y }, { id: 2, x: x + 50, y }] });
    await expect(view).toHaveText('100% · 0°');
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x - 80, y }, { id: 2, x: x + 80, y }] });
    await expect(view).toHaveText('160% · 0°');
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x, y: y - 80 }, { id: 2, x, y: y + 80 }] });
    await expect(view).toHaveText('160% · 90°');
    expect(await canvas.screenshot()).not.toEqual(initial);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ id: 2, x, y: y + 80 }] });
    await expect(view).toHaveText('160% · 90°');
    const rotated = await canvas.screenshot();
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + 20, y: y - 80 }] });
    expect(await canvas.screenshot()).not.toEqual(rotated);
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await session.detach();
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(view).toHaveText('160% · 90°');
    await page.setViewportSize({ width: 390, height: 844 });
  } else {
    await page.mouse.move(x + 60, y - 30);
    await page.mouse.wheel(0, -200);
    await expect(view).not.toHaveText('100% · 0°');
    expect(await canvas.screenshot()).not.toEqual(initial);
    await page.mouse.wheel(0, 200);
    await expect(view).toHaveText('100% · 0°');
  }
  await page.getByRole('button', { name: 'Centralizar' }).click();
  await expect(view).toHaveText('100% · 0°');
  expect(await canvas.screenshot()).toEqual(initial);
  await page.screenshot({ path: testInfo.outputPath('gestos.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
