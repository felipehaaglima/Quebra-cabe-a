import type { GamePreferences } from '../core/preferences';
export type FeedbackEvent = 'grab' | 'drag' | 'drop' | 'snap' | 'coin' | 'complete';
// Original procedural tones, synthesized locally. No recordings or network assets.
export class GameAudio {
  private context: AudioContext | null = null;
  private voices = new Set<OscillatorNode>();
  private last = 0;
  constructor(private preferences: GamePreferences) {}
  configure(preferences: GamePreferences) { this.preferences = preferences; if (preferences.muted || preferences.volume === 0) this.stop(); }
  unlock() {
    if (this.preferences.muted || this.preferences.volume === 0) return;
    try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}); } catch { /* Audio is optional. */ }
  }
  play(event: FeedbackEvent) {
    const context = this.context;
    if (!context || context.state !== 'running' || this.preferences.muted || !this.preferences.volume) return;
    if (event === 'drag' && context.currentTime - this.last < 0.15) return;
    this.last = context.currentTime;
    const notes: Record<FeedbackEvent, number[]> = { grab: [180], drag: [130], drop: [150], snap: [440, 660], coin: [880], complete: [440, 554, 660, 880] };
    for (const [index, frequency] of notes[event].entries()) {
      if (this.voices.size >= 12) break;
      const oscillator = context.createOscillator(), gain = context.createGain();
      const start = context.currentTime + index * 0.065, end = start + (event === 'complete' ? 0.28 : 0.09);
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(this.preferences.volume * 0.12, start + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain); gain.connect(context.destination); this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(end + 0.01);
    }
  }
  stop() { for (const voice of this.voices) { try { voice.stop(); } catch { /* already stopped */ } } this.voices.clear(); }
  destroy() { this.stop(); void this.context?.close().catch(() => {}); this.context = null; }
}
