export function McmCover() {
  return (
    <svg viewBox="0 0 340 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="mm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4338ca" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <radialGradient id="mm-a" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.6" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </radialGradient>
        <radialGradient id="mm-b" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.6" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0e7490" />
        </radialGradient>
      </defs>
      <rect width="340" height="200" fill="url(#mm-bg)" />
      {[[30, 20], [90, 40], [250, 24], [310, 50], [160, 16]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#fff" opacity="0.8" />
      ))}
      <circle cx="110" cy="64" r="44" fill="#fbbf24" opacity="0.25" />
      <circle cx="230" cy="64" r="44" fill="#22d3ee" opacity="0.25" />
      <circle cx="110" cy="64" r="32" fill="url(#mm-a)" stroke="#fff" strokeWidth="4" />
      <circle cx="230" cy="64" r="32" fill="url(#mm-b)" stroke="#fff" strokeWidth="4" />
      <text x="110" y="76" fontSize="34" fontWeight="800" textAnchor="middle" fill="#422006" fontFamily="sans-serif">4</text>
      <text x="230" y="76" fontSize="34" fontWeight="800" textAnchor="middle" fill="#083344" fontFamily="sans-serif">6</text>
      <rect x="24" y="128" width="292" height="4" rx="2" fill="#fff" opacity="0.2" />
      <rect x="24" y="160" width="292" height="4" rx="2" fill="#fff" opacity="0.2" />
      {[4, 8, 12, 16, 20, 24].map((m) => (
        <circle key={`a${m}`} cx={24 + m * 11.5} cy="130" r="8" fill={m === 12 || m === 24 ? "#fde047" : "#fbbf24"} stroke={m === 12 ? "#fff" : "none"} strokeWidth="3" />
      ))}
      {[6, 12, 18, 24].map((m) => (
        <circle key={`b${m}`} cx={24 + m * 11.5} cy="162" r="8" fill={m === 12 || m === 24 ? "#fde047" : "#22d3ee"} stroke={m === 12 ? "#fff" : "none"} strokeWidth="3" />
      ))}
    </svg>
  );
}
