import React from "react";

// Symboles de durée standard (ronde/blanche/noire/croche), dessinés en SVG
// pour un rendu fiable indépendant des polices — affichés sous chaque case.
export const DurationIcon: React.FC<{ quarters: number; color: string; size?: number }> = ({
  quarters,
  color,
  size = 22,
}) => {
  const w = size, h = size * 1.3;
  const cx = w * 0.38, cy = h * 0.82, rx = w * 0.34, ry = h * 0.19;
  const stemX = cx + rx * 0.92;
  const stemTopWhole = cy; // pas de hampe pour la ronde

  // n-olets : une croche de triolet vaut 1/3 de temps, une noire de triolet 2/3.
  // On revient à la valeur écrite (×3/2) et on affiche un petit « 3 ».
  const isTriplet = [1 / 6, 1 / 3, 2 / 3, 4 / 3].some((t) => Math.abs(quarters - t) < 0.01);
  let written = isTriplet ? quarters * 1.5 : quarters;
  // pointées (croche, noire, blanche) : valeur écrite = durée / 1,5, point à droite — comme RestIcon
  const dotted = !isTriplet && [0.75, 1.5, 3].some((d) => Math.abs(written - d) < 0.01);
  if (dotted) written /= 1.5;

  let kind: "whole" | "half" | "quarter" | "eighth" | "sixteenth" = "quarter";
  if (written >= 3.5) kind = "whole";
  else if (written >= 1.75) kind = "half";
  else if (written >= 0.875) kind = "quarter";
  else if (written >= 0.375) kind = "eighth";
  else kind = "sixteenth";

  const filled = kind !== "whole" && kind !== "half";
  const hasStem = kind !== "whole";
  const flags = kind === "eighth" ? 1 : kind === "sixteenth" ? 2 : 0;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      {isTriplet && (
        <text x={-w * 0.35} y={h * 0.42} fontSize={h * 0.5} fontWeight={700} fill={color} textAnchor="middle">
          3
        </text>
      )}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={w * 0.09}
        transform={`rotate(-18 ${cx} ${cy})`}
      />
      {/* point : r = 0,14·w — plus petit, il est illisible sous les cases */}
      {dotted && <circle cx={cx + rx + w * 0.42} cy={cy} r={w * 0.14} fill={color} />}
      {hasStem && (
        <line x1={stemX} y1={cy} x2={stemX} y2={h * 0.08} stroke={color} strokeWidth={w * 0.08} />
      )}
      {Array.from({ length: flags }).map((_, i) => (
        <path
          key={i}
          d={`M ${stemX} ${h * 0.08 + i * h * 0.16} q ${w * 0.32} ${h * 0.03} ${w * 0.3} ${h * 0.22}`}
          stroke={color}
          strokeWidth={w * 0.08}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};
