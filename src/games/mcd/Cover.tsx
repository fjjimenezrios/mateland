export function McdCover() {
  return (
    <svg viewBox="0 0 340 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="md-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb7185" />
          <stop offset="1" stopColor="#4c0519" />
        </linearGradient>
        <linearGradient id="md-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fecdd3" />
          <stop offset="0.5" stopColor="#fb7185" />
          <stop offset="1" stopColor="#be123c" />
        </linearGradient>
        <pattern id="md-tile" width="40" height="40" patternUnits="userSpaceOnUse" x="50" y="30">
          <rect width="40" height="40" fill="#4c0519" />
          <rect x="2" y="2" width="36" height="36" rx="5" fill="url(#md-face)" />
          <path d="M6 14 Q6 6 14 6" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" fill="none" strokeLinecap="round" />
        </pattern>
        <pattern id="md-cut" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#fecaca" />
          <rect width="5" height="10" fill="#dc2626" />
        </pattern>
      </defs>
      <rect width="340" height="200" fill="url(#md-bg)" />
      <rect x="50" y="30" width="240" height="140" rx="4" fill="#4c0519" />
      <rect x="50" y="30" width="240" height="120" fill="url(#md-tile)" />
      <rect x="50" y="150" width="240" height="20" fill="url(#md-cut)" />
      <g fontFamily="sans-serif" fontWeight="800" fill="#fff">
        <text x="170" y="22" fontSize="16" textAnchor="middle">12 m</text>
        <text x="28" y="104" fontSize="16" textAnchor="middle">7 m</text>
      </g>
    </svg>
  );
}
