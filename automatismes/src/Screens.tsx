import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Écrans d'intro et de fin (9:16) — même décor club de blues que la vidéo.
// Liens demandés par Paul (2026-09-27) : partenaire Brodur + appli HarmonicaTrainer.
const C = { bg: "#0A0D16", text: "#F5F5F5", muted: "#8A8F9C", gold: "#F3D27A", draw: "#FF5D6C", blow: "#4FB6FF", bend: "#22C55E", overblow: "#C9A4FF" };
const FONT = "Carlito";
const W = 1080;
const H = 1920;

const ORBS = [
  { x: 0.14, y: 0.16, r: 520, c: "#FF5D6C", sp: 0.9, amp: 70, ph: 0.0 },
  { x: 0.88, y: 0.1, r: 460, c: "#4FB6FF", sp: 1.3, amp: 55, ph: 1.1 },
  { x: 0.5, y: 0.52, r: 620, c: "#7A2BD8", sp: 0.6, amp: 90, ph: 2.2 },
  { x: 0.1, y: 0.85, r: 480, c: "#22C55E", sp: 1.1, amp: 65, ph: 3.4 },
  { x: 0.9, y: 0.92, r: 500, c: "#FFB347", sp: 0.8, amp: 80, ph: 4.7 },
];
export const ClubBackground: React.FC<{ t: number; w?: number; h?: number }> = ({ t, w = W, h = H }) => {
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
              left: o.x * w - o.r + dx,
              top: o.y * h - o.r + dy,
              width: o.r * 2,
              height: o.r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${o.c} 0%, transparent 68%)`,
              opacity: 0.16 + 0.12 * pulse,
              filter: "blur(28px)",
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: sweep * w - 300,
          top: -200,
          width: 620,
          height: h + 400,
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
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, rgba(10,13,22,0.25) 35%, rgba(4,6,12,0.8) 100%)" }} />
    </div>
  );
};

// Apparition douce : décalée de `delay` frames
const useAppear = (delay: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 110 } });
  return { opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) scale(${interpolate(s, [0, 1], [0.94, 1])})` };
};

// Fondu de sortie sur les `n` dernières frames
const useFadeOut = (n: number) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [durationInFrames - n, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

const Url: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 44,
      color: C.bg,
      background: C.gold,
      borderRadius: 999,
      padding: "10px 34px",
      boxShadow: "0 0 34px rgba(243,210,122,0.45)",
    }}
  >
    {text}
  </div>
);

export const Intro: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a1 = useAppear(0);
  const a2 = useAppear(8);
  const a3 = useAppear(16);
  const a4 = useAppear(30);
  const out = useFadeOut(10);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ClubBackground t={frame / fps} />
      <div style={{ position: "absolute", inset: 0, opacity: out, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT }}>
        <div style={{ marginTop: 360, ...a1 }}>
          <Img src={staticFile("logo-apprendre.png")} style={{ height: 300, borderRadius: 30 }} />
        </div>
        <div style={{ marginTop: 60, fontSize: 124, fontWeight: 700, color: C.text, textAlign: "center", lineHeight: 1, ...a2 }}>{title}</div>
        <div style={{ marginTop: 26, fontSize: 44, color: C.gold, textAlign: "center", ...a3 }}>{subtitle}</div>
        <div style={{ marginTop: 22, fontSize: 38, color: C.muted, ...a3 }}>Tablature harmonica · Paul Lassey</div>
        <div style={{ position: "absolute", bottom: 250, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, ...a4 }}>
          <div style={{ fontSize: 32, color: C.muted, letterSpacing: 3 }}>EN PARTENARIAT AVEC</div>
          <Img src={staticFile("logo-brodur.png")} style={{ width: 560 }} />
        </div>
      </div>
    </div>
  );
};

