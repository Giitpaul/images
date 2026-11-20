import React from "react";
import { Img, staticFile } from "remotion";
import { DurationIcon } from "./DurationIcon";
import { RestIcon } from "./RestIcon";
import { NOTES, PAGES, REPEATS, KINDS, TITLE, SUBTITLE } from "./data";

// Charte videotab — ne pas dévier.
const C = {
  bg: "#0A0D16",
  blow: "#4FB6FF",
  draw: "#FF5D6C",
  bend: "#22C55E",
  overblow: "#C9A4FF",
  overdraw: "#5FD97A",
  text: "#F5F5F5",
  muted: "#8A8F9C",
  gold: "#F3D27A",
};
type Kind = "blow" | "draw" | "bend" | "overblow" | "overdraw";
const LABEL: Record<Kind, string> = {
  blow: "souffle",
  draw: "aspiré",
  bend: "bend",
  overblow: "overblow",
  overdraw: "overdraw",
};
const FONT = "Carlito";
// double note écrite par Paul (« +6/-2 ») — pas un préfixe de jeu comme « /-3 »
export const isDouble = (label: string) => /^[+-][^/]+(\/[+-][^/]+)+$/.test(label);

const W = 1920;
const H = 1080;
const MARGIN_X = 70;
const HEADER_H = 128;
const ROW_TOP = HEADER_H + 44;
const ROW_H = 400;
const CHIP_W = 100;
const CHIP_H = 92;
const CHIP_GAP = 12;
const REST_W = 64; // case silence, plus étroite
const BAR_GAP = 30; // espace de barre de mesure
const ICON = 30;
const BAND_TOP = CHIP_H + ICON + 22;
const BAND_H = 200;
const RX = 25;
const RY = 22;

type N = (typeof NOTES)[number];

const START_REPEAT = new Set(REPEATS.filter((r) => r.type === "start").map((r) => r.measure));
const END_REPEAT = new Map(
  REPEATS.filter((r) => r.type === "end").map((r) => [r.measure, (r as { count?: number }).count ?? 2])
);

// Décor club de blues figé : orbes néon + faisceau, jamais un aplat.
const ORBS = [
  { x: 0.1, y: 0.18, r: 520, c: "#FF5D6C" },
  { x: 0.9, y: 0.12, r: 480, c: "#4FB6FF" },
  { x: 0.52, y: 0.55, r: 700, c: "#7A2BD8" },
  { x: 0.06, y: 0.92, r: 460, c: "#22C55E" },
  { x: 0.94, y: 0.9, r: 500, c: "#FFB347" },
];

