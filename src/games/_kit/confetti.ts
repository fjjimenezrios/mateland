import confetti from "canvas-confetti";

const COLORS = ["#ffb347", "#ff6f61", "#ffd93d", "#6ee7b7", "#a78bfa", "#60a5fa"];

export function celebrate() {
  const base = { disableForReducedMotion: true, colors: COLORS, ticks: 160, scalar: 1 };
  void confetti({ ...base, particleCount: 70, spread: 85, origin: { x: 0.5, y: 0.65 } });
  setTimeout(() => void confetti({ ...base, particleCount: 40, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } }), 180);
  setTimeout(() => void confetti({ ...base, particleCount: 40, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } }), 180);
}
