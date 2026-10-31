import { expect, test } from '@playwright/test';

test('teste de som produz sinal no caminho de saída e mute impede novos efeitos', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    const probe = { peak: 0, starts: 0 }; Object.assign(window, { soundProbe: probe });
    const connect = AudioNode.prototype.connect, start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) { probe.starts++; return Reflect.apply(start, this, args); };
    AudioNode.prototype.connect = function (this: AudioNode, ...args: unknown[]) {
      if (this instanceof GainNode && args[0] instanceof AudioDestinationNode) {
        const analyser = this.context.createAnalyser(); analyser.fftSize = 256;
        Reflect.apply(connect, this, [analyser]); Reflect.apply(connect, analyser, args);
        const data = new Float32Array(analyser.fftSize), until = performance.now() + 650;
        const sample = () => { analyser.getFloatTimeDomainData(data); for (const value of data) probe.peak = Math.max(probe.peak, Math.abs(value)); if (performance.now() < until) requestAnimationFrame(sample); };
        requestAnimationFrame(sample); return args[0];
      }
      return Reflect.apply(connect, this, args);
    } as typeof connect;
  });
  await page.goto('/play'); await expect(page.getByRole('button', { name: 'Bolsas', exact: true })).toBeEnabled();
  const tools = page.getByRole('button', { name: 'Ferramentas', exact: true });
  if (isMobile) await tools.tap(); else await tools.click();
  const play = page.getByRole('button', { name: 'Testar som', exact: true });
  if (isMobile) await play.tap(); else await play.click();
  await expect(page.getByLabel('Estado do áudio')).toContainText('Áudio ativado');
  const probe = () => page.evaluate(() => (window as typeof window & { soundProbe: { peak: number; starts: number } }).soundProbe);
  await expect.poll(async () => (await probe()).peak).toBeGreaterThan(0.002);
  const before = (await probe()).starts;
  await page.getByLabel('Silenciar sons', { exact: true }).check();
  await expect(page.getByRole('button', { name: 'Testar som', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Estado do áudio')).toContainText('silenciados');
  await page.getByLabel('Selecionar peça').selectOption('0:0'); await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
  expect((await probe()).starts).toBe(before);
  await page.getByLabel('Silenciar sons', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Testar som', exact: true }).click();
  await expect.poll(async () => (await probe()).starts).toBeGreaterThan(before);
});
for (const reason of ['bloqueado', 'indisponível']) test(`áudio ${reason} informa a situação sem impedir o jogo`, async ({ page }) => {
  await page.addInitScript((reason) => {
    if (reason === 'bloqueado') {
      const NativeAudio = AudioContext;
      Object.defineProperty(window, 'AudioContext', { value: class extends NativeAudio {
        constructor() { super(); Object.defineProperty(this, 'state', { get: () => 'suspended' }); }
        resume() { return Promise.reject(new DOMException('Blocked', 'NotAllowedError')); }
      } });
    }
    else { Object.defineProperty(window, 'AudioContext', { value: undefined }); Object.defineProperty(window, 'webkitAudioContext', { value: undefined }); }
  }, reason);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/play'); await expect(page.getByRole('button', { name: 'Bolsas', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Ferramentas', exact: true }).click();
  await page.getByRole('button', { name: 'Testar som', exact: true }).click();
  await expect(page.getByLabel('Estado do áudio')).toContainText(reason === 'bloqueado' ? 'bloqueou' : 'indisponível');
  await page.getByLabel('Selecionar peça').selectOption('0:0'); await page.getByRole('button', { name: 'Girar peça', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-visible-pieces', '24'); expect(errors).toEqual([]);
});
