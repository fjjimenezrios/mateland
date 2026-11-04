export function NaranjasCover() {
  const oranges: [number, number][] = [[92, 118], [118, 112], [104, 98], [210, 120], [236, 114], [222, 100], [248, 124]];
  return (
    <svg viewBox="0 0 340 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="cv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb347" />
          <stop offset="0.6" stopColor="#ff7e5f" />
          <stop offset="1" stopColor="#6a3093" />
        </linearGradient>
        <radialGradient id="cv-orange" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffe29a" />
          <stop offset="0.45" stopColor="#ffa21f" />
          <stop offset="1" stopColor="#d9570a" />
        </radialGradient>
      </defs>
      <rect width="340" height="200" fill="url(#cv-sky)" />
      <circle cx="262" cy="52" r="26" fill="#fff3b0" />
      <path d="M0 160 C 80 130 160 170 240 150 S 320 140 340 150 V200 H0Z" fill="#3a1d5c" />
      {[[70, 130], [194, 130]].map(([x, y]) => (
        <g key={x}>
          <rect x={x} y={y} width="96" height="52" rx="14" fill="#c8791c" stroke="#7a4310" strokeWidth="4" />
          <rect x={x - 6} y={y - 6} width="108" height="14" rx="7" fill="#e69a3c" stroke="#7a4310" strokeWidth="4" />
        </g>
      ))}
      {oranges.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="15" fill="url(#cv-orange)" />
          <ellipse cx={x + 3} cy={y - 14} rx="6" ry="3" fill="#43b552" transform={`rotate(-20 ${x + 3} ${y - 14})`} />
        </g>
      ))}
      <text x="118" y="168" fontSize="20" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="sans-serif">4</text>
      <text x="242" y="168" fontSize="20" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="sans-serif">3</text>
    </svg>
  );
}
