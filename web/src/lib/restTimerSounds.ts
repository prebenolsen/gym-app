type ToneKind = 'countdown' | 'complete' | 'prepare';

const toneConfig: Record<ToneKind, { frequency: number; durationMs: number; gain: number }> = {
  countdown: { frequency: 720, durationMs: 110, gain: 0.05 },
  complete: { frequency: 980, durationMs: 150, gain: 0.06 },
  prepare: { frequency: 560, durationMs: 130, gain: 0.05 },
};

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const ContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!ContextCtor) return null;

  if (!audioContext) {
    audioContext = new ContextCtor();
  }

  return audioContext;
};

const playTone = (kind: ToneKind) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {
      // Browser may block autoplay; no-op.
    });
  }

  const config = toneConfig[kind];
  const durationSeconds = config.durationMs / 1000;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = config.frequency;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(config.gain, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSeconds);
};

export const playCountdownBeep = () => playTone('countdown');
export const playCompletionBeep = () => playTone('complete');
export const playPrepareBeep = () => playTone('prepare');
