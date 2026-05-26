import { getSoundsEnabled } from '../lib/soundsSettings';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Som curto de confirmação ao registar uma viagem (Web Audio API, sem ficheiros externos). */
export async function playTripRegisteredChime(): Promise<void> {
  if (!getSoundsEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
  osc.connect(master);
  osc.start(now);
  osc.stop(now + 0.3);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(440, now + 0.04);
  osc2.frequency.exponentialRampToValueAtTime(520, now + 0.16);
  osc2.connect(master);
  osc2.start(now + 0.04);
  osc2.stop(now + 0.28);
}
