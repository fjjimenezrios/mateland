export function CribaCover() {
  const primes = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
  const colors: Record<number, string> = { 4: "#38bdf8", 6: "#38bdf8", 8: "#38bdf8", 10: "#38bdf8", 12: "#38bdf8", 14: "#38bdf8", 16: "#38bdf8", 18: "#38bdf8", 20: "#38bdf8", 22: "#38bdf8", 24: "#38bdf8", 9: "#f472b6", 15: "#f472b6", 21: "#f472b6", 25: "#fb923c" };
  return (
    <svg viewBox="0 0 340 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="cb-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d28d9" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <radialGradient id="cb-gold" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.6" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </radialGradient>
      </defs>
      <rect width="340" height="200" fill="url(#cb-bg)" />
      {[[30, 24], [300, 40], [60, 170], [280, 160], [170, 14]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#fff" opacity="0.8" />
      ))}
      {Array.from({ length: 24 }, (_, i) => {
        const n = i + 2;
        const x = 40 + (i % 6) * 43;
        const y = 22 + Math.floor(i / 6) * 42;
        const prime = primes.has(n);
        return (
          <g key={n}>
            <rect x={x} y={y} width="36" height="36" rx="9" fill={prime ? "url(#cb-gold)" : colors[n] ?? "#38bdf8"} opacity={prime ? 1 : 0.45} stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
            <text x={x + 18} y={y + 24} fontSize="16" fontWeight="800" textAnchor="middle" fill={prime ? "#451a03" : "#fff"} fontFamily="sans-serif" textDecoration={prime ? undefined : "line-through"}>
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
