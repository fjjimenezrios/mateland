const BUBBLES = Array.from({ length: 10 }, (_, i) => ({
  left: `${(i * 37 + 8) % 96}%`,
  size: 10 + ((i * 13) % 26),
  dur: 12 + ((i * 5) % 11),
  delay: -((i * 3) % 12),
}));

export function OrchardScene() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff7c2" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffd36b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9f5a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="1120" cy="560" r="330" fill="url(#sun-glow)" />
      <circle cx="1120" cy="560" r="78" fill="#fff3b0" />
      <ellipse cx="260" cy="190" rx="130" ry="32" fill="#fff" opacity="0.12" />
      <ellipse cx="340" cy="170" rx="90" ry="26" fill="#fff" opacity="0.12" />
      <ellipse cx="900" cy="120" rx="150" ry="30" fill="#fff" opacity="0.1" />
      <path d="M0 700 C 240 610 420 650 640 700 S 1100 660 1440 690 V900 H0Z" fill="#4b2370" opacity="0.55" />
      <path d="M0 770 C 300 700 520 760 760 780 S 1180 740 1440 770 V900 H0Z" fill="#33184f" opacity="0.8" />
      {[180, 520, 880, 1250].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i % 2 ? 744 : 760})`}>
          <rect x="-7" y="-10" width="14" height="60" rx="5" fill="#26123b" />
          <circle cx="0" cy="-38" r="46" fill="#2d6a4f" opacity="0.85" />
          <circle cx="-26" cy="-18" r="30" fill="#2d6a4f" opacity="0.85" />
          <circle cx="28" cy="-20" r="32" fill="#2d6a4f" opacity="0.85" />
          <circle cx="-10" cy="-48" r="6" fill="#ff9a1f" />
          <circle cx="22" cy="-30" r="6" fill="#ff9a1f" />
          <circle cx="-30" cy="-14" r="6" fill="#ff9a1f" />
        </g>
      ))}
      <path d="M0 840 C 360 800 720 850 1040 830 S 1320 820 1440 835 V900 H0Z" fill="#1d0f33" />
    </svg>
  );
}

export function OceanScene() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice">
        <polygon points="300,0 420,0 700,900 380,900" fill="#fff" opacity="0.05" />
        <polygon points="640,0 760,0 1080,900 760,900" fill="#fff" opacity="0.06" />
        <polygon points="1020,0 1100,0 1400,900 1180,900" fill="#fff" opacity="0.05" />
        <path d="M0 830 C 240 790 480 850 720 825 S 1200 790 1440 830 V900 H0Z" fill="#0b1f4d" opacity="0.7" />
        <path d="M0 870 C 300 840 560 885 860 862 S 1260 850 1440 872 V900 H0Z" fill="#081535" />
      </svg>
      {BUBBLES.map((bubble) => (
        <span
          key={bubble.left}
          className="drift"
          style={{
            left: bubble.left,
            width: bubble.size,
            height: bubble.size,
            ["--dur" as string]: `${bubble.dur}s`,
            ["--delay" as string]: `${bubble.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

const STARS = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 73 + 11) % 100,
  top: (i * 37 + 5) % 100,
  size: 2 + (i % 3),
  dur: 2.5 + (i % 5),
  delay: -(i % 7),
}));

function Stars() {
  return (
    <>
      {STARS.map((star) => (
        <span
          key={`${star.left}-${star.top}`}
          className="star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            ["--dur" as string]: `${star.dur}s`,
            ["--delay" as string]: `${star.delay}s`,
          }}
        />
      ))}
    </>
  );
}

export function SpaceScene() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 82% 18%, rgba(236,72,153,.38), transparent 70%), radial-gradient(50% 40% at 12% 72%, rgba(56,189,248,.28), transparent 70%)",
        }}
      />
      <Stars />
      <svg className="absolute -bottom-24 -right-16 h-[420px] w-[420px] opacity-90" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="planet" cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor="#fbcfe8" />
            <stop offset="0.5" stopColor="#a855f7" />
            <stop offset="1" stopColor="#312e81" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="215" rx="190" ry="44" fill="none" stroke="#f0abfc" strokeWidth="10" opacity="0.5" transform="rotate(-18 200 215)" />
        <circle cx="200" cy="200" r="120" fill="url(#planet)" />
        <path d="M80 215 C 160 245 260 245 320 205" fill="none" stroke="#f0abfc" strokeWidth="10" opacity="0.6" transform="rotate(-18 200 215)" />
      </svg>
    </div>
  );
}

function gearPoints(cx: number, cy: number, outer: number, inner: number, teeth: number): string {
  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const base = (2 * Math.PI * i) / teeth;
    const step = (2 * Math.PI) / teeth;
    for (const [radius, offset] of [[inner, -0.34], [outer, -0.2], [outer, 0.2], [inner, 0.34]] as const) {
      const angle = base + offset * step;
      points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
    }
  }
  return points.join(" ");
}

