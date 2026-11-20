import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TabPage } from "./TabImage";
import { PAGES as IMAGE_PAGES, TITLE } from "./data";
import { EVENTS, ITEMS, PRISES } from "./videoData";

// Vidéo 16:9 d'un exercice joué en plusieurs prises, avec des parties parlées entre elles.
// Mise en page du modèle (TabPage) ; seule la logique de temps change :
// - pendant une prise, la note jouée s'allume (calage mesuré, voir work/caler_prises.py) ;
// - pendant la parole, tablature au repos et pastille « Explications » ;
// - pas de décompte (ces audios n'en ont pas).
const pageOfMeasure = (m: number) => IMAGE_PAGES.findIndex((lines) => lines.flat().includes(m));

const activeEventAt = (t: number) => {
  if (t < EVENTS[0].t) return -1;
  let lo = 0;
  let hi = EVENTS.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (EVENTS[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

// fin de chaque prise = fin de sa dernière note
const finPrise = PRISES.map((_, p) => {
  const ev = EVENTS.filter((e) => e.p === p);
  const der = ev[ev.length - 1];
  return der.t + der.d;
});
const debutPrise = PRISES.map((_, p) => EVENTS.find((e) => e.p === p)!.t);

export const VideoTab169Prises: React.FC<{ sousTitre: string }> = ({ sousTitre }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const e = activeEventAt(t);
  const ev = e >= 0 ? EVENTS[e] : null;
  const dansPrise = ev !== null && t <= finPrise[ev.p] + 0.15;
  const activeIdx = dansPrise && ev ? ev.i : -1;
  // page : celle de la note jouée ; pendant la parole, la première page de la prise suivante
  const prochaine = debutPrise.findIndex((d) => d > t);
  const page = dansPrise && ev
    ? pageOfMeasure(ITEMS[ev.i].measure)
    : prochaine >= 0
      ? 0
      : IMAGE_PAGES.length - 1;
  const glow = dansPrise && ev ? Math.max(0, 1 - (t - ev.t) / 0.35) : 0;

  const N = PRISES.length;
  const pills: { text: string; strong?: boolean }[] = [];
  if (dansPrise && ev) {
    const pr = PRISES[ev.p];
    if (N > 1) pills.push({ text: `Prise ${ev.p + 1}/${N}`, strong: true });
    pills.push({ text: pr.nom.includes("BPM") ? pr.nom : `${pr.nom} · ${Math.round(pr.bpm)} BPM`, strong: false });
    if (IMAGE_PAGES.length > 1) pills.push({ text: `Page ${page + 1}/${IMAGE_PAGES.length}`, strong: false });
  } else {
    pills.push({ text: "Explications", strong: true });
  }

  // carton de titre au début de l'exercice
  const titreO = interpolate(t, [0, 0.4, 2.6, 3.2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titreS = interpolate(t, [0, 0.5], [0.96, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <TabPage page={page} t={t} activeIdx={activeIdx} glow={glow} pills={pills} />
      {titreO > 0.001 && (
        <AbsoluteFill style={{ background: `rgba(10,13,22,${0.96 * titreO})`, alignItems: "center", justifyContent: "center" }}>
          <div style={{ opacity: titreO, transform: `scale(${titreS})`, textAlign: "center", fontFamily: "Carlito" }}>
            <div style={{ fontSize: 40, letterSpacing: 8, color: "#F3D27A", fontWeight: 700 }}>LES AUTOMATISMES</div>
            <div style={{ fontSize: 150, fontWeight: 700, color: "#F5F5F5", lineHeight: 1.05 }}>{TITLE}</div>
            <div style={{ fontSize: 44, color: "#8A8F9C", marginTop: 10 }}>{sousTitre}</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
