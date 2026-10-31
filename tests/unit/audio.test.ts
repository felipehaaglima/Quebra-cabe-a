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