export function FactoryScene() {
  const gears: [number, number, number, number, string, string][] = [
    [160, 170, 120, 12, "#0f766e", "40s"],
    [330, 90, 70, 9, "#14b8a6", "-26s"],
    [1180, 220, 150, 14, "#115e59", "-46s"],
    [1330, 560, 80, 10, "#2dd4bf", "30s"],
    [90, 640, 95, 10, "#0d9488", "-34s"],
  ];
  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <rect y="0" width="1440" height="900" fill="none" />
      {gears.map(([cx, cy, outer, teeth, color, dur]) => (
        <g key={`${cx}-${cy}`} className="spin" style={{ ["--dur" as string]: dur }} opacity="0.5">
          <polygon points={gearPoints(cx, cy, outer, outer * 0.82, teeth)} fill={color} />
          <circle cx={cx} cy={cy} r={outer * 0.45} fill="#042f2e" opacity="0.55" />
          <circle cx={cx} cy={cy} r={outer * 0.12} fill="#99f6e4" />
        </g>
      ))}
      <rect x="0" y="10" width="1440" height="22" fill="#042f2e" opacity="0.3" />
      <rect x="0" y="15" width="1440" height="5" fill="#5eead4" opacity="0.22" />
      <rect x="0" y="800" width="1440" height="100" fill="#042f2e" opacity="0.7" />
      <path d="M0 800 H1440" stroke="#2dd4bf" strokeWidth="4" opacity="0.6" />
    </svg>
  );
}

export function ForestScene() {
  const trees = Array.from({ length: 16 }, (_, i) => ({ x: i * 96 - 20, h: 220 + ((i * 53) % 120), far: i % 2 === 0 }));
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <circle cx="240" cy="170" r="70" fill="#fef9c3" opacity="0.8" />
        <circle cx="240" cy="170" r="150" fill="#fef9c3" opacity="0.12" />
        {trees.map((tree) => (
          <g key={tree.x} transform={`translate(${tree.x} ${tree.far ? 640 : 700})`} opacity={tree.far ? 0.55 : 0.9}>
            <rect x="34" y={tree.h * 0.7} width="14" height="60" fill="#052e16" />
            <polygon points={`41,0 90,${tree.h * 0.45} 0,${tree.h * 0.45}`} fill={tree.far ? "#166534" : "#14532d"} />
            <polygon points={`41,${tree.h * 0.2} 98,${tree.h * 0.7} -16,${tree.h * 0.7}`} fill={tree.far ? "#15803d" : "#166534"} />
          </g>
        ))}
        <path d="M0 800 C 300 770 600 820 900 795 S 1300 780 1440 800 V900 H0Z" fill="#052e16" />
      </svg>
      {[12, 28, 46, 63, 80].map((left, index) => (
        <span
          key={left}
          className="drift"
          style={{ left: `${left}%`, width: 8, height: 8, background: "#fde047", border: 0, boxShadow: "0 0 12px 4px rgba(253,224,71,.8)", ["--dur" as string]: `${18 + index * 4}s`, ["--delay" as string]: `${-index * 5}s` }}
        />
      ))}
    </div>
  );
}

export function WorkshopScene() {
  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
      <defs>
        <pattern id="pegs" width="36" height="36" patternUnits="userSpaceOnUse">
          <circle cx="18" cy="18" r="3" fill="#000" opacity="0.18" />
        </pattern>
        <pattern id="floor" width="90" height="90" patternUnits="userSpaceOnUse">
          <rect width="90" height="90" fill="#7f1d1d" />
          <rect width="45" height="45" fill="#991b1b" />
          <rect x="45" y="45" width="45" height="45" fill="#991b1b" />
        </pattern>
      </defs>
      <rect width="1440" height="900" fill="url(#pegs)" />
      <g opacity="0.3" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round">
        <path d="M120 150 h140 M190 150 v110" />
        <circle cx="420" cy="190" r="40" />
        <path d="M1060 140 l110 110 M1170 140 l-110 110" />
        <rect x="1230" y="160" width="120" height="70" rx="12" />
        <path d="M640 130 v140 M600 130 h80" />
      </g>
      <rect y="760" width="1440" height="140" fill="url(#floor)" opacity="0.8" />
      <rect y="752" width="1440" height="14" fill="#450a0a" />
    </svg>
  );
}

export function NightScene() {
  const buildings = Array.from({ length: 18 }, (_, i) => ({ x: i * 84 - 10, h: 140 + ((i * 67) % 200), w: 60 + ((i * 11) % 24) }));
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <Stars />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <circle cx="170" cy="300" r="58" fill="#fef9c3" />
        <circle cx="190" cy="286" r="52" fill="#312e81" opacity="0.18" />
        {buildings.map((b, i) => (
          <g key={b.x}>
            <rect x={b.x} y={900 - b.h} width={b.w} height={b.h} fill={i % 2 ? "#0b1020" : "#111a36"} />
            {Array.from({ length: 6 }, (_, k) => (
              <rect key={k} x={b.x + 10 + (k % 2) * 24} y={900 - b.h + 18 + Math.floor(k / 2) * 34} width="10" height="14" fill="#fde047" opacity={(i + k) % 3 === 0 ? 0.9 : 0.15} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
