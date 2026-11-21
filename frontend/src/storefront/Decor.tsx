// Decorative party dividers drawn as SVG so they stay crisp and follow theme colors.

const FESTIVE = ["rgb(var(--gd-brand))", "rgb(var(--gd-accent))", "#4f9f9b", "#f2c94c"];
const PASTEL = ["#f6a5c0", "#b9a3e3", "#f7d774", "#93cdf0"];

const heights = { small: 64, medium: 96, large: 140 } as const;
export type DividerSize = keyof typeof heights;

export function Bunting({ pastel = false, size = "small" }: { pastel?: boolean; size?: DividerSize }) {
  const colors = pastel ? PASTEL : FESTIVE;
  const flags = 16;
  const width = 1600;
  const step = width / flags;
  const sag = 26;
  // Two hanging swags pinned at the edges and the middle: y offset of the string at x.
  const y = (x: number) => 8 + sag * Math.sin((Math.PI * (x % (width / 2))) / (width / 2));
  const string = Array.from({ length: 41 }, (_, i) => {
    const x = (i / 40) * width;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y(x).toFixed(1)}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} 110`} preserveAspectRatio="none" style={{ height: heights[size] }} className="block w-full" aria-hidden="true">
      <defs>
        {colors.map((c, i) => (
          <pattern key={i} id={`stripe-${pastel ? "p" : "f"}-${i}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="14" height="14" fill={c} />
            <rect width="5" height="14" fill="white" fillOpacity="0.55" />
          </pattern>
        ))}
      </defs>
      <path d={string} fill="none" stroke="#7a5a4a" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      {Array.from({ length: flags }, (_, i) => {
        const x1 = i * step + 8;
        const x2 = (i + 1) * step - 8;
        const mid = (x1 + x2) / 2;
        const top = y(mid);
        const colorIndex = i % colors.length;
        const fill = i % 2 === 0 ? `url(#stripe-${pastel ? "p" : "f"}-${colorIndex})` : colors[colorIndex];
        return <path key={i} d={`M${x1} ${y(x1)} L${x2} ${y(x2)} L${mid} ${top + 70} Z`} fill={fill} />;
      })}
    </svg>
  );
}

export function Confetti({ size = "small" }: { size?: DividerSize }) {
  const pieces = Array.from({ length: 70 }, (_, i) => {
    // Deterministic pseudo-random so the layout doesn't jump between renders.
    const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    return { x: r(1) * 1600, y: 10 + r(2) * 80, rot: r(3) * 180, color: [...FESTIVE, ...PASTEL][i % 8], circle: r(4) > 0.6 };
  });
  return (
    <svg viewBox="0 0 1600 100" preserveAspectRatio="xMidYMid slice" style={{ height: heights[size] }} className="block w-full" aria-hidden="true">
      {pieces.map((p, i) =>
        p.circle ? (
          <circle key={i} cx={p.x} cy={p.y} r="4.5" fill={p.color} />
        ) : (
          <rect key={i} x={p.x} y={p.y} width="14" height="6" rx="2" fill={p.color} transform={`rotate(${p.rot} ${p.x + 7} ${p.y + 3})`} />
        ),
      )}
    </svg>
  );
}

export function Wave({ color = "rgb(var(--gd-brand))", flip = false, height = 24 }: { color?: string; flip?: boolean; height?: number }) {
  return (
    <svg viewBox="0 0 1200 24" preserveAspectRatio="none" style={{ height, transform: flip ? "scaleY(-1)" : undefined }} className="block w-full" aria-hidden="true">
      <path d="M0 24 V12 Q 50 0 100 12 T 200 12 T 300 12 T 400 12 T 500 12 T 600 12 T 700 12 T 800 12 T 900 12 T 1000 12 T 1100 12 T 1200 12 V24 Z" fill={color} />
    </svg>
  );
}
