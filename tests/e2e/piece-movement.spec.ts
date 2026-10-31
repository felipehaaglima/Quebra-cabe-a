import { ready } from './helpers';
import { expect, test, type Page, type CDPSession } from '@playwright/test';
import { DEMO, distributePieces, generatePieces } from '../../src/game/core/puzzle/puzzle';
import { centerCamera, worldToScreen, type Vec2 } from '../../src/game/core/camera/camera';

const first = distributePieces(generatePieces(DEMO), DEMO.seed)[0];

async function drag(page: Page, from: Vec2, to: Vec2, touch: boolean) {
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...from }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...to }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 6 }); await page.mouse.up();
  }
}

async function scene(page: Page) {
  await page.goto('/play');
  await ready(page);
  await page.getByRole('button', { name: 'Guia no tapete' }).click();
  const canvas = page.locator('canvas');
  const box = (await canvas.boundingBox())!;
  const viewport = { width: box.width, height: box.height };
  const point = (position: Vec2, angleRad = 0): Vec2 => {
    const local = worldToScreen(position, { ...centerCamera(viewport), angleRad }, viewport);
    return { x: box.x + local.x, y: box.y + local.y };
  };
  return { canvas, point };
}

test('move e gira uma peça com câmera em quatro orientações, por mouse/toque', async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const { canvas, point } = await scene(page);
  const selection = page.getByLabel('Selecionar peça');
  let position = first.center;
  let turn = first.quarterTurn;
  for (let cameraTurn = 0; cameraTurn < 4; cameraTurn++) {
    const target = { x: cameraTurn * 100, y: cameraTurn * 50 };
    await drag(page, point(position, cameraTurn * Math.PI / 2), point(target, cameraTurn * Math.PI / 2), isMobile);
    await expect(selection).toHaveValue(first.pieceId);
    await expect(page.getByLabel('Visão da mesa')).toHaveText(`100% · ${cameraTurn * 90}°`);
    await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
    turn = (turn + 1) % 4 as typeof turn;
    await expect(page.getByLabel('Orientação da peça')).toHaveText(`${turn * 90}°`);
    position = target;
    // A fresh tap at the new world position must hit the moved shape.
    await canvas.click({ position: { x: point(position, cameraTurn * Math.PI / 2).x - (await canvas.boundingBox())!.x, y: point(position, cameraTurn * Math.PI / 2).y - (await canvas.boundingBox())!.y } });
    await expect(selection).toHaveValue(first.pieceId);
    if (cameraTurn < 3) await page.getByRole('button', { name: 'Girar 90°', exact: true }).click();
  }
  const before = await canvas.screenshot();
  await canvas.focus(); await page.keyboard.press('ArrowRight');
  expect(await canvas.screenshot()).not.toEqual(before);
  await page.keyboard.press('r');
  turn = (turn + 1) % 4 as typeof turn;
  await expect(page.getByLabel('Orientação da peça')).toHaveText(`${turn * 90}°`);
  await page.screenshot({ path: testInfo.outputPath('movimento.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(selection).toHaveValue('');
  await selection.selectOption(first.pieceId);
  await expect(page.getByRole('button', { name: 'Girar peça', exact: true })).toBeEnabled();
  await expect(canvas).toHaveAttribute('data-piece-count', '24');
  await page.reload();
  await ready(page);
  await expect(selection).toHaveValue('');
  const restored = { x: position.x, y: position.y + 20 / centerCamera({ width: (await canvas.boundingBox())!.width, height: (await canvas.boundingBox())!.height }).zoom };
  await drag(page, point(restored, 3 * Math.PI / 2), point({ x: 0, y: 0 }, 3 * Math.PI / 2), isMobile);
  await expect(selection).toHaveValue(first.pieceId);
  expect(errors).toEqual([]);
});

test('cancelamento desfaz o drag; segundo dedo devolve o controle à câmera', async ({ page, isMobile }, testInfo) => {
  const { canvas, point } = await scene(page);
  const center = point({ x: 0, y: 0 });
  await drag(page, point(first.center), center, isMobile);
  const original = await canvas.screenshot({ path: testInfo.outputPath('original.png') });
  let session: CDPSession | undefined;
  if (isMobile) {
    session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...center }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: center.x + 30, y: center.y }] });
  } else {
    await page.mouse.move(center.x, center.y); await page.mouse.down();
    await page.mouse.move(center.x + 30, center.y, { steps: 4 });
  }
  expect(await canvas.screenshot()).not.toEqual(original);
  if (session) await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  else { await canvas.dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up(); }
  expect(await canvas.screenshot()).toEqual(original);
  if (session) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...center }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: center.x + 20, y: center.y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: center.x + 20, y: center.y }, { id: 2, x: center.x + 90, y: center.y + 70 }] });
    expect(await canvas.screenshot()).toEqual(original);
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: center.x - 10, y: center.y }, { id: 2, x: center.x + 110, y: center.y + 80 }] });
    await expect(page.getByLabel('Visão da mesa')).not.toHaveText('100% · 0°');
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await session.detach();
    await canvas.focus(); await page.keyboard.press('Home');
    await expect(page.getByLabel('Visão da mesa')).toHaveText('100% · 0°');
    // Compare the scene with the same focus; keyboard focus adds an outline.
    await page.getByLabel('Selecionar peça').focus();
    expect((await canvas.screenshot({ path: testInfo.outputPath('after-home.png') })).equals(original)).toBe(true);
  }
});
