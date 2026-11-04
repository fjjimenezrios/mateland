export function CazaCover() {
  const bubbles: [number, number, number, string][] = [
    [80, 96, 38, "6"], [170, 70, 46, "12"], [262, 108, 36, "4"], [130, 150, 30, "3"], [230, 164, 28, "2"],
  ];
  return (
    <svg viewBox="0 0 340 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="cc-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.6" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <radialGradient id="cc-bubble" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#bae6fd" stopOpacity="0.6" />
          <stop offset="1" stopColor="#0e7490" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <rect width="340" height="200" fill="url(#cc-sea)" />
      <polygon points="60,0 110,0 190,200 100,200" fill="#fff" opacity="0.07" />
      <polygon points="220,0 260,0 330,200 250,200" fill="#fff" opacity="0.06" />
      <path d="M0 176 C 80 160 160 186 240 170 S 320 168 340 174 V200 H0Z" fill="#0b1f4d" />
      {bubbles.map(([x, y, r, label]) => (
        <g key={label}>
          <circle cx={x} cy={y} r={r} fill="url(#cc-bubble)" stroke="#fff" strokeWidth="3" />
          <text x={x} y={y + r * 0.22} fontSize={r * 0.7} fontWeight="800" fill="#04243a" textAnchor="middle" fontFamily="sans-serif">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}
