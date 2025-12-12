// Lightweight web audio shim to play alternating beep tones
// Used for alerting when the tank is full (100%)
export type BeepOptions = {
  count?: number; // number of beeps
  durationMs?: number; // length of each beep
  gapMs?: number; // gap between beeps
  freqs?: number[]; // alternating frequencies
};

export const playAlternatingBeeps = async (opts: BeepOptions = {}) => {
  const count = opts.count ?? 6;
  const durationMs = opts.durationMs ?? 180;
  const gapMs = opts.gapMs ?? 120;
  const freqs = opts.freqs ?? [880, 1320];

  const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) {
    // AudioContext unavailable (older browsers); no-op
    return;
  }
  const ctx = new AC();

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  try {
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const freq = freqs[i % freqs.length];
      try { osc.frequency.setValueAtTime(freq, ctx.currentTime); } catch { osc.frequency.value = freq; }

      // Gentle attack to avoid clicks
      try {
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      } catch {
        gain.gain.value = 0.2;
      }

      osc.connect(gain).connect(ctx.destination);
      try { osc.start(); } catch {}
      await sleep(durationMs);
      try { osc.stop(); } catch {}
      await sleep(gapMs);
    }
  } finally {
    try { await ctx.close(); } catch {}
  }
};

export default { playAlternatingBeeps };
