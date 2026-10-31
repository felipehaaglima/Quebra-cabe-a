import { ready } from './helpers';
import { expect, test, type Page } from '@playwright/test';
import { DEMO, DEMO48, distributePieces, generatePieces } from '../../src/game/core/puzzle/puzzle';
import { canonicalCenter } from '../../src/game/core/puzzle/groups';
import { centerCamera, worldToScreen, type Vec2 } from '../../src/game/core/camera/camera';

const initial = distributePieces(generatePieces(DEMO), DEMO.seed);
async function setup(page: Page, count = 24) {
  await page.goto(count === 48 ? '/play?pieces=48' : '/play');
  await ready(page);
  await page.getByRole('button', { name: 'Guia no tapete' }).click();
  const canvas = page.locator('canvas');
  const box = (await canvas.boundingBox())!;
  const viewport = { width: box.width, height: box.height };
  const camera = centerCamera(viewport);
  return { canvas, camera, point: (world: Vec2) => { const p = worldToScreen(world, camera, viewport); return { x: p.x + box.x, y: p.y + box.y }; } };
}
async function orient(page: Page, index: number, placements = initial) {
  const pose = placements[index];
  await page.getByLabel('Selecionar peça').selectOption(pose.pieceId);
  for (let i = 0; i < (4 - pose.quarterTurn) % 4; i++) await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
  await expect(page.getByLabel('Orientação da peça')).toHaveText('0°');
}
async function drag(page: Page, start: Vec2, end: Vec2, mobile: boolean) {
  if (mobile) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...start }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...end }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 3 }); await page.mouse.up();
  }
}

test('encaixa com câmera girada e move/gira os dois membros como grupo', async ({ page, isMobile }, testInfo) => {
  const { canvas, camera, point } = await setup(page);
  await orient(page, 0);
  await drag(page, point(initial[0].center), point({ x: 0, y: 0 }), isMobile);
  const cameraTurn = isMobile ? 1 : 3;
  for (let i = 0; i < cameraTurn; i++) await page.getByRole('button', { name: 'Girar 90°', exact: true }).click();
  await page.getByRole('button', { name: 'Diminuir zoom' }).click();
  await page.getByRole('button', { name: 'Diminuir zoom' }).click();
  camera.angleRad = cameraTurn * Math.PI / 2; camera.zoom *= 0.64;
  await orient(page, 1);
  const width = DEMO.imageWidth / DEMO.columns;
  await drag(page, point(initial[1].center), point({ x: width + 4, y: 3 }), isMobile);
  await expect(page.getByLabel('Progresso do puzzle')).toHaveText('1 de 38 encaixes · 23 grupos');
  await expect(page.getByRole('button', { name: 'Girar grupo' })).toBeEnabled();
  await drag(page, point({ x: width, y: 0 }), point({ x: width + 100, y: 50 }), isMobile);
  const hit = point({ x: 100, y: 50 });
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: hit.x - box.x, y: hit.y - box.y } });
  await expect(page.getByLabel('Selecionar peça')).toHaveValue('0:0');
  await page.getByRole('button', { name: 'Girar grupo' }).click();
  const second = point({ x: 100, y: 50 + width });
  await canvas.click({ position: { x: second.x - box.x, y: second.y - box.y } });
  await expect(page.getByLabel('Selecionar peça')).toHaveValue('0:1');
  await expect(page.getByLabel('Orientação da peça')).toHaveText('90°');
  await expect(page.getByLabel('Progresso do puzzle')).toHaveText('1 de 38 encaixes · 23 grupos');
  await expect(canvas).toHaveAttribute('data-piece-count', '24');
  await page.screenshot({ path: testInfo.outputPath('grupo.png'), fullPage: true });
});

for (const definition of [DEMO, DEMO48]) test(`monta as ${definition.rows * definition.columns} peças pela interface e conclui sem duplicar conexões`, async ({ page, isMobile }, testInfo) => {
  test.setTimeout(180000);
  const count = definition.rows * definition.columns;
  const placements = distributePieces(generatePieces(definition), definition.seed);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const { canvas, point } = await setup(page, count);
  for (let index = 0; index < placements.length; index++) {
    await orient(page, index, placements);
    await drag(page, point(placements[index].center), point(canonicalCenter(placements[index].pieceId, definition)), isMobile);
    if (index > 0) await expect(page.getByRole('button', { name: 'Girar grupo' })).toBeEnabled();
  }
  await expect(page.getByLabel('Progresso do puzzle')).toHaveText('Puzzle completo! Você pode alinhar a obra ao tapete.');
  const earned = count === 24 ? 58 : 112;
  await expect(page.getByLabel('Moedas locais')).toHaveText(`◉ ${earned}`);
  await expect(page.getByRole('button', { name: 'Continuar olhando' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar olhando' }).click();
  await expect(page.getByRole('button', { name: 'Alinhar obra' })).toBeEnabled();
  await page.getByRole('button', { name: 'Alinhar obra' }).click();
  const complete = await canvas.screenshot();
  await page.getByRole('button', { name: 'Girar grupo' }).click();
  expect(await canvas.screenshot()).not.toEqual(complete);
  await page.getByRole('button', { name: 'Alinhar obra' }).click();
  expect(await canvas.screenshot()).toEqual(complete);
  await page.getByRole('button', { name: 'Encaixar', exact: true }).click();
  await expect(page.getByLabel('Progresso do puzzle')).toContainText('Puzzle completo!');
  await page.getByLabel('Selecionar peça').selectOption('');
  await page.screenshot({ path: testInfo.outputPath('completo.png'), fullPage: true });
  await expect(canvas).toHaveAttribute('data-piece-count', String(count));
  expect(errors).toEqual([]);
  await page.reload();
  await ready(page);
  await expect(page.getByLabel('Moedas locais')).toHaveText(`◉ ${earned}`);
  await expect(page.getByRole('button', { name: 'Continuar olhando' })).toHaveCount(0);
  await expect(page.getByLabel('Progresso do puzzle')).toContainText('Puzzle completo!');
});
