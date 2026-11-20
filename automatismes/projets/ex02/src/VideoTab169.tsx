import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { TabPage } from "./TabImage";
import { PAGES as IMAGE_PAGES } from "./data";
import { EVENTS, ITEMS, PASSES, COUNTIN_END, BEAT } from "./videoData";

// Vidéo 16:9 : la mise en page des images validées (2 lignes par page, contour
// sous chaque ligne), avec la note active allumée. Les index d'ITEMS et de
// NOTES (data.ts) sont identiques : tous deux suivent l'ordre de tab.json.
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

// backing : même tablature calée sur un backing track (sans harmonica) décalé de
// `offsetBeats` temps (décompte plus long) ; pastille « Backing track », « Fin »
// une fois la dernière note passée pendant que le backing résonne.
export const VideoTab169: React.FC<{ backing?: boolean; offsetBeats?: number }> = ({ backing, offsetBeats = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tRaw = frame / fps;
  const t = tRaw - offsetBeats * BEAT;
  const last = EVENTS[EVENTS.length - 1];
  const ended = t > last.t + last.d;
  const e = ended ? -1 : activeEventAt(t);
  const ev = e >= 0 ? EVENTS[e] : null;
  const activeIdx = ev ? ev.i : -1;
  const page = ended ? IMAGE_PAGES.length - 1 : ev ? pageOfMeasure(ITEMS[ev.i].measure) : 0;
  const glow = ev ? Math.max(0, 1 - (t - ev.t) / 0.35) : 0;
  const count = t < COUNTIN_END ? Math.floor(tRaw / BEAT) + 1 : 0;
  const tag = backing ? [{ text: "Backing track", strong: true }] : [];
  const pills = ended
    ? [...tag, { text: "Fin" }]
    : count
      ? [...tag, { text: `Décompte ${count}`, strong: !backing }]
      : [
          ...tag,
          { text: `Page ${page + 1}/${IMAGE_PAGES.length}` },
          ...(PASSES > 1 ? [{ text: `Passage ${(ev?.p ?? 0) + 1}/${PASSES}`, strong: !backing }] : []),
        ];
  return <TabPage page={page} t={tRaw} activeIdx={activeIdx} glow={glow} pills={pills} />;
};
