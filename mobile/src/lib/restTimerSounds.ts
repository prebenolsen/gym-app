import { Audio } from 'expo-av';
import { Vibration } from 'react-native';

type ToneKind = 'countdown' | 'complete' | 'prepare';

const SAMPLE_RATE = 22050;
const BYTES_PER_SAMPLE = 2;
const NUM_CHANNELS = 1;

type ToneConfig =
  | { hz: number; durationMs: number }
  | { lowHz: number; highHz: number; durationMs: number };

type SoundVariant = {
  id: string;
  name: string;
  config: ToneConfig;
  isSingleTone: boolean;
};

// Sound variations for each category
export const COMPLETION_SOUNDS: SoundVariant[] = [
  { id: 'completion-classic', name: 'Classic Bell', config: { hz: 1250, durationMs: 360 }, isSingleTone: true },
  { id: 'completion-bright', name: 'Bright Chime', config: { hz: 1500, durationMs: 280 }, isSingleTone: true },
  { id: 'completion-deep', name: 'Deep Gong', config: { hz: 880, durationMs: 450 }, isSingleTone: true },
  { id: 'completion-crisp', name: 'Crisp Ping', config: { hz: 1800, durationMs: 200 }, isSingleTone: true },
  { id: 'completion-warm', name: 'Warm Tone', config: { hz: 1000, durationMs: 400 }, isSingleTone: true },
];

export const COUNTDOWN_SOUNDS: SoundVariant[] = [
  { id: 'countdown-beep', name: 'Quick Beep', config: { hz: 720, durationMs: 110 }, isSingleTone: true },
  { id: 'countdown-high', name: 'High Tick', config: { hz: 900, durationMs: 100 }, isSingleTone: true },
  { id: 'countdown-low', name: 'Low Tick', config: { hz: 550, durationMs: 120 }, isSingleTone: true },
  { id: 'countdown-bright', name: 'Bright Pip', config: { hz: 1100, durationMs: 90 }, isSingleTone: true },
  { id: 'countdown-soft', name: 'Soft Chirp', config: { hz: 650, durationMs: 130 }, isSingleTone: true },
];

export const PREPARE_SOUNDS: SoundVariant[] = [
  { id: 'prepare-double', name: 'Double Beep', config: { lowHz: 520, highHz: 760, durationMs: 90 }, isSingleTone: false },
  { id: 'prepare-alert', name: 'Alert Surge', config: { lowHz: 400, highHz: 950, durationMs: 86 }, isSingleTone: false },
  { id: 'prepare-gentle', name: 'Gentle Rise', config: { lowHz: 600, highHz: 800, durationMs: 100 }, isSingleTone: false },
  { id: 'prepare-dramatic', name: 'Dramatic Climb', config: { lowHz: 350, highHz: 1100, durationMs: 92 }, isSingleTone: false },
  { id: 'prepare-sprint', name: 'Sprint Pulse', config: { lowHz: 700, highHz: 1100, durationMs: 70 }, isSingleTone: false },
  { id: 'prepare-snap', name: 'Snap Up', config: { lowHz: 820, highHz: 1400, durationMs: 60 }, isSingleTone: false },
  { id: 'prepare-rocket', name: 'Rocket Lift', config: { lowHz: 500, highHz: 1500, durationMs: 58 }, isSingleTone: false },
];

const toneConfig: Record<ToneKind, ToneConfig> = {
  countdown: { hz: 720, durationMs: 110 },

  // longer + higher pitch (final beep)
  complete: { hz: 1250, durationMs: 360 },

  // double beep: low → high
  prepare: { lowHz: 520, highHz: 760, durationMs: 90 },
};

const toneCache = new Map<string, string>();

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

const toBase64 = (bytes: Uint8Array): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;

    out += chars[(triple >> 18) & 0x3f];
    out += chars[(triple >> 12) & 0x3f];
    out += i + 1 < bytes.length ? chars[(triple >> 6) & 0x3f] : '=';
    out += i + 2 < bytes.length ? chars[triple & 0x3f] : '=';
  }

  return out;
};

