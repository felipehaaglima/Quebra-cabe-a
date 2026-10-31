import { expect, test } from '@playwright/test';
import { ready } from './helpers';

test('mesa domina a tela, ações são contextuais e preferências persistem', async ({ page }, testInfo) => {
  await page.goto('/play'); await expect(page.getByRole('button', { name: 'Bolsas', exact: true })).toBeEnabled();
  const canvas = page.locator('canvas'), tools = page.getByRole('button', { name: 'Ferramentas', exact: true });
  const box = (await canvas.boundingBox())!;
  expect(box.height / page.viewportSize()!.height).toBeGreaterThan(0.7);
  await expect(page.getByRole('button', { name: 'Centralizar' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Girar peça', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('mesa-foco.png'), fullPage: true });
  await tools.click(); await page.getByLabel('Selecionar peça').selectOption('0:0');
  await expect(page.getByRole('button', { name: 'Girar peça', exact: true })).toBeVisible();
  await page.getByLabel('Silenciar sons', { exact: true }).check();
  await page.getByLabel('Volume dos efeitos').fill('0.2');
  await page.getByLabel('Reduzir movimento', { exact: true }).check();
  await page.getByLabel('Qualidade da mesa').selectOption('low');
  await expect(page.getByLabel('Salvamento', { exact: true })).toHaveText('Salvo neste navegador.');
  await page.screenshot({ path: testInfo.outputPath('preferencias.png'), fullPage: true });
  await page.reload(); await ready(page);
  await expect(page.getByLabel('Silenciar sons', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Volume dos efeitos')).toHaveValue('0.2');
  await expect(page.getByLabel('Qualidade da mesa')).toHaveValue('low');
  await tools.click(); await expect(canvas).toHaveAttribute('data-visible-pieces', '24');
  await page.getByRole('button', { name: 'Guia no tapete' }).click();
  await page.getByRole('button', { name: 'Bolsas', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar bolsas' }).click();
  await expect(page.getByRole('button', { name: 'Guia no tapete' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('novo puzzle tem cancelamento e mantém saldo e preferências', async ({ page }) => {
  await page.goto('/play'); await ready(page);
  await page.getByLabel('Selecionar peça').selectOption('0:0');
  await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
  const orientation = await page.getByLabel('Orientação da peça').textContent();
  await page.getByRole('button', { name: 'Novo puzzle', exact: true }).click();
  await page.getByRole('button', { name: 'Manter montagem' }).click();
  await expect(page.getByLabel('Orientação da peça')).toHaveText(orientation!);
  await page.getByRole('button', { name: 'Novo puzzle', exact: true }).click();
  await page.getByRole('button', { name: 'Recomeçar montagem' }).click();
  await expect(page.getByLabel('Progresso do puzzle')).toHaveText('0 de 38 encaixes · 24 grupos');
  await expect(page.getByLabel('Moedas locais')).toHaveText('◉ 0');
  await expect(page.getByLabel('Reduzir movimento', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Salvamento', { exact: true })).toHaveText('Salvo neste navegador.');
  await page.reload(); await ready(page); await expect(page.getByLabel('Moedas locais')).toHaveText('◉ 0');
});

test.describe('Telas com DPR alto', () => {
  test.use({ deviceScaleFactor: 3 });
  test('qualidade econômica limita resolução sem mudar peças ou inventário', async ({ page }) => {
    await page.goto('/play'); await expect(page.getByRole('button', { name: 'Bolsas', exact: true })).toBeEnabled();
    const canvas = page.locator('canvas');
    const resolution = () => canvas.evaluate((node) => (node as HTMLCanvasElement).width / node.clientWidth);
    await expect.poll(resolution).toBe(2);
    await page.getByRole('button', { name: 'Ferramentas', exact: true }).click();
    await page.getByLabel('Qualidade da mesa').selectOption('low');
    await expect.poll(resolution).toBe(1);
    await expect(canvas).toHaveAttribute('data-visible-pieces', '24');
    await expect(page.getByLabel('Salvamento', { exact: true })).toHaveText('Salvo neste navegador.');
    await page.reload(); await expect(page.getByRole('button', { name: 'Bolsas', exact: true })).toBeEnabled();
    await expect.poll(resolution).toBe(1);
    await page.getByRole('button', { name: 'Ferramentas', exact: true }).click();
    await expect(page.getByLabel('Qualidade da mesa')).toHaveValue('low');
    await page.getByLabel('Qualidade da mesa').selectOption('auto');
    await expect.poll(resolution).toBe(2);
    await expect(page.getByLabel('Progresso do puzzle')).toHaveText('0 de 38 encaixes · 24 grupos');
  });
});
