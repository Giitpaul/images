import React from "react";
import { Img, staticFile } from "remotion";
import { continueRender, delayRender } from "remotion";
// Police Anton locale (le réseau peut bloquer Google Fonts)
const attenteAnton = typeof window !== "undefined" ? delayRender("police Anton") : null;
if (typeof window !== "undefined") {
  new FontFace("Anton", `url(${staticFile("Anton.woff2")})`).load().then((f) => {
    document.fonts.add(f);
    if (attenteAnton !== null) continueRender(attenteAnton);
  });
}
import { NOTES, TITLE } from "./data";
import { INTRO_SUBTITLE } from "./config";
import { BG169, BG916 } from "./thumbBg";

// Miniatures YouTube (demandées par Paul, 2026-09-27) : 16:9 1280×720 pour la
// vidéo longue, 9:16 1080×1920 pour le short. Peu de mots, très gros, fort
// contraste : titre, « TABLATURE + BACKING TRACK », les premières cases de la
// tablature en grand (le début de la phrase), la mascotte.
const ANTON = "Anton";
const FONT = "Carlito";
const C = {
  bg: "#0A0D16",
  blow: "#4FB6FF",
  draw: "#FF5D6C",
  bend: "#22C55E",
  overblow: "#C9A4FF",
  overdraw: "#5FD97A",
  text: "#F5F5F5",
  gold: "#F3D27A",
};
type Kind = "blow" | "draw" | "bend" | "overblow" | "overdraw";

// Premières notes jouées (sans silences ni tenues) : l'accroche visuelle
const hook = (n: number) => NOTES.filter((x) => !x.rest && !x.tie).slice(0, n);

