import { expect, test, type Page } from '@playwright/test';
import { DEMO, DEMO48, generatePieces, distributePieces } from '../../src/game/core/puzzle/puzzle';
import { canonicalCenter } from '../../src/game/core/puzzle/groups';
import { centerCamera, worldToScreen, type Vec2 } from '../../src/game/core/camera/camera';

async function drag(page: Page, from: Vec2, to: Vec2, touch: boolean, cancel = false) {
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...from }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...to }] });
    await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 4 });
    if (cancel) await page.locator('canvas').dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
  }
}

for (const definition of [DEMO, DEMO48]) test(`guia opcional com ${definition.rows * definition.columns} peças, câmera girada e grupos livres`, async ({ page, isMobile }, testInfo) => {
  test.setTimeout(60000);
  const count = definition.rows * definition.columns;
  const initial = distributePieces(generatePieces(definition), definition.seed);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(count === 48 ? '/play?pieces=48' : '/play');
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeEnabled();
  const canvas = page.locator('canvas');
  const toggle = page.getByRole('button', { name: 'Guia no tapete' });
  const hint = page.getByLabel('Ajuda do tapete');
  const progress = page.getByLabel('Progresso do puzzle');
  const selection = page.getByLabel('Selecionar peça');
  const box = (await canvas.boundingBox())!;
  const viewport = { width: box.width, height: box.height };
  const camera = centerCamera(viewport);
  const point = (world: Vec2) => { const p = worldToScreen(world, camera, viewport); return { x: p.x + box.x, y: p.y + box.y }; };
  const first = canonicalCenter('0:0', definition);
  const second = canonicalCenter('0:1', definition);
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await selection.selectOption('0:0');
  for (let i = 0; i < (5 - initial[0].quarterTurn) % 4; i++) await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
  await expect(page.getByLabel('Orientação da peça')).toHaveText('90°');
  await drag(page, point(initial[0].center), point({ x: first.x + 5, y: first.y + 3 }), isMobile);
  await expect(hint).toContainText('Gire a seleção para 0°');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
  await expect(hint).toContainText('Perto do lugar certo');
  await page.screenshot({ path: testInfo.outputPath('guia-perto.png'), fullPage: true });
  await page.getByRole('button', { name: 'Encaixar', exact: true }).click();
  await expect(hint).toContainText('Seleção alinhada');
  await selection.focus();
  const aligned = await canvas.screenshot();
  await toggle.click(); await toggle.click(); await selection.focus();
  expect(await canvas.screenshot()).toEqual(aligned);

  const turns = isMobile ? 1 : 3;
  for (let i = 0; i < turns; i++) await page.getByRole('button', { name: 'Girar 90°', exact: true }).click();
  await page.getByRole('button', { name: 'Diminuir zoom' }).click();
  await page.getByRole('button', { name: 'Diminuir zoom' }).click();
  camera.angleRad = turns * Math.PI / 2; camera.zoom *= 0.64;
  const far = { x: first.x + 100, y: first.y + 100 };
  await drag(page, point(first), point(far), isMobile);
  await expect(hint).toContainText('Siga os contornos');
  const beforeCancel = await canvas.screenshot();
  await drag(page, point(far), point({ x: first.x + 4, y: first.y + 4 }), isMobile, true);
  await expect(hint).toContainText('Siga os contornos');
  expect(await canvas.screenshot()).toEqual(beforeCancel);
  await drag(page, point(far), point(first), isMobile);
  await expect(hint).toContainText('Seleção alinhada');
  await selection.selectOption('0:1');
  for (let i = 0; i < (4 - initial[1].quarterTurn) % 4; i++) await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
  await drag(page, point(initial[1].center), point({ x: second.x + 4, y: second.y + 3 }), isMobile);
  const expected = definition.rows * (definition.columns - 1) + definition.columns * (definition.rows - 1);
  await expect(progress).toHaveText(`1 de ${expected} encaixes · ${count - 1} grupos`);
  await expect(page.getByRole('button', { name: 'Girar grupo' })).toBeEnabled();
  await drag(page, point(second), point({ x: second.x + 100, y: second.y + 100 }), isMobile);
  await expect(hint).toContainText('Siga os contornos');
  await drag(page, point({ x: second.x + 100, y: second.y + 100 }), point({ x: second.x + 6, y: second.y + 6 }), isMobile);
  await expect(hint).toContainText('Seleção alinhada');
  await expect(progress).toHaveText(`1 de ${expected} encaixes · ${count - 1} grupos`);
  await page.getByRole('button', { name: 'Centralizar' }).click();
  await page.screenshot({ path: testInfo.outputPath('guia-grupo.png'), fullPage: true });
  await expect(canvas).toHaveAttribute('data-piece-count', String(count));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeEnabled();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(progress).toHaveText(`1 de ${expected} encaixes · ${count - 1} grupos`);
  expect(errors).toEqual([]);
});
