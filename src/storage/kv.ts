import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MMKV } from 'react-native-mmkv';

/**
 * Storage abstraction over a single JSON blob, exposing a synchronous API.
 *
 * - On a native dev/production build we use MMKV (synchronous, fast, persistent).
 * - In Expo Go the MMKV native (Nitro) module is not bundled, so loading it can
 *   throw at evaluation or creation time. We catch either case and transparently
 *   fall back to an in-memory cache hydrated from / persisted to AsyncStorage.
 *   Reads stay synchronous in both cases.
 */

type Listener = () => void;

const STORAGE_KEY = 'scripts';

// Load MMKV defensively — a guarded require catches both the missing native
// module (Expo Go) and any evaluation-time errors, unlike a static import.
let mmkv: MMKV | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mmkvModule = require('react-native-mmkv') as typeof import('react-native-mmkv');
  mmkv = mmkvModule.createMMKV({ id: 'teleprompter-store' });
} catch {
  // Expo Go (or any runtime without the MMKV native module).
  mmkv = null;
}

/** Whether the fast native MMKV backend is active (false in Expo Go). */
export const usingMMKV = mmkv !== null;

const listeners = new Set<Listener>();
function notify(): void {
  listeners.forEach((listener) => listener());
}

// Fallback state — only used when MMKV is unavailable.
let memoryValue: string | undefined;
if (!mmkv) {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((value) => {
      memoryValue = value ?? undefined;
      notify();
    })
    .catch(() => {
      // Ignore hydration errors and start from an empty store.
    });
}

export function readRaw(): string | undefined {
  if (mmkv) return mmkv.getString(STORAGE_KEY);
  return memoryValue;
}

export function writeRaw(value: string): void {
  if (mmkv) {
    mmkv.set(STORAGE_KEY, value);
  } else {
    memoryValue = value;
    void AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {
      // Best-effort persistence in Expo Go.
    });
  }
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
