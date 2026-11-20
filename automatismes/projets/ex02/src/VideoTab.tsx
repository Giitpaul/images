import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DurationIcon } from "./DurationIcon";
import { RestIcon } from "./RestIcon";
import { ITEMS, PAGES, EVENTS, PASSES, REPEATS, COUNTIN_END, BEAT } from "./videoData";
import { TITLE, SUBTITLE } from "./data";
import { isDouble } from "./TabImage";

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
const W = 1080;
const H = 1920;

const CHIP_W = 100;
const CHIP_H = 92;
const CHIP_GAP = 10;
const REST_W = 64;
const ICON = 30;
const GRID_TOP = 330;
const LINE_H = 168;
const CONTOUR_TOP = 1230;
const BAND_H = 330;
const RX = 34;
const RY = 29;

type Item = (typeof ITEMS)[number];

const START_REPEAT = new Set(REPEATS.filter((r) => r.type === "start").map((r) => r.measure));
const END_REPEAT = new Map(
  REPEATS.filter((r) => r.type === "end").map((r) => [r.measure, (r as { count?: number }).count ?? 2])
);

// Fin du 1er passage (version short : un seul passage)
const PASS1_END = EVENTS.find((e) => e.p === 1)?.t ?? Infinity;

// Événement actif à l'instant t (le dernier commencé)
const activeEventAt = (t: number) => {
  let lo = 0;
  let hi = EVENTS.length - 1;
  if (t < EVENTS[0].t) return -1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (EVENTS[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

// Décor club de blues animé : orbes néon qui dérivent + balayage lumineux.
const ORBS = [
  { x: 0.14, y: 0.16, r: 520, c: "#FF5D6C", sp: 0.9, amp: 70, ph: 0.0 },
  { x: 0.88, y: 0.1, r: 460, c: "#4FB6FF", sp: 1.3, amp: 55, ph: 1.1 },
  { x: 0.5, y: 0.52, r: 620, c: "#7A2BD8", sp: 0.6, amp: 90, ph: 2.2 },
  { x: 0.1, y: 0.85, r: 480, c: "#22C55E", sp: 1.1, amp: 65, ph: 3.4 },
  { x: 0.9, y: 0.92, r: 500, c: "#FFB347", sp: 0.8, amp: 80, ph: 4.7 },
];
const Background: React.FC<{ t: number }> = ({ t }) => {
  const sweep = ((t * 0.12) % 1) * 1.6 - 0.3;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden" }}>
      {ORBS.map((o, i) => {
        const dx = Math.sin(t * o.sp + o.ph) * o.amp;
        const dy = Math.cos(t * o.sp * 0.77 + o.ph) * o.amp * 0.7;
        const pulse = 0.5 + 0.5 * Math.sin(t * o.sp * 1.6 + o.ph);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: o.x * W - o.r + dx,
              top: o.y * H - o.r + dy,
              width: o.r * 2,
              height: o.r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${o.c} 0%, transparent 68%)`,
              opacity: 0.14 + 0.1 * pulse,
              filter: "blur(28px)",
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: sweep * W - 300,
          top: -200,
          width: 620,
          height: H + 400,
          transform: "rotate(14deg)",
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
          opacity: 0.55 + 0.25 * Math.sin(t * 2.2),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 45%, rgba(10,13,22,0.3) 35%, rgba(4,6,12,0.78) 100%)",
        }}
      />
    </div>
  );
};

const itemsOf = (measure: number) =>
  ITEMS.map((it, idx) => ({ it, idx })).filter(({ it }) => it.measure === measure);

const lineLayout = (measure: number) => {
  const row = itemsOf(measure);
  const xs: number[] = [];
  let x = START_REPEAT.has(measure) ? 30 : 0;
  row.forEach(({ it }) => {
    xs.push(x);
    x += (it.rest ? REST_W : CHIP_W) + CHIP_GAP;
  });
  const endX = x - CHIP_GAP;
  const width = endX + (END_REPEAT.has(measure) ? 80 : 0);
  return { row, xs, endX, width };
};

const Repeat: React.FC<{ x: number; end?: boolean }> = ({ x, end }) => (
  <div style={{ position: "absolute", left: x, top: -6, height: CHIP_H + 12, width: 22 }}>
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

const TabLine: React.FC<{ measure: number; top: number; activeIdx: number; glow: number; hideRepeats?: boolean }> = ({
  measure,
  top,
  activeIdx,
  glow,
  hideRepeats,
}) => {
  const { row, xs, endX, width } = lineLayout(measure);
  const left = (W - width) / 2;
  const label = row[0].it.mlabel;
  const endCount = hideRepeats ? undefined : END_REPEAT.get(measure);
  return (
    <div style={{ position: "absolute", top, left, width, height: LINE_H }}>
      {START_REPEAT.has(measure) && !hideRepeats && <Repeat x={0} />}
      {endCount && (
        <>
          <Repeat x={endX + 8} end />
          <div style={{ position: "absolute", left: endX + 36, top: 18, fontFamily: FONT, fontWeight: 700, fontSize: 34, color: C.gold }}>
            ×{endCount}
          </div>
        </>
      )}
      {row.map(({ it, idx }, k) => {
        const on = idx === activeIdx;
        if (it.rest) {
          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: xs[k],
                top: 0,
                width: REST_W,
                height: CHIP_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: on ? "scale(1.12)" : undefined,
              }}
            >
              <RestIcon quarters={it.dur} color={on ? C.gold : "rgba(245,245,245,0.78)"} size={46} />
            </div>
          );
        }
        const col = C[it.kind as Kind];
        return (
          <React.Fragment key={idx}>
            <div
              style={{
                position: "absolute",
                left: xs[k],
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
                border: it.tie ? `3px dashed ${col}99` : `3px solid ${col}`,
                boxShadow: on ? `0 0 ${28 + 18 * glow}px ${col}` : it.tie ? "none" : `0 0 14px ${col}44`,
                transform: on ? `scale(${1.08 + 0.04 * glow})` : undefined,
                zIndex: on ? 3 : 1,
              }}
            >
              {it.tie ? (
                <svg width={60} height={24} viewBox="0 0 60 24">
                  <path d="M 4 5 Q 30 27 56 5" stroke={on ? C.bg : col} strokeWidth={4} fill="none" strokeLinecap="round" />
                </svg>
              ) : isDouble(it.label) ? (
                // double note (ex. +6 / -2) : deux trous empilés, plus petits
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 30, lineHeight: 1.05 }}>
                  {it.label.split("/").map((part, k) => (
                    <span key={k}>{part}</span>
                  ))}
                </div>
              ) : (
                it.label
              )}
            </div>
            <div style={{ position: "absolute", left: xs[k] + CHIP_W / 2 - ICON / 2, top: CHIP_H + 8 }}>
              <DurationIcon quarters={it.dur} color="rgba(245,245,245,0.85)" size={ICON * 0.8} />
            </div>
          </React.Fragment>
        );
      })}
      {label > 0 && (
        <div style={{ position: "absolute", left: xs[0] + 8, top: 5, fontFamily: FONT, fontSize: 15, color: C.muted, zIndex: 4 }}>
          m.{label}
        </div>
      )}
    </div>
  );
};

// Contour mélodique de la mesure en cours, en grand, interrompu sur les silences.
const Contour: React.FC<{ measure: number; activeIdx: number; progress: number }> = ({ measure, activeIdx, progress }) => {
  const { row } = lineLayout(measure);
  const X0 = 80;
  const X1 = W - 80;
  const n = row.length;
  const xs = row.map((_, k) => (n === 1 ? W / 2 : X0 + (k * (X1 - X0)) / (n - 1)));
  const pitched = row.filter(({ it }) => !it.rest);
  const lo = Math.min(...pitched.map(({ it }) => it.midi));
  const hi = Math.max(...pitched.map(({ it }) => it.midi));
  const y = (it: Item) => (hi === lo ? BAND_H / 2 : RY + 4 + ((hi - it.midi) / (hi - lo)) * (BAND_H - 2 * RY - 8));
  const activeK = row.findIndex(({ idx }) => idx === activeIdx);

  return (
    <div style={{ position: "absolute", top: CONTOUR_TOP, left: 0, width: W, height: BAND_H + 90 }}>
      <div style={{ position: "absolute", top: 0, width: W, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 26,
            letterSpacing: 3,
            fontWeight: 700,
            color: C.bg,
            background: C.gold,
            padding: "8px 26px",
            borderRadius: 999,
          }}
        >
          LE CONTOUR MÉLODIQUE
        </div>
      </div>
      <svg width={W} height={BAND_H} style={{ position: "absolute", top: 76, left: 0, overflow: "visible" }}>
        {row.slice(0, -1).map(({ it }, k) => {
          const nx = row[k + 1].it;
          if (it.rest || nx.rest) return null;
          const done = activeK > k;
          const cur = activeK === k;
          const p = done ? 1 : cur ? progress : 0;
          const col = C[it.kind as Kind];
          return (
            <g key={k}>
              <line x1={xs[k]} y1={y(it)} x2={xs[k + 1]} y2={y(nx)} stroke="rgba(255,255,255,0.16)" strokeWidth={5} strokeLinecap="round" />
              {p > 0 && (
                <line
                  x1={xs[k]}
                  y1={y(it)}
                  x2={xs[k] + (xs[k + 1] - xs[k]) * p}
                  y2={y(it) + (y(nx) - y(it)) * p}
                  stroke={col}
                  strokeWidth={6}
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 10px ${col})` }}
                />
              )}
            </g>
          );
        })}
        {row.map(({ it, idx }, k) => {
          if (it.rest || it.tie) return null;
          const col = C[it.kind as Kind];
          const on = idx === activeIdx || (activeK > k && row[activeK]?.it.tie && k === activeK - 1);
          const reached = activeK >= k;
          return (
            <g key={idx} style={{ opacity: reached ? 1 : 0.55 }}>
              <ellipse
                cx={xs[k]}
                cy={y(it)}
                rx={on ? RX * 1.15 : RX}
                ry={on ? RY * 1.15 : RY}
                fill={on ? col : C.bg}
                stroke={col}
                strokeWidth={4}
                style={{ filter: on ? `drop-shadow(0 0 16px ${col})` : undefined }}
              />
              <text x={xs[k]} y={y(it) + 9} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={700} fill={on ? C.bg : col}>
                {it.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const Pill: React.FC<{ text: string; strong?: boolean }> = ({ text, strong }) => (
  <div
    style={{
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 34,
      color: strong ? C.bg : C.gold,
      background: strong ? C.gold : "rgba(243,210,122,0.12)",
      border: `2px solid ${C.gold}`,
      borderRadius: 999,
      padding: "6px 26px",
    }}
  >
    {text}
  </div>
);

// short : un seul passage, pas de compteur ni de signes de reprise, image figée
// sur la fin du passage puis fondu (l'audio est fondu à part avec ffmpeg).
export const VideoTab: React.FC<{ short?: boolean }> = ({ short }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tRaw = frame / fps;
  const t = short ? Math.min(tRaw, PASS1_END - 0.01) : tRaw;
  const fade = short ? interpolate(frame, [durationInFrames - 36, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const e = activeEventAt(t);
  const ev = e >= 0 ? EVENTS[e] : null;
  const activeIdx = ev ? ev.i : -1;
  const page = ev ? ev.page : 0;
  const pass = ev ? ev.p : 0;
  const measure = ev ? ITEMS[ev.i].measure : PAGES[0][0];
  const progress = ev ? Math.min(1, Math.max(0, (t - ev.t) / Math.max(ev.d, 0.001))) : 0;
  const glow = ev ? Math.max(0, 1 - (t - ev.t) / 0.35) : 0;
  const lines = PAGES[page];
  const countBeat = t < COUNTIN_END ? Math.floor(t / BEAT) + 1 : 0;
  const kinds = (["blow", "draw", "bend", "overblow", "overdraw"] as Kind[]).filter((k) =>
    ITEMS.some((it) => it.kind === k)
  );

  return (
    <div style={{ position: "absolute", inset: 0, width: W, height: H }}>
      <Background t={tRaw} />
      <div style={{ position: "absolute", inset: 0, opacity: fade }}>

      {/* en-tête */}
      <div style={{ position: "absolute", top: 50, left: 60, right: 60, display: "flex", alignItems: "center", gap: 26 }}>
        <Img src={staticFile("logo-apprendre.png")} style={{ height: 120, borderRadius: 14 }} />
        <div style={{ fontFamily: FONT }}>
          <div style={{ fontSize: 68, fontWeight: 700, color: C.text, lineHeight: 1 }}>{TITLE}</div>
          <div style={{ fontSize: 30, color: C.gold, marginTop: 8 }}>{SUBTITLE}</div>
        </div>
      </div>

      {/* page + passage */}
      <div style={{ position: "absolute", top: 222, left: 0, width: W, display: "flex", justifyContent: "center", gap: 22 }}>
        <Pill text={`Page ${page + 1}/${PAGES.length}`} />
        {PASSES > 1 && !short && <Pill text={`Passage ${pass + 1}/${PASSES}`} strong />}
      </div>

      {/* grille : une mesure par ligne */}
      {lines.map((m, i) => (
        <TabLine key={m} measure={m} top={GRID_TOP + i * LINE_H} activeIdx={activeIdx} glow={glow} hideRepeats={short} />
      ))}

      {/* décompte avant la première note */}
      {countBeat > 0 && (
        <div style={{ position: "absolute", top: CONTOUR_TOP + 120, width: W, display: "flex", justifyContent: "center", gap: 40 }}>
          {[1, 2].map((b) => (
            <div
              key={b}
              style={{
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 140,
                color: b === countBeat ? C.gold : "rgba(243,210,122,0.2)",
                textShadow: b === countBeat ? "0 0 40px rgba(243,210,122,0.7)" : "none",
              }}
            >
              {b}
            </div>
          ))}
        </div>
      )}
      {countBeat === 0 && <Contour measure={measure} activeIdx={activeIdx} progress={progress} />}

      {/* légende + crédit */}
      <div style={{ position: "absolute", top: 1690, width: W, display: "flex", justifyContent: "center", gap: 30, fontFamily: FONT }}>
        {kinds.map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: C[k] }} />
            <div style={{ fontSize: 30, color: C.text }}>{LABEL[k]}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 1790, width: W, textAlign: "center", fontFamily: FONT, fontSize: 30, color: C.muted }}>
        Paul Lassey · apprendrelharmonica.com
      </div>
      </div>
    </div>
  );
};