// Fin de la version short : renvoi vers la version longue sur la chaîne YouTube.
export const ShortOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a1 = useAppear(0);
  const a2 = useAppear(10);
  const a3 = useAppear(22);
  const a4 = useAppear(34);
  const out = useFadeOut(15);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ClubBackground t={frame / fps} />
      <div style={{ position: "absolute", inset: 0, opacity: out, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT }}>
        <div style={{ marginTop: 230, ...a1 }}>
          <Img src={staticFile("logo-apprendre.png")} style={{ height: 230, borderRadius: 26 }} />
        </div>
        <div style={{ marginTop: 60, fontSize: 76, fontWeight: 700, color: C.text, textAlign: "center", lineHeight: 1.08, ...a2 }}>
          La version complète
          <br />
          est sur ma chaîne YouTube
        </div>
        <div style={{ marginTop: 26, fontSize: 40, color: C.gold, textAlign: "center", ...a2 }}>3 passages · tablature en entier, et backing track</div>
        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, ...a3 }}>
          <Img src={staticFile("logo-youtube.png")} style={{ width: 150 }} />
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 48,
              color: "#FFFFFF",
              background: "#E0212B",
              borderRadius: 999,
              padding: "16px 44px",
              boxShadow: "0 0 40px rgba(224,33,43,0.55)",
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            youtube.com/@apprendrelharmonica
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 30, ...a4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <Img src={staticFile("logo-brodur.png")} style={{ width: 400 }} />
            <Img src={staticFile("logo-ht.png")} style={{ width: 250 }} />
          </div>
          <div style={{ fontSize: 32, color: C.muted, textAlign: "center" }}>
            www.brodur-harmonica.com · www.harmonicatrainer.com
          </div>
        </div>
      </div>
    </div>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a1 = useAppear(0);
  const a2 = useAppear(12);
  const a3 = useAppear(24);
  const a4 = useAppear(36);
  const out = useFadeOut(20);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ClubBackground t={frame / fps} />
      <div style={{ position: "absolute", inset: 0, opacity: out, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT }}>
        <div style={{ marginTop: 150, display: "flex", alignItems: "center", gap: 28, ...a1 }}>
          <Img src={staticFile("logo-apprendre.png")} style={{ height: 150, borderRadius: 18 }} />
          <div>
            <div style={{ fontSize: 60, fontWeight: 700, color: C.text, lineHeight: 1.05 }}>Paul Lassey</div>
            <div style={{ fontSize: 38, color: C.gold, marginTop: 6 }}>apprendrelharmonica.com</div>
          </div>
        </div>

        <div style={{ marginTop: 130, display: "flex", flexDirection: "column", alignItems: "center", gap: 30, ...a2 }}>
          <div style={{ fontSize: 34, color: C.muted, letterSpacing: 3 }}>MES HARMONICAS</div>
          <Img src={staticFile("logo-brodur.png")} style={{ width: 720 }} />
          <Url text="www.brodur-harmonica.com" />
        </div>

        <div style={{ marginTop: 120, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, ...a3 }}>
          <div style={{ fontSize: 34, color: C.muted, letterSpacing: 3 }}>MON APPLI POUR PROGRESSER</div>
          <Img src={staticFile("logo-ht.png")} style={{ width: 520 }} />
          <Url text="www.harmonicatrainer.com" />
        </div>

        <div style={{ position: "absolute", bottom: 120, fontSize: 36, color: C.text, ...a4 }}>Merci d'avoir joué avec moi !</div>
      </div>
    </div>
  );
};

// ---- Versions 16:9 (1920×1080) ----
export const Intro169: React.FC<{ title: string; subtitle: string; tag?: string }> = ({ title, subtitle, tag }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a1 = useAppear(0);
  const a2 = useAppear(8);
  const a3 = useAppear(16);
  const a4 = useAppear(30);
  const out = useFadeOut(10);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ClubBackground t={frame / fps} w={1920} h={1080} />
      <div style={{ position: "absolute", inset: 0, opacity: out, fontFamily: FONT }}>
        <div style={{ position: "absolute", top: 250, left: 0, width: 1920, display: "flex", justifyContent: "center", alignItems: "center", gap: 60 }}>
          <div style={a1}>
            <Img src={staticFile("logo-apprendre.png")} style={{ height: 340, borderRadius: 34 }} />
          </div>
          <div>
            <div style={{ fontSize: 132, fontWeight: 700, color: C.text, lineHeight: 1, ...a2 }}>{title}</div>
            <div style={{ marginTop: 22, fontSize: 48, color: C.gold, ...a3 }}>{subtitle}</div>
            <div style={{ marginTop: 16, fontSize: 40, color: C.muted, ...a3 }}>Tablature harmonica · Paul Lassey</div>
            {tag && (
              <div style={{ marginTop: 30, display: "flex", ...a3 }}>
                <Url text={tag} />
              </div>
            )}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 90, left: 0, width: 1920, display: "flex", justifyContent: "center", alignItems: "center", gap: 34, ...a4 }}>
          <div style={{ fontSize: 32, color: C.muted, letterSpacing: 3 }}>EN PARTENARIAT AVEC</div>
          <Img src={staticFile("logo-brodur.png")} style={{ width: 460 }} />
        </div>
      </div>
    </div>
  );
};

