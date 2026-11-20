import React from "react";

// Symboles de silence standard, dessinés en SVG (fiables, indépendants des polices) :
// pause (4 temps), demi-pause (2), soupir (1), demi-soupir (1/2), quart de soupir (1/4).
// Pointés : point à droite. N-olets : petit « 3 » comme DurationIcon.
// Affichés à la place d'une case de tablature : sans les silences, la mélodie
// « ne respire pas » (retour de Paul, 2026-09-27).
export const RestIcon: React.FC<{ quarters: number; color: string; size?: number }> = ({
  quarters,
  color,
  size = 40,
}) => {
  const isTriplet = [1 / 6, 1 / 3, 2 / 3, 4 / 3].some((t) => Math.abs(quarters - t) < 0.01);
  let written = isTriplet ? quarters * 1.5 : quarters;
  const dotted = [0.75, 1.5, 3].some((d) => Math.abs(written - d) < 0.01);
  if (dotted) written /= 1.5;

  const w = size;
  const h = size;
  const sw = w * 0.07;
  let glyph: React.ReactNode;

  if (written >= 3.5) {
    // pause : bloc suspendu sous une ligne
    glyph = (
      <>
        <line x1={w * 0.2} y1={h * 0.38} x2={w * 0.8} y2={h * 0.38} stroke={color} strokeWidth={sw} />
        <rect x={w * 0.32} y={h * 0.38} width={w * 0.36} height={h * 0.16} fill={color} />
      </>
    );
  } else if (written >= 1.75) {
    // demi-pause : bloc posé sur une ligne
    glyph = (
      <>
        <line x1={w * 0.2} y1={h * 0.6} x2={w * 0.8} y2={h * 0.6} stroke={color} strokeWidth={sw} />
        <rect x={w * 0.32} y={h * 0.44} width={w * 0.36} height={h * 0.16} fill={color} />
      </>
    );
  } else if (written >= 0.875) {
    // soupir : zigzag
    glyph = (
      <path
        d={`M ${w * 0.42} ${h * 0.08} L ${w * 0.62} ${h * 0.34} L ${w * 0.42} ${h * 0.54} L ${w * 0.62} ${h * 0.74}
            Q ${w * 0.36} ${h * 0.66} ${w * 0.5} ${h * 0.94}`}
        stroke={color}
        strokeWidth={w * 0.09}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  } else {
    // demi-soupir (1 crochet) / quart de soupir (2 crochets)
    const hooks = written >= 0.375 ? 1 : 2;
    glyph = (
      <>
        <line x1={w * 0.62} y1={h * 0.22} x2={w * 0.42} y2={h * 0.9} stroke={color} strokeWidth={sw} strokeLinecap="round" />
        {Array.from({ length: hooks }).map((_, i) => {
          const y = h * (0.22 + i * 0.24);
          const x = w * (0.62 - i * 0.07);
          return (
            <g key={i}>
              <circle cx={x - w * 0.24} cy={y + h * 0.02} r={w * 0.08} fill={color} />
              <path d={`M ${x - w * 0.24} ${y + h * 0.06} Q ${x - w * 0.1} ${y + h * 0.12} ${x} ${y}`} stroke={color} strokeWidth={sw} fill="none" />
            </g>
          );
        })}
      </>
    );
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      {glyph}
      {dotted && <circle cx={w * 0.84} cy={h * 0.5} r={w * 0.055} fill={color} />}
      {isTriplet && (
        <text x={w * 0.1} y={h * 0.18} fontSize={h * 0.3} fontWeight={700} fill={color} textAnchor="middle">
          3
        </text>
      )}
    </svg>
  );
};
