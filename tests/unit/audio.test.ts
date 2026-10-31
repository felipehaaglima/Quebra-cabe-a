import { afterEach, expect, it, vi } from 'vitest';
import { GameAudio } from '../../src/game/feedback/audio';
import { defaultPreferences } from '../../src/game/core/preferences';
afterEach(() => vi.unstubAllGlobals());
it('áudio só inicia após gesto, respeita mute/volume, limita vozes e encerra ao sair', () => {
  const stop = vi.fn(), start = vi.fn(), close = vi.fn().mockResolvedValue(undefined), constructed = vi.fn();
  class Context {
    state = 'running'; currentTime = 1; destination = {};
    constructor() { constructed(); }
    resume = vi.fn().mockResolvedValue(undefined); close = close;
    createOscillator = () => ({ frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start, stop, onended: null });
    createGain = () => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() });
  }
  vi.stubGlobal('AudioContext', Context);
  const audio = new GameAudio(defaultPreferences()); audio.play('snap'); expect(constructed).not.toHaveBeenCalled();
  audio.configure({ ...defaultPreferences(), muted: true }); audio.unlock(); expect(constructed).not.toHaveBeenCalled();
  audio.configure(defaultPreferences()); audio.unlock(); audio.play('snap'); expect(start).toHaveBeenCalledTimes(2);
  audio.configure({ ...defaultPreferences(), muted: true }); expect(stop).toHaveBeenCalled();
  audio.play('complete'); expect(start).toHaveBeenCalledTimes(2);
  audio.configure({ ...defaultPreferences(), volume: 0 }); audio.play('coin'); expect(start).toHaveBeenCalledTimes(2);
  audio.configure(defaultPreferences()); for (let i = 0; i < 20; i++) audio.play('complete'); expect(start.mock.calls.length).toBeLessThanOrEqual(14);
  audio.destroy(); expect(close).toHaveBeenCalledOnce();
});
it('continua jogável quando Web Audio não está disponível', () => {
  vi.stubGlobal('AudioContext', undefined); const audio = new GameAudio(defaultPreferences());
  expect(() => { audio.unlock(); audio.play('complete'); audio.destroy(); }).not.toThrow();
});
it('não descarta o primeiro efeito enquanto resume aguarda ativação', async () => {
  const start = vi.fn(); let finish!: () => void;
  class Context {
    state = 'suspended'; currentTime = 1; destination = {};
    resume = () => new Promise<void>((resolve) => { finish = () => { this.state = 'running'; resolve(); }; });
    close = vi.fn().mockResolvedValue(undefined);
    createOscillator = () => ({ frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start, stop: vi.fn(), onended: null });
    createGain = () => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() });
  }
  vi.stubGlobal('AudioContext', Context); const audio = new GameAudio(defaultPreferences());
  const activation = audio.unlock(); audio.play('grab'); expect(start).not.toHaveBeenCalled();
  finish(); await activation; expect(start).toHaveBeenCalledOnce(); audio.destroy();
});
it('tenta novo gesto mesmo se um resume anterior estiver pendente e respeita mute durante a ativação', async () => {
  const start = vi.fn(); let finish!: () => void; let calls = 0;
  class Context {
    state = 'suspended'; currentTime = 1; destination = {};
    resume = () => { calls++; if (calls === 1) return new Promise<void>(() => {}); return new Promise<void>((resolve) => { finish = () => { this.state = 'running'; resolve(); }; }); };
    close = vi.fn().mockResolvedValue(undefined);
    createOscillator = () => ({ frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start, stop: vi.fn(), onended: null });
    createGain = () => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() });
  }
  vi.stubGlobal('AudioContext', Context); const audio = new GameAudio(defaultPreferences());
  void audio.unlock(); audio.play('grab'); const retry = audio.unlock(); expect(calls).toBe(2);
  audio.configure({ ...defaultPreferences(), muted: true }); finish(); await retry;
  expect(start).not.toHaveBeenCalled(); audio.destroy();
});
it('informa bloqueio de áudio e permite repetir o teste sem quebrar o jogo', async () => {
  const status = vi.fn();
  class Context { state = 'suspended'; resume = vi.fn().mockRejectedValue(new Error('NotAllowed')); close = vi.fn().mockResolvedValue(undefined); }
  vi.stubGlobal('AudioContext', Context); const audio = new GameAudio(defaultPreferences(),status);
  await expect(audio.preview()).resolves.toBeUndefined(); expect(status).toHaveBeenLastCalledWith(expect.stringContaining('bloqueou'));
  audio.destroy();
});
