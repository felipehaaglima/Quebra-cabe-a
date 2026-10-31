import { expect, test } from '@playwright/test';
import { DEMO, distributePieces, generatePieces } from '../../src/game/core/puzzle/puzzle';
import { canonicalCenter, canonicalConnections, connectionId, createPuzzleState } from '../../src/game/core/puzzle/groups';
import { centerCamera, worldToScreen } from '../../src/game/core/camera/camera';
import { defaultPreferences } from '../../src/game/core/preferences';
import { definitionKey, type LocalSave } from '../../src/game/persistence/snapshot';

test('conclusão com efeitos pode ser dispensada e não repete moedas ao restaurar', async ({ page, isMobile }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/play'); await expect(page.getByRole('button', { name: 'Bolsas', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Ferramentas', exact: true }).click();
  await expect(page.getByLabel('Salvamento', { exact: true })).toHaveText('Salvo neste navegador.');
  const pieces = generatePieces(DEMO), placements = distributePieces(pieces, DEMO.seed), last = placements.at(-1)!;
  const ids = pieces.map((piece) => piece.id).filter((id) => id !== last.pieceId);
  const connections = canonicalConnections(DEMO).filter(([a,b]) => ids.includes(a) && ids.includes(b)).map(([a,b]) => connectionId(a,b));
  // A real, valid resume fixture: one piece left, old connections already claimed.
  const save: LocalSave = { schemaVersion: 4, puzzleId: DEMO.id, definitionKey: definitionKey(DEMO), revision: 1, savedAt: new Date().toISOString(), camera: { center: { x: 0, y: 0 }, relativeZoom: 1, angleRad: 0 }, model: { bagReturns: [], state: { groups: [{ id: 'assembled', pieceIds: ids, translation: { x: 0, y: 0 }, quarterTurn: 0 }, createPuzzleState([last], DEMO).groups[0]], confirmedConnections: connections }, bags: [], order: pieces.map((p) => p.id), guideEnabled: false, completedAt: null, localCoinBalance: 0, preferences: defaultPreferences(), rewardLedger: connections.map((id) => ({ key: `connection:${id}`, amount: 0 })) } };
  await page.evaluate(async (record) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('quebra-cabeca-local'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(record); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  }, save);
  await page.reload(); await expect(page.getByRole('button', { name: 'Bolsas', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Ferramentas', exact: true }).click();
  await expect(page.getByLabel('Reduzir movimento', { exact: true })).not.toBeChecked();
  await page.getByLabel('Selecionar peça').selectOption(last.pieceId);
  for (let i = 0; i < (4 - last.quarterTurn) % 4; i++) await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
  await page.getByRole('button', { name: 'Ferramentas', exact: true }).click();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const canvas = page.locator('canvas'), box = (await canvas.boundingBox())!, viewport = { width: box.width, height: box.height }, camera = centerCamera(viewport);
  const point = (world: { x: number; y: number }) => { const p = worldToScreen(world, camera, viewport); return { x: p.x + box.x, y: p.y + box.y }; };
  const from = point(last.center), to = point(canonicalCenter(last.pieceId, DEMO));
  if (isMobile) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...from }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...to }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await session.detach();
  } else { await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 3 }); await page.mouse.up(); }
  await expect(page.getByLabel('Progresso do puzzle')).toContainText('Puzzle completo!');
  await expect(page.getByLabel('Moedas locais')).toHaveText('◉ 22');
  await expect(page.getByRole('complementary', { name: 'Conclusão', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('celebracao.png'), fullPage: true });
  await page.getByRole('button', { name: 'Alinhar no tapete' }).click();
  await page.getByRole('button', { name: 'Continuar olhando' }).click();
  const finished = await canvas.screenshot();
  expect((await canvas.screenshot()).equals(finished)).toBe(true);
  await page.getByRole('button', { name: 'Ferramentas', exact: true }).click();
  await expect(page.getByLabel('Salvamento', { exact: true })).toHaveText('Salvo neste navegador.');
  await page.reload(); await expect(page.getByRole('button', { name: 'Bolsas', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Moedas locais')).toHaveText('◉ 22');
  await expect(page.getByRole('button', { name: 'Continuar olhando' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