// Fond : image générée par fal.ai si fournie (voile sombre côté texte pour la
// lisibilité), sinon décor néon.
const Glow: React.FC<{ w: number; h: number; bg?: string; veil?: string }> = ({ w, h, bg, veil }) =>
  bg ? (
    <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden" }}>
      <Img src={staticFile(bg)} style={{ position: "absolute", inset: 0, width: w, height: h, objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: veil }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: Math.round(h * 0.012),
          background: `linear-gradient(90deg, ${C.draw}, ${C.blow}, ${C.bend}, ${C.overblow}, ${C.draw})`,
        }}
      />
    </div>
  ) : (
  <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden" }}>
    {[
      { x: 0.12, y: 0.2, r: 0.55, c: "#FF5D6C", o: 0.34 },
      { x: 0.92, y: 0.15, r: 0.5, c: "#4FB6FF", o: 0.3 },
      { x: 0.55, y: 0.75, r: 0.7, c: "#7A2BD8", o: 0.34 },
      { x: 0.05, y: 0.95, r: 0.45, c: "#22C55E", o: 0.22 },
      { x: 0.95, y: 0.95, r: 0.45, c: "#FFB347", o: 0.22 },
    ].map((o, i) => {
      const r = o.r * Math.max(w, h);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: o.x * w - r,
            top: o.y * h - r,
            width: 2 * r,
            height: 2 * r,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${o.c} 0%, transparent 66%)`,
            opacity: o.o,
            filter: "blur(20px)",
          }}
        />
      );
    })}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: Math.round(h * 0.012),
        background: `linear-gradient(90deg, ${C.draw}, ${C.blow}, ${C.bend}, ${C.overblow}, ${C.draw})`,
      }}
    />
  </div>
  );

const Chip: React.FC<{ label: string; kind: string; size: number }> = ({ label, kind, size }) => {
  const col = C[kind as Kind] ?? C.text;
  return (
    <div
      style={{
        width: size * 1.1,
        height: size,
        borderRadius: size * 0.2,
        border: `${Math.round(size * 0.05)}px solid ${col}`,
        background: "rgba(10,13,22,0.8)",
        boxShadow: `0 0 ${size * 0.35}px ${col}88`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size * 0.52,
        color: col,
      }}
    >
      {label}
    </div>
  );
};

const Badge: React.FC<{ text: string; size: number; strong?: boolean }> = ({ text, size, strong }) => (
  <div
    style={{
      fontFamily: ANTON,
      fontSize: size,
      letterSpacing: size * 0.04,
      color: strong ? C.bg : C.gold,
      background: strong ? C.gold : "rgba(243,210,122,0.12)",
      border: `${Math.max(2, Math.round(size * 0.07))}px solid ${C.gold}`,
      borderRadius: size * 0.3,
      padding: `${size * 0.12}px ${size * 0.45}px`,
      lineHeight: 1.15,
      boxShadow: strong ? `0 0 ${size}px rgba(243,210,122,0.5)` : "none",
    }}
  >
    {text}
  </div>
);

// Taille du titre selon sa longueur (obs. 0086 : Anton 172 px fixe, un titre de 25 caractères passait
// sur 4 lignes et sortait de l'image). Coupure en lignes simulée mot à mot avec une chasse moyenne
// prudente d'Anton en capitales (0,5 em par caractère, espace compris : surestime la largeur, donc
// jamais trop gros), puis la plus grande taille dont le bloc tient dans la hauteur réservée. Plafond :
// la règle validée par Paul (16:9 : 172 px jusqu'à 14 caractères, 118 au-delà ; 9:16 : même rapport,
// 210 / 144 px dans 1000 px de large).
const TITLE_EM = 0.5;
const TITLE_LINE = 0.95;
const titleLines = (text: string, size: number, width: number) => {
  const perLine = width / (size * TITLE_EM);
  let lines = 1;
  let cur = 0;
  for (const w of text.trim().split(/\s+/)) {
    if (w.length > perLine) return Infinity; // mot plus large que la colonne : il serait coupé
    const next = cur === 0 ? w.length : cur + 1 + w.length;
    if (next <= perLine) cur = next;
    else {
      lines += 1;
      cur = w.length;
    }
  }
  return lines;
};
const titleSize = (width: number, maxHeight: number, maxSize: number, minSize = 56) => {
  for (let s = maxSize; s > minSize; s -= 2) {
    if (titleLines(TITLE, s, width) * s * TITLE_LINE <= maxHeight) return s;
  }
  return minSize;
};

const Title: React.FC<{ size: number; align?: "left" | "center" }> = ({ size, align = "left" }) => (
  <div
    style={{
      fontFamily: ANTON,
      fontSize: size,
      lineHeight: TITLE_LINE,
      color: C.text,
      textTransform: "uppercase",
      textAlign: align,
      textShadow: `0 0 ${size * 0.25}px rgba(122,43,216,0.9), 0 ${size * 0.04}px 0 rgba(0,0,0,0.6)`,
    }}
  >
    {TITLE}
  </div>
);

export const Thumb169: React.FC = () => {
  const W = 1280;
  const H = 720;
  // hauteur laissée au titre : 720 − pastilles (93) − cases (142/152) − sous-titre (74) − ~40 px en haut et en bas
  const size = titleSize(820, BG169 ? 330 : 320, TITLE.length > 14 ? 118 : 172);
  return (
    <div style={{ position: "absolute", inset: 0, width: W, height: H }}>
      <Glow w={W} h={H} bg={BG169} veil="linear-gradient(90deg, rgba(10,13,22,0.93) 0%, rgba(10,13,22,0.72) 42%, rgba(10,13,22,0.08) 62%, rgba(10,13,22,0) 100%)" />
      <div style={{ position: "absolute", left: 64, top: 0, bottom: 0, width: 820, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Title size={size} />
        <div style={{ marginTop: 26, display: "flex", gap: 18 }}>
          <Badge text="TABLATURE" size={44} strong />
          <Badge text="+ BACKING TRACK" size={44} />
        </div>
        <div style={{ marginTop: 44, display: "flex", gap: 16 }}>
          {hook(6).map((n, i) => (
            <Chip key={i} label={n.label} kind={n.kind} size={BG169 ? 98 : 108} />
          ))}
        </div>
        <div style={{ marginTop: 30, fontFamily: FONT, fontWeight: 700, fontSize: 36, color: C.gold }}>{INTRO_SUBTITLE}</div>
      </div>
      {/* avec fond illustré : mascotte en petit dans le coin pour laisser voir l'harmonica */}
      <div style={BG169 ? { position: "absolute", right: 28, top: 28 } : { position: "absolute", right: 36, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
        <Img src={staticFile("logo-apprendre.png")} style={{ width: BG169 ? 190 : 380, filter: "drop-shadow(0 0 40px rgba(255,93,108,0.45))" }} />
      </div>
    </div>
  );
};

export const Thumb916: React.FC = () => {
  const W = 1080;
  const H = 1920;
  const notes = hook(8);
  // Fond illustré : l'harmonica occupe les 22 % du bas → tout le texte au-dessus de y ≈ 0,72·H (1382 px).
  // Valeurs validées sur « Plan shuffle » (obs. 0086, 10 miniatures sur 10) : paddingTop 60, logo 240,
  // marges 34/34/46/38 → sous-titre vers y ≈ 1250 avec un titre de 2 lignes à 210 px.
  const L = BG916
    ? { pad: 60, logo: 240, mTitle: 34, mBadge: 34, mChips: 46, mSub: 38, chip: 128 }
    : { pad: 0, logo: 400, mTitle: 50, mBadge: 50, mChips: 70, mSub: 60, chip: 170 };
  // hauteur laissée au titre : fond illustré = 1360 (sous 0,72·H) − le reste de la colonne (≈ 889 px) ;
  // décor néon (colonne centrée) = 1920 − ≈ 1151 px − 2 × 60 px de marge
  const size = titleSize(1000, BG916 ? 470 : 640, TITLE.length > 14 ? 144 : 210);
  return (
    <div style={{ position: "absolute", inset: 0, width: W, height: H }}>
      <Glow w={W} h={H} bg={BG916} veil="linear-gradient(180deg, rgba(10,13,22,0.9) 0%, rgba(10,13,22,0.72) 50%, rgba(10,13,22,0.1) 70%, rgba(10,13,22,0.2) 100%)" />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: BG916 ? "flex-start" : "center", paddingTop: L.pad }}>
        <div>
          <Img src={staticFile("logo-apprendre.png")} style={{ width: L.logo, filter: "drop-shadow(0 0 50px rgba(255,93,108,0.45))" }} />
        </div>
        <div style={{ marginTop: L.mTitle, width: 1000 }}>
          <Title size={size} align="center" />
        </div>
        <div style={{ marginTop: L.mBadge, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <Badge text="TABLATURE HARMONICA" size={64} strong />
        </div>
        <div style={{ marginTop: L.mChips, display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 22 }}>
          {notes.map((n, i) => (
            <Chip key={i} label={n.label} kind={n.kind} size={L.chip} />
          ))}
        </div>
        <div style={{ marginTop: L.mSub, fontFamily: FONT, fontWeight: 700, fontSize: 50, color: C.gold, textAlign: "center" }}>{INTRO_SUBTITLE}</div>
      </div>
    </div>
  );
};
