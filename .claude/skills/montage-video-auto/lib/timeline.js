// Étape 4 : spec → timeline précise pour un format donné.
// Règle : tous les calculs en secondes, conversion en frames uniquement à la fin (secToFrame).
import { secToFrame, formatInfo, round3 } from './util.js';

const display = (s) => s.replace(/^[«"(\[]+|[»"),;:]+$/gu, '');


// ---------- Placement du titre ----------

function twoLines(text) {
  const words = String(text).split(/\s+/);
  if (words.length < 2) return [String(text)];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const score = Math.max(...lines.map((l) => l.length));
    if (!best || score < best.score) best = { score, lines };
  }
  return best.lines;
}

/** Part de la personne dans un rectangle de l'image finale (0 = libre, 1 = couvert). */
function personOverlap(rect, occ, map) {
  if (!occ) return 0;
  let sum = 0;
  const cw = map.dispW / occ.cols;
  const ch = map.dispH / occ.rows;
  for (let r = 0; r < occ.rows; r++) for (let c = 0; c < occ.cols; c++) {
    const x0 = map.offX + c * cw;
    const y0 = map.offY + r * ch;
    const ix = Math.max(0, Math.min(rect.x + rect.w, x0 + cw) - Math.max(rect.x, x0));
    const iy = Math.max(0, Math.min(rect.y + rect.h, y0 + ch) - Math.max(rect.y, y0));
    sum += occ.grid[r][c] * ix * iy;
  }
  return sum / Math.max(1, rect.w * rect.h);
}

/** Cherche la position du titre qui laisse lisibles la 2e ligne et l'étiquette (la 1re peut passer un peu derrière la tête). */
export function placeTitle({ text, sub, W, H, occ, map, bands }) {
  const lines = twoLines(text);
  const longest = Math.max(...lines.map((l) => l.length), 4);
  const vertical = H > W;
  if (bands) {
    // Vidéo verticale en 16:9 : titre dans la bande de gauche, à côté de la personne.
    const bw = (bands.left[1] - bands.left[0]) * W;
    const size = Math.min(H * 0.13, (bw * 0.88) / (longest * 0.6));
    return { lines, size: Math.round(size), align: 'left', top: 0.3, left: Math.round(bands.left[0] * W + bw * 0.06), width: Math.round(bw * 0.88), overlap: 0 };
  }
  const base = Math.min(H * (vertical ? 0.1 : 0.2), (W * 0.92) / (longest * 0.6));
  let best = null;
  for (const scale of [1, 0.86, 0.74]) {
    const size = base * scale;
    for (const top of vertical ? [0.025, 0.045, 0.07, 0.1] : [0.06, 0.12, 0.2]) {
      for (const align of ['center', 'right', 'left']) {
        const rects = lines.map((l, i) => {
          const w = l.length * 0.6 * size;
          const x = align === 'center' ? (W - w) / 2 : align === 'right' ? W * 0.96 - w : W * 0.04;
          return { x, y: H * top + i * size * 0.98, w, h: size * 0.98 };
        });
        const last = rects[rects.length - 1];
        let score = 0.35 * personOverlap(rects[0], occ, map) + (rects.length > 1 ? personOverlap(last, occ, map) : 0);
        if (sub) {
          const sw = sub.length * 0.58 * size * 0.24 + size * 0.32;
          const sx = align === 'center' ? (W - sw) / 2 : align === 'right' ? W * 0.96 - sw : W * 0.04;
          score += 1.5 * personOverlap({ x: sx, y: last.y + last.h + size * 0.18, w: sw, h: size * 0.4 }, occ, map);
        }
        score += (1 - scale) * 0.25 + top * 0.3 + (align === 'center' ? 0 : 0.04);
        if (!best || score < best.score) best = { score, size, top, align };
      }
    }
  }
  return { lines, size: Math.round(best.size), align: best.align, top: best.top, left: null, width: null, overlap: Math.round(best.score * 100) / 100 };
}

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
    .map((e) => ({
      ...e,
      from: F(e.start),
      to: Math.max(F(e.end), F(e.start) + 1),
      // Tablature : notes en frames, relatives au début de l'élément.
      ...(e.notes ? { notes: e.notes.map((n) => ({ tab: n.tab, name: n.name, from: F(n.start) - F(e.start), to: F(n.end) - F(e.start) })) } : {}),
    }));
  const zooms = spec.elements
    .filter((e) => e.type === 'zoom')
    .map((e) => ({ from: F(e.start), to: F(e.end), scale: e.scale, slow: Boolean(e.slow) }));

  // Cadrage : « cover » remplit le cadre, « contain » garde l'image entière (source verticale en 16:9).
  const fit = Math.abs(Math.log((assets.srcWidth / assets.srcHeight) / (f.width / f.height))) > 0.35 ? 'contain' : 'cover';
  const s = fit === 'cover' ? Math.max(f.width / assets.srcWidth, f.height / assets.srcHeight) : Math.min(f.width / assets.srcWidth, f.height / assets.srcHeight);
  const map = { dispW: assets.srcWidth * s, dispH: assets.srcHeight * s };
  map.offX = (f.width - map.dispW) * (fit === 'cover' ? cfg.render.focusX : 0.5);
  map.offY = (f.height - map.dispH) / 2;
  // Bandes libres de chaque côté quand une vidéo verticale est posée dans un cadre 16:9.
  const bands = fit === 'contain' && f.width > f.height && map.offX > f.width * 0.15
    ? { left: [0, map.offX / f.width], right: [(map.offX + map.dispW) / f.width, 1] }
    : null;
  for (const e of elements) {
    if (e.type === 'titleBehind') e.place = placeTitle({ text: e.text, sub: e.sub, W: f.width, H: f.height, occ: assets.occupation, map, bands });
  }

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
      fit,
    },
    brand: { ...cfg.brand, logo: assets.logo },
    subtitles,
    elements,
    zooms,
    harmonica: spec.harmonica.map((h) => ({ from: F(h.start), to: F(h.end) })),
    mode: spec.mode ?? 'parole',
    layout: {
      subtitleBottom: fmt === '9:16' ? 0.24 : 0.07,
      subtitleSize: fmt === '9:16' ? 64 : 54,
      maxChars,
      bands,
    },
  };
}