const buildToneDataUri = (hz: number, durationMs: number): string => {
  const sampleCount = Math.max(1, Math.floor((SAMPLE_RATE * durationMs) / 1000));
  const dataSize = sampleCount * BYTES_PER_SAMPLE;
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE, true);
  view.setUint16(32, NUM_CHANNELS * BYTES_PER_SAMPLE, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  const amplitude = 0.45;

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / SAMPLE_RATE;

    const envelope = Math.min(1, i / 120) * Math.min(1, (sampleCount - i) / 250);

    const sample = Math.sin(2 * Math.PI * hz * t) * amplitude * envelope;

    view.setInt16(44 + i * BYTES_PER_SAMPLE, Math.floor(sample * 32767), true);
  }

  return `data:audio/wav;base64,${toBase64(bytes)}`;
};

const getToneDataUri = (key: string, hz: number, durationMs: number) => {
  const cacheKey = `${key}-${hz}-${durationMs}`;
  const cached = toneCache.get(cacheKey);
  if (cached) return cached;

  const uri = buildToneDataUri(hz, durationMs);
  toneCache.set(cacheKey, uri);
  return uri;
};

const playTone = async (kind: ToneKind) => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const config = toneConfig[kind];

    // PREPARE: low → high double beep
    if ('lowHz' in config) {
      const firstUri = getToneDataUri('prepare-low', config.lowHz, config.durationMs);
      const secondUri = getToneDataUri('prepare-high', config.highHz, config.durationMs);

      const play = async (uri: string) => {
        const { sound } = await Audio.Sound.createAsync({ uri });

        await new Promise<void>((resolve) => {
          sound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.isLoaded && status.didJustFinish) {
              await sound.unloadAsync().catch(() => {});
              resolve();
            }
          });
          sound.playAsync();
        });
      };

      await play(firstUri);
      await sleep(90);
      await play(secondUri);

      return;
    }

    // normal tones
    const uri = getToneDataUri(kind, config.hz, config.durationMs);

    const { sound } = await Audio.Sound.createAsync({ uri });

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });

    await sound.playAsync();
  } catch {
    Vibration.vibrate(kind === 'complete' ? 150 : 80);
  }
};

export const playCountdownBeep = () => playTone('countdown');
export const playCompletionBeep = () => playTone('complete');
export const playPrepareBeep = () => playTone('prepare');

// Play a specific sound by ID
export const playSoundById = async (soundId: string) => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    // Find the sound in all categories
    const allSounds = [
      ...COMPLETION_SOUNDS,
      ...COUNTDOWN_SOUNDS,
      ...PREPARE_SOUNDS,
    ];
    
    const sound = allSounds.find((s) => s.id === soundId);
    if (!sound) {
      console.warn(`Sound with id ${soundId} not found`);
      return;
    }

    const config = sound.config;

    // Handle double beep (prepare sounds)
    if (!sound.isSingleTone && 'lowHz' in config) {
      const firstUri = getToneDataUri('sound-low', config.lowHz, config.durationMs);
      const secondUri = getToneDataUri('sound-high', config.highHz, config.durationMs);

      const play = async (uri: string) => {
        const { sound: audioSound } = await Audio.Sound.createAsync({ uri });

        await new Promise<void>((resolve) => {
          audioSound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.isLoaded && status.didJustFinish) {
              await audioSound.unloadAsync().catch(() => {});
              resolve();
            }
          });
          audioSound.playAsync();
        });
      };

      await play(firstUri);
      await sleep(90);
      await play(secondUri);
      return;
    }

    // Handle single tone sounds
    if (sound.isSingleTone && 'hz' in config) {
      const uri = getToneDataUri(soundId, config.hz, config.durationMs);
      const { sound: audioSound } = await Audio.Sound.createAsync({ uri });

      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          audioSound.unloadAsync().catch(() => {});
        }
      });

      await audioSound.playAsync();
    }
  } catch {
    Vibration.vibrate(soundId.includes('completion') ? 150 : 80);
  }
};

export const playCountdownPreviewById = async (soundId: string) => {
  for (let i = 0; i < 3; i += 1) {
    await playSoundById(soundId);
    if (i < 2) {
      await sleep(1000);
    }
  }
};
