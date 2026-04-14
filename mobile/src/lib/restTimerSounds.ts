import { Audio } from 'expo-av';
import { Vibration } from 'react-native';

type ToneKind = 'countdown' | 'complete' | 'prepare';

const SAMPLE_RATE = 22050;
const BYTES_PER_SAMPLE = 2;
const NUM_CHANNELS = 1;

type ToneConfig =
  | { hz: number; durationMs: number }
  | { lowHz: number; highHz: number; durationMs: number };

const toneConfig: Record<ToneKind, ToneConfig> = {
  countdown: { hz: 720, durationMs: 110 },

  // longer + higher pitch (final beep)
  complete: { hz: 1250, durationMs: 360 },

  // double beep: low → high
  prepare: { lowHz: 520, highHz: 760, durationMs: 90 },
};

const toneCache = new Map<string, string>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const toBase64 = (bytes: Uint8Array): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
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

    const envelope =
      Math.min(1, i / 120) * Math.min(1, (sampleCount - i) / 250);

    const sample =
      Math.sin(2 * Math.PI * hz * t) * amplitude * envelope;

    view.setInt16(
      44 + i * BYTES_PER_SAMPLE,
      Math.floor(sample * 32767),
      true
    );
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