// t = 0 : image fixe ; t > 0 (vidéo 16:9) : les orbes dérivent doucement
const Background: React.FC<{ t?: number }> = ({ t = 0 }) => (
  <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden" }}>
    {ORBS.map((o, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: o.x * W - o.r + Math.sin(t * (0.6 + i * 0.17) + i * 1.3) * 70,
          top: o.y * H - o.r + Math.cos(t * (0.5 + i * 0.13) + i * 0.9) * 50,
          width: o.r * 2,
          height: o.r * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${o.c} 0%, transparent 68%)`,
          opacity: 0.2,
          filter: "blur(30px)",
        }}
      />
    ))}
    <div
      style={{
        position: "absolute",
        left: 0.62 * W - 320,
        top: -220,
        width: 640,
        height: 1520,
        transform: "rotate(16deg)",
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 55%, transparent 100%)",
        filter: "blur(14px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: `linear-gradient(90deg, ${C.draw}, ${C.blow}, ${C.bend}, ${C.overblow}, ${C.draw})`,
        opacity: 0.7,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 50% 45%, rgba(10,13,22,0.35) 30%, rgba(4,6,12,0.8) 100%)",
      }}
    />
  </div>
);

// Positions x de chaque note d'une ligne, avec un espace à chaque barre de mesure
// (plus large s'il porte une barre de reprise).
const layoutLine = (measures: number[]) => {
  const notes = NOTES.filter((n) => measures.includes(n.measure));
  const xs: number[] = [];
  const bars: { x: number; m: number; label: number; startRepeat: boolean }[] = [];
  let x = 0;
  notes.forEach((n, i) => {
    if (i === 0 || n.measure !== notes[i - 1].measure) {
      const rep = START_REPEAT.has(n.measure);
      if (i > 0) x += BAR_GAP - CHIP_GAP;
      if (rep) x += 26;
      bars.push({ x, m: n.measure, label: n.mlabel, startRepeat: rep });
    }
    xs.push(x);
    x += (n.rest ? REST_W : CHIP_W) + CHIP_GAP;
  });
  const last = notes[notes.length - 1].measure;
  const endCount = END_REPEAT.get(last);
  const width = x - CHIP_GAP + (endCount ? 90 : 0);
  return { notes, xs, bars, width, endCount, endX: x - CHIP_GAP };
};

const RepeatSign: React.FC<{ x: number; end?: boolean }> = ({ x, end }) => (
  <div style={{ position: "absolute", left: x, top: -6, height: CHIP_H + 12, width: 22 }}>
    {/* barre épaisse + barre fine + deux points (‖: ou :‖) */}
    <div style={{ position: "absolute", left: end ? 14 : 0, top: 0, width: 6, height: "100%", background: C.gold }} />
    <div style={{ position: "absolute", left: end ? 8 : 10, top: 0, width: 2, height: "100%", background: C.gold }} />
    {[0.36, 0.64].map((f) => (
      <div
        key={f}
        style={{
          position: "absolute",
          left: end ? -2 : 16,
          top: `calc(${f * 100}% - 4px)`,
          width: 8,
          height: 8,
          borderRadius: 4,
          background: C.gold,
        }}
      />
    ))}
  </div>
);

const Row: React.FC<{ measures: number[]; top: number; activeIdx?: number; glow?: number }> = ({
  measures,
  top,
  activeIdx = -1,
  glow = 0,
}) => {
  const { notes, xs, bars, width, endCount, endX } = layoutLine(measures);
  const left = (W - width) / 2;
  const pitched = notes.filter((n) => !n.rest);
  const lo = Math.min(...pitched.map((n) => n.midi));
  const hi = Math.max(...pitched.map((n) => n.midi));
  // amplitude normalisée sur l'étendue de CETTE ligne (sinon contour plat)
  const cy = (n: N) =>
    hi === lo ? BAND_H / 2 : RY + 2 + ((hi - n.midi) / (hi - lo)) * (BAND_H - 2 * RY - 4);
  const cx = (i: number) => xs[i] + (notes[i].rest ? REST_W : CHIP_W) / 2;

  return (
    <div style={{ position: "absolute", top, left, width, height: ROW_H }}>
      {/* barres, reprises, numéros de mesure */}
      {bars.map((b, i) => (
        <React.Fragment key={b.m}>
          {i > 0 && !b.startRepeat && (
            <div
              style={{
                position: "absolute",
                left: b.x - BAR_GAP / 2 - 1,
                top: -6,
                width: 2,
                height: CHIP_H + ICON + 16,
                background: "rgba(255,255,255,0.3)",
              }}
            />
          )}
          {b.startRepeat && <RepeatSign x={b.x - 30} />}
          {b.label > 0 && (
            <div
              style={{
                position: "absolute",
                left: b.x + 8,
                top: 5,
                fontFamily: FONT,
                fontSize: 15,
                color: C.muted,
                zIndex: 2,
              }}
            >
              m.{b.label}
            </div>
          )}
        </React.Fragment>
      ))}
      {endCount && (
        <>
          <RepeatSign x={endX + 8} end />
          <div
            style={{
              position: "absolute",
              left: endX + 38,
              top: 14,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 34,
              color: C.gold,
            }}
          >
            ×{endCount}
          </div>
        </>
      )}

      {/* cases de tablature + durée */}
      {notes.map((n, i) => {
        if (n.rest) {
          // silence : symbole standard, sans cadre — la mélodie respire
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: xs[i],
                top: 0,
                width: REST_W,
                height: CHIP_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RestIcon quarters={n.dur} color={NOTES.indexOf(n) === activeIdx ? C.gold : "rgba(245,245,245,0.78)"} size={46} />
            </div>
          );
        }
        const col = C[n.kind as Kind];
        const on = NOTES.indexOf(n) === activeIdx;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: xs[i],
                top: 0,
                width: CHIP_W,
                height: CHIP_H,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 46,
                color: on ? C.bg : col,
                background: on ? col : "rgba(10,13,22,0.72)",
                border: n.tie ? `3px dashed ${col}99` : `3px solid ${col}`,
                boxShadow: on ? `0 0 ${28 + 18 * glow}px ${col}` : n.tie ? "none" : `0 0 16px ${col}55`,
                transform: on ? `scale(${1.08 + 0.04 * glow})` : undefined,
                zIndex: on ? 3 : 1,
              }}
            >
              {n.tie ? (
                // note liée : tenue de la note précédente
                <svg width={60} height={24} viewBox="0 0 60 24">
                  <path d="M 4 5 Q 30 27 56 5" stroke={on ? C.bg : col} strokeWidth={4} fill="none" strokeLinecap="round" />
                </svg>
              ) : isDouble(n.label) ? (
                // double note écrite par Paul sur deux lignes (ex. +6 / -2) : deux trous empilés, plus petits
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 30, lineHeight: 1.05 }}>
                  {n.label.split("/").map((part, k) => (
                    <span key={k}>{part}</span>
                  ))}
                </div>
              ) : (
                n.label
              )}
            </div>
            <div style={{ position: "absolute", left: xs[i] + CHIP_W / 2 - ICON / 2, top: CHIP_H + 8 }}>
              <DurationIcon quarters={n.dur} color="rgba(245,245,245,0.85)" size={ICON * 0.8} />
            </div>
          </React.Fragment>
        );
      })}

      {/* contour mélodique de la ligne */}
      <svg width={width} height={BAND_H} style={{ position: "absolute", left: 0, top: BAND_TOP, overflow: "visible" }}>
        {notes.slice(0, -1).map((n, i) =>
          n.rest || notes[i + 1].rest ? null : ( // le contour s'interrompt sur les silences
          <line
            key={`l${i}`}
            x1={cx(i)}
            y1={cy(n)}
            x2={cx(i + 1)}
            y2={cy(notes[i + 1])}
            stroke={C[n.kind as Kind]}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.75}
          />
        ))}
        {notes.map((n, i) => {
          if (n.tie || n.rest) return null; // tenue ou silence : pas de bulle
          const col = C[n.kind as Kind];
          // bulle allumée : note active, ou note tenue par la liaison active
          const gi = NOTES.indexOf(n);
          const on = gi === activeIdx || (NOTES[activeIdx]?.tie && gi === activeIdx - 1);
          return (
            <g key={`b${i}`}>
              <ellipse cx={cx(i)} cy={cy(n)} rx={on ? RX * 1.18 : RX} ry={on ? RY * 1.18 : RY} fill={on ? col : C.bg} stroke={col} strokeWidth={3} style={{ filter: on ? `drop-shadow(0 0 14px ${col})` : undefined }} />
              <text x={cx(i)} y={cy(n) + 6.5} textAnchor="middle" fontFamily={FONT} fontSize={19} fontWeight={700} fill={on ? C.bg : col}>
                {n.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Image fixe : page seule. Vidéo 16:9 : t, activeIdx, glow et pastilles fournis par VideoTab169.
export const TabPage: React.FC<{ page: number; t?: number; activeIdx?: number; glow?: number; pills?: { text: string; strong?: boolean }[] }> = ({
  page,
  t = 0,
  activeIdx = -1,
  glow = 0,
  pills,
}) => {
  const lines = PAGES[page];
  const kinds = (KINDS as readonly string[]).filter((k) =>
    NOTES.some((n) => n.kind === k && lines.flat().includes(n.measure))
  );
  return (
    <div style={{ position: "absolute", inset: 0, width: W, height: H }}>
      <Background t={t} />

      {/* en-tête */}
      <div
        style={{
          position: "absolute",
          top: 22,
          left: MARGIN_X,
          right: MARGIN_X,
          height: HEADER_H - 22,
          display: "flex",
          alignItems: "center",
          gap: 26,
        }}
      >
        <Img src={staticFile("logo-apprendre.png")} style={{ height: 96, borderRadius: 12 }} />
        <div style={{ fontFamily: FONT, flex: 1 }}>
          <div style={{ fontSize: 58, fontWeight: 700, color: C.text, lineHeight: 1 }}>{TITLE}</div>
          <div style={{ fontSize: 28, color: C.gold, marginTop: 6 }}>{SUBTITLE}</div>
        </div>
        {(pills ?? [{ text: `${page + 1}/${PAGES.length}`, strong: true }]).map((p) => (
          <div
            key={p.text}
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: pills ? 36 : 44,
              color: p.strong ? C.bg : C.gold,
              background: p.strong ? C.gold : "rgba(243,210,122,0.12)",
              border: `2px solid ${C.gold}`,
              borderRadius: 999,
              padding: "6px 30px",
              boxShadow: p.strong ? "0 0 30px rgba(243,210,122,0.45)" : "none",
            }}
          >
            {p.text}
          </div>
        ))}
      </div>

      {lines.map((ms, i) => (
        <Row key={i} measures={ms} top={ROW_TOP + i * (ROW_H + 18)} activeIdx={activeIdx} glow={glow} />
      ))}

      {/* légende + crédit */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: MARGIN_X,
          right: MARGIN_X,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: FONT,
        }}
      >
        <div style={{ display: "flex", gap: 30 }}>
          {kinds.map((k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: C[k as Kind] }} />
              <div style={{ fontSize: 24, color: C.text }}>{LABEL[k as Kind]}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 24, color: C.muted }}>Paul Lassey · apprendrelharmonica.com</div>
      </div>
    </div>
  );
};
