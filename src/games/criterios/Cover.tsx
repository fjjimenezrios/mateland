export function CriteriosCover() {
  const tubes: [number, string, string, number][] = [[70, "÷2", "#38bdf8", 0.7], [140, "÷3", "#f472b6", 0.45], [210, "÷9", "#4ade80", 0.25], [280, "—", "#94a3b8", 0.1]];
  return (
    <svg viewBox="0 0 340 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ct-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#134e4a" />
        </linearGradient>
      </defs>
      <rect width="340" height="200" fill="url(#ct-bg)" />
      <g opacity="0.35" fill="#042f2e">
        <circle cx="40" cy="30" r="34" />
        <circle cx="300" cy="26" r="26" />
      </g>
      <rect x="95" y="20" width="150" height="54" rx="14" fill="#fff" stroke="#0f766e" strokeWidth="5" />
      <text x="170" y="60" fontSize="38" fontWeight="800" textAnchor="middle" fill="#134e4a" fontFamily="sans-serif">
        126
      </text>
      {tubes.map(([x, label, color, fill]) => (
        <g key={label}>
          <rect x={x - 22} y="92" width="44" height="86" rx="12" fill="rgba(255,255,255,.2)" stroke="#fff" strokeWidth="3" />
          <rect x={x - 19} y={92 + 86 * (1 - fill) - 2} width="38" height={86 * fill} rx="9" fill={color} />
          <text x={x} y="192" fontSize="16" fontWeight="800" textAnchor="middle" fill="#fff" fontFamily="sans-serif">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}
