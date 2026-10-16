// Étape 4 : spec → timeline précise pour un format donné.
// Règle : tous les calculs en secondes, conversion en frames uniquement à la fin (secToFrame).
import { secToFrame, formatInfo, round3 } from './util.js';

const display = (s) => s.replace(/^[«"(\[]+|[»"),;:]+$/gu, '');

/** Découpe une phrase en blocs de sous-titres (1 ou 2 lignes), mot à mot horodatés. */
export function chunkPhrase(phrase, words, { maxChars, maxLines }) {
  const chunks = [];
  let lines = [[]];
  let lineLen = 0;
  const pushChunk = () => {
    const filled = lines.filter((l) => l.length);
    if (filled.length) chunks.push(filled);
    lines = [[]];
    lineLen = 0;
  };
  for (const i of phrase.words) {
    const w = words[i];
    const len = w.text.length + (lineLen ? 1 : 0);
    if (lineLen && lineLen + len > maxChars) {
      if (lines.length >= maxLines) pushChunk();
      else { lines.push([]); lineLen = 0; }
    }
    lines[lines.length - 1].push(i);
    lineLen += w.text.length + (lineLen ? 1 : 0);
  }
  pushChunk();
  return chunks;
}

export function buildTimeline(spec, fmt, cfg, assets) {
  const fps = cfg.fps;
  const F = (s) => secToFrame(s, fps);
  const f = formatInfo(fmt);
  const sub = cfg.subtitles;
  const maxChars = sub.maxCharsPerLine[fmt] ?? 30;
  const kwWords = new Set(spec.phrases.filter((p) => p.keyword).map((p) => p.keyword.word));
  const durationSec = spec.duration;

  // 1) Sous-titres en secondes.
  const subsSec = [];
  spec.phrases.forEach((p, pi) => {
    const nextPhraseStart = spec.phrases[pi + 1]?.start ?? durationSec;
    const chunks = chunkPhrase(p, spec.words, { maxChars, maxLines: sub.maxLines });
    chunks.forEach((lines, ci) => {
      const ids = lines.flat();
      const start = spec.words[ids[0]].start;
      const nextChunk = chunks[ci + 1];
      let end = nextChunk ? spec.words[nextChunk[0][0]].start : Math.min(p.end + 0.35, nextPhraseStart);
      end = Math.max(end, Math.min(start + sub.minDuration, nextChunk ? end : nextPhraseStart));
      const text = ids.map((i) => spec.words[i].text).join(' ');
      subsSec.push({
        start, end, text,
        cps: round3(text.length / Math.max(0.1, end - start)),
        lines: lines.map((l) => l.map((i) => ({
          t: display(sub.uppercase ? spec.words[i].text.toUpperCase() : spec.words[i].text),
          start: spec.words[i].start,
          end: spec.words[i].end,
          key: kwWords.has(i),
        }))),
      });
    });
  });
  // Pas de chevauchement.
  for (let i = 0; i < subsSec.length - 1; i++) subsSec[i].end = Math.min(subsSec[i].end, subsSec[i + 1].start);

  // 2) Conversion en frames.
  const subtitles = subsSec.map((s) => ({
    from: F(s.start),
    to: Math.max(F(s.end), F(s.start) + 1),
    text: s.text,
    cps: s.cps,
    lines: s.lines.map((l) => l.map((w) => ({ t: w.t, from: F(w.start), to: F(w.end), key: w.key }))),
  }));

  const elements = spec.elements
    .filter((e) => e.type !== 'zoom')
    .map((e) => ({ ...e, from: F(e.start), to: Math.max(F(e.end), F(e.start) + 1) }));
  const zooms = spec.elements
    .filter((e) => e.type === 'zoom')
    .map((e) => ({ from: F(e.start), to: F(e.end), scale: e.scale, slow: Boolean(e.slow) }));

  const needsMatte = elements.some((e) => e.type === 'titleBehind');
  return {
    format: fmt,
    fps,
    width: f.width,
    height: f.height,
    durationInFrames: F(durationSec),
    durationSec,
    title: spec.title,
    video: {
      src: '01_cut.mp4',
      fg: needsMatte && assets.matte ? assets.matte : null,
      srcWidth: assets.srcWidth,
      srcHeight: assets.srcHeight,
      focusX: cfg.render.focusX,
    },
    brand: { ...cfg.brand, logo: assets.logo },
    subtitles,
    elements,
    zooms,
    harmonica: spec.harmonica.map((h) => ({ from: F(h.start), to: F(h.end) })),
    layout: {
      subtitleBottom: fmt === '9:16' ? 0.24 : 0.07,
      subtitleSize: fmt === '9:16' ? 64 : 54,
      maxChars,
    },
  };
}
