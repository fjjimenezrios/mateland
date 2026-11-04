import { useSyncExternalStore } from "react";

export type SoundName = "pick" | "drop" | "success" | "error" | "pop";

const KEY = "mates:sound";
const listeners = new Set<() => void>();
let enabled: boolean | null = null;
let context: AudioContext | null = null;

function readEnabled(): boolean {
  if (enabled === null) {
    try {
      enabled = localStorage.getItem(KEY) === "1";
    } catch {
      enabled = false;
    }
  }
  return enabled;
}

export function setSoundOn(value: boolean) {
  enabled = value;
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    enabled = value;
  }
  listeners.forEach((listener) => listener());
  if (value) playSound("pick");
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readEnabled,
    () => false,
  );
}

function tone(frequency: number, start: number, duration: number, type: OscillatorType, volume: number) {
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  const t0 = context.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(t0);
  oscillator.stop(t0 + duration + 0.02);
}

export function playSound(name: SoundName) {
  if (!readEnabled() || typeof AudioContext === "undefined") return;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  if (name === "pick") tone(520, 0, 0.08, "sine", 0.12);
  if (name === "drop") tone(260, 0, 0.12, "triangle", 0.18);
  if (name === "pop") tone(780, 0, 0.1, "sine", 0.18);
  if (name === "error") {
    tone(180, 0, 0.18, "sawtooth", 0.08);
    tone(150, 0.1, 0.2, "sawtooth", 0.08);
  }
  if (name === "success") [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.16));
}
