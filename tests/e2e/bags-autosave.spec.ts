import { ready } from './helpers';
import { expect, test, type Page } from '@playwright/test';
import { DEMO, DEMO48, generatePieces, distributePieces } from '../../src/game/core/puzzle/puzzle';
import { canonicalCenter } from '../../src/game/core/puzzle/groups';
import { centerCamera, worldToScreen, type Vec2 } from '../../src/game/core/camera/camera';

async function saved(page: Page) { await expect(page.getByLabel('Salvamento')).toHaveText(/Salvo neste navegador|Progresso restaurado/); }
async function drag(page: Page, start: Vec2, end: Vec2, mobile: boolean) {
  if (mobile) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...start }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...end }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await session.detach();
  } else { await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 4 }); await page.mouse.up(); }
}
for (const definition of [DEMO, DEMO48]) test(`bolsas e restauração de ${definition.rows * definition.columns} peças`, async ({ page, isMobile }, testInfo) => {
  const count = definition.rows * definition.columns;
  await page.goto(count === 48 ? '/play?pieces=48' : '/play');
  await ready(page); await saved(page);
  const canvas = page.locator('canvas'); const box = (await canvas.boundingBox())!;
  const camera = centerCamera({ width: box.width, height: box.height });
  const point = (p: Vec2) => { const v = worldToScreen(p, camera, { width: box.width, height: box.height }); return { x: v.x + box.x, y: v.y + box.y }; };
  const initial = distributePieces(generatePieces(definition), definition.seed);
  await drag(page, point(initial[0].center), point({ x: -560, y: 270 }), isMobile);
  await expect(canvas).toHaveAttribute('data-visible-pieces', String(count - 1));
  await page.getByRole('button', { name: 'Bolsas', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Bolsas' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Bordas (1)', exact: true })).toBeVisible();
  await panel.getByLabel('Etiqueta').fill('Azuis');
  await panel.getByRole('button', { name: 'Renomear bolsa' }).click();
  await panel.getByRole('button', { name: 'Mover bolsa à direita' }).click();
  await panel.getByLabel('Nova bolsa').fill('Verdes'); await panel.getByRole('button', { name: 'Criar bolsa' }).click();
  await expect(panel.getByRole('button', { name: 'Verdes (0)' })).toBeVisible();
  await panel.getByRole('button', { name: 'Azuis (1)' }).click();
  await page.screenshot({ path: testInfo.outputPath('bolsas.png'), fullPage: true });
  await panel.getByRole('button', { name: 'Fechar bolsas' }).click(); await saved(page);
  await page.reload(); await ready(page);
  await expect(canvas).toHaveAttribute('data-piece-count', String(count));
  await expect(canvas).toHaveAttribute('data-visible-pieces', String(count - 1));
  await page.getByRole('button', { name: 'Bolsas', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Azuis (1)' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Verdes (0)' })).toBeVisible();
  await panel.getByRole('button', { name: 'Retirar Peça 1', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-visible-pieces', String(count));
  await panel.getByRole('button', { name: 'Fechar bolsas' }).click(); await saved(page);
  await page.getByRole('button', { name: 'Guia no tapete' }).click();
  await page.getByRole('button', { name: 'Ampliar zoom' }).click(); await page.getByRole('button', { name: 'Girar 90°', exact: true }).click();
  await expect(page.getByLabel('Visão da mesa')).toHaveText('125% · 90°'); await saved(page);
  await page.reload(); await ready(page);
  await expect(page.getByRole('button', { name: 'Guia no tapete' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Visão da mesa')).toHaveText('125% · 90°');
  await expect(canvas).toHaveAttribute('data-visible-pieces', String(count));
});

test('soltura final sem último movimento ajusta no tapete e persiste', async ({ page, isMobile }) => {
  await page.goto('/play'); await ready(page);
  await page.getByRole('button', { name: 'Guia no tapete' }).click();
  await page.getByLabel('Selecionar peça').selectOption('0:0');
  const initial = distributePieces(generatePieces(DEMO), DEMO.seed)[0];
  for (let i = 0; i < (4 - initial.quarterTurn) % 4; i++) await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
  const canvas = page.locator('canvas'); const box = (await canvas.boundingBox())!;
  const viewport = { width: box.width, height: box.height }, camera = centerCamera(viewport);
  const point = (p: Vec2) => { const v = worldToScreen(p, camera, viewport); return { x: v.x + box.x, y: v.y + box.y }; };
  const target = canonicalCenter('0:0', DEMO), start = point(initial.center), far = point({ x: target.x + 100, y: target.y }), end = point({ x: target.x + 4, y: target.y + 3 });
  if (isMobile) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...start }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...far }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ id: 1, ...end }] }); await session.detach();
  } else {
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(far.x, far.y);
    await canvas.dispatchEvent('pointerup', { pointerId: 1, clientX: end.x, clientY: end.y, button: 0 }); await page.mouse.up();
  }
  await expect(page.getByLabel('Ajuda do tapete')).toContainText('Seleção alinhada'); await saved(page);
  await page.reload(); await ready(page);
  await page.getByLabel('Selecionar peça').selectOption('0:0');
  await expect(page.getByLabel('Ajuda do tapete')).toContainText('Seleção alinhada');
});

test('preserva save incompatível e oferece backup sem sobrescrever', async ({ page }) => {
  await page.goto('/play'); await ready(page); await saved(page);
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('quebra-cabeca-local');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('saves', 'readwrite'), store = transaction.objectStore('saves');
      const request = store.getAll(); request.onsuccess = () => { for (const record of request.result) store.put({ ...record, schemaVersion: 99 }); };
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
    }); database.close();
  });
  await page.reload(); await ready(page);
  await expect(page.getByLabel('Salvamento')).toContainText('Dados existentes foram preservados');
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Baixar cópia' }).first().click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toContain('backup.json');
  await page.getByRole('button', { name: 'Guia no tapete' }).click();
  await expect(page.getByLabel('Salvamento')).toContainText('salvamento desativado');
  await page.reload(); await ready(page); await expect(page.getByLabel('Salvamento')).toContainText('Dados existentes foram preservados');
});
