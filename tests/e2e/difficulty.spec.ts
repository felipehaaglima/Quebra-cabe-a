import { expect, test } from '@playwright/test';

test('escolhe 48 peças e amplia a seleção, preservando cancelamento e resize', async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Número de peças').selectOption('48');
  await page.getByRole('link', { name: 'Iniciar', exact: true }).click();
  await expect(page).toHaveURL(/pieces=48/);
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeEnabled();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-piece-count', '48');
  await expect(page.getByLabel('Progresso do puzzle')).toHaveText('0 de 82 encaixes · 48 grupos');
  const initial = await canvas.screenshot();
  await page.screenshot({ path: testInfo.outputPath('48-pecas.png'), fullPage: true });
  await page.getByLabel('Selecionar peça').selectOption('0:0');
  await page.getByRole('button', { name: 'Ver seleção' }).click();
  await expect(page.getByLabel('Visão da mesa')).toHaveText('400% · 0°');
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  const before = await session.send('Performance.getMetrics');
  const start = Date.now();
  if (isMobile) await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
  else { await page.mouse.move(x, y); await page.mouse.down(); }
  for (let i = 1; i <= 32; i++) {
    const p = { x: x + Math.sin(i / 8) * 22, y: y + Math.cos(i / 8) * 22 };
    if (isMobile) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...p }] });
    else await page.mouse.move(p.x, p.y);
  }
  if (isMobile) await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  else { await canvas.dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up(); }
  const after = await session.send('Performance.getMetrics');
  const metric = (data: typeof after, name: string) => data.metrics.find((item) => item.name === name)?.value ?? 0;
  await testInfo.attach('interaction-metrics', { body: JSON.stringify({ steps: 32, wallMilliseconds: Date.now() - start, mainThreadTaskMilliseconds: (metric(after, 'TaskDuration') - metric(before, 'TaskDuration')) * 1000, jsHeapMiB: metric(after, 'JSHeapUsedSize') / 1048576 }, null, 2), contentType: 'application/json' });
  await session.detach();
  await expect(page.getByLabel('Progresso do puzzle')).toHaveText('0 de 82 encaixes · 48 grupos');
  await page.getByLabel('Selecionar peça').selectOption('');
  await page.getByRole('button', { name: 'Centralizar' }).click();
  expect(await canvas.screenshot()).toEqual(initial);
  await page.setViewportSize(isMobile ? { width: 844, height: 390 } : { width: 1000, height: 700 });
  await expect(canvas).toHaveAttribute('data-piece-count', '48');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeEnabled();
  await expect(canvas).toHaveAttribute('data-piece-count', '48');
  expect(errors).toEqual([]);
});

test('parâmetro inválido preserva o padrão de 24 peças', async ({ page }) => {
  await page.goto('/play?pieces=100000');
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeEnabled();
  await expect(page.locator('canvas')).toHaveAttribute('data-piece-count', '24');
});
