export type GamePreferences = { muted: boolean; volume: number; reducedMotion: boolean; quality: 'auto' | 'low' };
export const defaultPreferences = (): GamePreferences => ({ muted: false, volume: 0.35, reducedMotion: false, quality: 'auto' });
