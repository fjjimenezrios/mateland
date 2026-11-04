export function ArbolCover() {
  const ball = (x: number, y: number, label: string, gold = false) => (
    <g key={`${x}-${y}`}>
      <circle cx={x} cy={y} r="24" fill={gold ? "url(#ab-gold)" : "url(#ab-green)"} stroke="#fff" strokeWidth="3" />
      <text x={x} y={y + 8} fontSize="22" fontWeight="800" textAnchor="middle" fill={gold ? "#451a03" : "#052e16"} fontFamily="sans-serif">
        {label}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 340 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ab-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bef264" />
          <stop offset="0.55" stopColor="#22c55e" />
          <stop offset="1" stopColor="#14532d" />
        </linearGradient>
        <radialGradient id="ab-green" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#d9f99d" />
          <stop offset="0.5" stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </radialGradient>
        <radialGradient id="ab-gold" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset="0.55" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <rect width="340" height="200" fill="url(#ab-bg)" />
      <path d="M0 170 C 90 150 200 190 340 160 V200 H0Z" fill="#052e16" />
      <g stroke="#fef9c3" strokeWidth="5" strokeLinecap="round" opacity="0.9">
        <path d="M170 56 L110 100 M170 56 L230 100 M230 100 L200 146 M230 100 L262 146" />
      </g>
      {ball(170, 34, "12")}
      {ball(110, 100, "3", true)}
      {ball(230, 100, "4")}
      {ball(200, 150, "2", true)}
      {ball(262, 150, "2", true)}
    </svg>
  );
}
