/**
 * Plays a two-tone "pimpón" notification using the Web Audio API.
 * No external audio files required.
 */
export function playTicketCallSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const beep = (freq: number, start: number, duration: number): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.1);
    };

    beep(880, 0, 0.15);
    beep(1100, 0.18, 0.2);
  } catch {
    // Audio API not available or blocked — silently ignore.
  }
}