export const Outro169: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a1 = useAppear(0);
  const a2 = useAppear(12);
  const a3 = useAppear(24);
  const a4 = useAppear(36);
  const out = useFadeOut(20);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ClubBackground t={frame / fps} w={1920} h={1080} />
      <div style={{ position: "absolute", inset: 0, opacity: out, fontFamily: FONT }}>
        <div style={{ position: "absolute", top: 80, left: 0, width: 1920, display: "flex", justifyContent: "center", alignItems: "center", gap: 30, ...a1 }}>
          <Img src={staticFile("logo-apprendre.png")} style={{ height: 150, borderRadius: 18 }} />
          <div>
            <div style={{ fontSize: 64, fontWeight: 700, color: C.text, lineHeight: 1.05 }}>Paul Lassey</div>
            <div style={{ fontSize: 40, color: C.gold, marginTop: 6 }}>apprendrelharmonica.com</div>
          </div>
        </div>
        <div style={{ position: "absolute", top: 330, left: 0, width: 1920, display: "flex", justifyContent: "center", gap: 160 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, ...a2 }}>
            <div style={{ fontSize: 34, color: C.muted, letterSpacing: 3 }}>MES HARMONICAS</div>
            <div style={{ height: 300, display: "flex", alignItems: "center" }}>
              <Img src={staticFile("logo-brodur.png")} style={{ width: 640 }} />
            </div>
            <Url text="www.brodur-harmonica.com" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, ...a3 }}>
            <div style={{ fontSize: 34, color: C.muted, letterSpacing: 3 }}>MON APPLI POUR PROGRESSER</div>
            <div style={{ height: 300, display: "flex", alignItems: "center" }}>
              <Img src={staticFile("logo-ht.png")} style={{ height: 290 }} />
            </div>
            <Url text="www.harmonicatrainer.com" />
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 70, width: 1920, textAlign: "center", fontSize: 38, color: C.text, ...a4 }}>Merci d'avoir joué avec moi !</div>
      </div>
    </div>
  );
};

// Transition 16:9 entre la version avec harmonica et la version backing track
// (demandé par Paul, 2026-09-27 : une seule vidéo longue pour mettre en pratique
// tout de suite). Décompte visuel du backing ensuite assuré par la tablature.
export const Transition169: React.FC<{ title: string; harp: string }> = ({ title, harp }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a1 = useAppear(0);
  const a2 = useAppear(10);
  const a3 = useAppear(22);
  const out = useFadeOut(12);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ClubBackground t={frame / fps} w={1920} h={1080} />
      <div style={{ position: "absolute", inset: 0, opacity: out, fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 44, color: C.muted, letterSpacing: 4, ...a1 }}>{title.toUpperCase()}</div>
        <div style={{ marginTop: 24, fontSize: 140, fontWeight: 700, color: C.text, lineHeight: 1, ...a2 }}>À toi de jouer !</div>
        <div style={{ marginTop: 34, fontSize: 48, color: C.gold, textAlign: "center", ...a3 }}>
          Même tablature, cette fois sur le backing track — sans harmonica
        </div>
        <div style={{ marginTop: 44, ...a3 }}>
          <Url text={`Prends ton harmonica en ${harp}, ça démarre après le décompte`} />
        </div>
      </div>
    </div>
  );
};
