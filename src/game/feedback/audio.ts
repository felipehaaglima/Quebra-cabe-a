import type { GamePreferences } from '../core/preferences';
export type FeedbackEvent = 'grab' | 'drag' | 'drop' | 'snap' | 'coin' | 'complete';
// Original procedural tones, synthesized locally. No recordings or network assets.
export class GameAudio {
  private context: AudioContext | null = null;
  private voices = new Set<OscillatorNode>();
  private last = 0;
  private pending: { event: FeedbackEvent; until: number } | null = null;
  private destroyed = false;
  private message = '';
  private report(message: string) { if (!this.destroyed && message !== this.message) { this.message = message; this.status(message); } }
  constructor(private preferences: GamePreferences, private status: (message: string) => void = () => {}) {}
  configure(preferences: GamePreferences) {
    this.preferences = preferences;
    if (preferences.muted || preferences.volume === 0) { this.stop(); this.report('Sons silenciados ou volume em zero.'); }
    else if (this.context?.state === 'running') this.report('Áudio ativado neste navegador.');
    else this.report('Toque em Testar som para ativar o áudio.');
  }
  unlock(): Promise<boolean> {
    if (this.destroyed || this.preferences.muted || this.preferences.volume === 0) return Promise.resolve(false);
    try {
      const AudioConstructor = globalThis.AudioContext ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioConstructor) { this.report('Áudio indisponível neste navegador.'); return Promise.resolve(false); }
      this.context ??= new AudioConstructor();
      const context = this.context;
      if (context.state === 'running') { this.report('Áudio ativado neste navegador.'); return Promise.resolve(true); }
      // Retry resume on each gesture: an earlier autoplay-blocked promise may stay pending.
      return context.resume().then(() => {
        if (this.destroyed || this.preferences.muted || !this.preferences.volume) return false;
        const ready = context.state === 'running';
        this.report(ready ? 'Áudio ativado neste navegador.' : 'O navegador ainda bloqueia o áudio. Toque em Testar som.');
        const pending = this.pending; this.pending = null;
        if (ready && pending && performance.now() <= pending.until) this.play(pending.event);
        return ready;
      }).catch(() => { this.pending = null; this.report('O navegador bloqueou o áudio. Toque em Testar som para tentar novamente.'); return false; });
    } catch { this.report('Não foi possível ativar o áudio neste navegador.'); return Promise.resolve(false); }
  }
  async preview() { if (await this.unlock()) this.play('snap'); }
  play(event: FeedbackEvent) {
    const context = this.context;
    if (this.destroyed || !context || this.preferences.muted || !this.preferences.volume) return;
    if (context.state !== 'running') { this.pending = { event, until: performance.now() + 350 }; return; }
    if (event === 'drag' && context.currentTime - this.last < 0.15) return;
    this.last = context.currentTime;
    const notes: Record<FeedbackEvent, number[]> = { grab: [420], drag: [300], drop: [360], snap: [520, 780], coin: [1040], complete: [520, 654, 780, 1040] };
    for (const [index, frequency] of notes[event].entries()) {
      if (this.voices.size >= 12) break;
      const oscillator = context.createOscillator(), gain = context.createGain();
      const start = context.currentTime + index * 0.065, end = start + (event === 'complete' ? 0.28 : 0.16);
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(this.preferences.volume * 0.28, start + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain); gain.connect(context.destination); this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(end + 0.01);
    }
  }
  stop() { this.pending = null; for (const voice of this.voices) { try { voice.stop(); } catch { /* already stopped */ } } this.voices.clear(); }
  destroy() { this.destroyed = true; this.stop(); void this.context?.close().catch(() => {}); this.context = null; }
}
