// Étape 3 : description de la vidéo à partir de la transcription.
// Scènes, textes à l'écran, mots mis en valeur, zooms, transitions, ambiance musicale par séquence.
// Le fichier 03_spec.json est lisible et modifiable : l'agent peut l'ajuster puis relancer --depuis timeline.
import { round3 } from './util.js';

const STOP = new Set(`a à au aux avec ce ces cet cette ça dans de des du elle en et eux il ils je j la le les leur lui ma mais me même mes moi mon ne nos notre nous on ou où par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d l m n s t y est sont été être avoir ai as avez ont fait faire va vais vas allez bon bien alors donc voilà oui non très tout tous toute toutes plus moins comme si ici là quand aussi encore déjà puis peu cela celui celle ceux ceci quoi dont chez entre vers sans sous rien juste vraiment hein euh bah ben`.split(/\s+/));

// Vocabulaire harmonica : mots mis en valeur en priorité.
const LEXIQUE = new Set(`harmonica harmo diatonique chromatique trou trous souffle soufflé soufflée aspire aspiré aspirée aspiration expiration bend bends overblow overbend blues gamme gammes accord accords tonalité note notes vibrato trémolo tremolo langue blocking tongue lèvres pucker respiration souffler aspirer riff riffs improvisation impro tablature tablatures tab tabs rythme train shuffle groove clé tonalités mineur majeur pentatonique position cross straight lee oskar hohner suzuki marine band special seydel octave octaves glissando slide wah exercice exercices morceau morceaux backing technique astuce secret débutant débutants`.split(/\s+/));

const MOODS = {
  enquete: `pourquoi comment secret secrets mystère question questions découvrir découvre astuce erreur erreurs problème problèmes vérité piège pièges comprendre savoir caché cachée enquête réponse`.split(/\s+/),
  profond: `émotion émotions ressentir ressens sentiment lent lente blues triste âme histoire respirer respiration calme doux douce profond profonde silence écouter intérieur cœur mélancolie nostalgie`.split(/\s+/),
  fun: `génial super rigolo facile jouer joue fun cool allez top marrant rapide fête bravo yes énorme incroyable partez`.split(/\s+/),
};

const clean = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, '').replace(/^[ldjmnstcqu]['’]/u, '');
const display = (s) => s.replace(/^[«"(\[]+|[»"),.;:!?…\]]+$/gu, '');
const endsSentence = (s) => /[.!?…]["»)]*$/u.test(s);

export function detectHarmonica(words, events, duration, minGap) {
  const segs = [];
  const playEvent = /harmonica|musique|music|instrument|melod|mélod|blues|jou/i;
  for (const e of events ?? []) if (playEvent.test(e.text)) segs.push({ start: e.start, end: e.end, source: 'événement' });
  // Après coupe des silences, un long passage sans mot est du jeu (harmonica, son).
  let prev = 0;
  for (const w of [...words, { start: duration, end: duration }]) {
    if (w.start - prev >= minGap) segs.push({ start: round3(prev + 0.1), end: round3(w.start - 0.1), source: 'sans parole' });
    prev = Math.max(prev, w.end);
  }
  segs.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end + 0.3) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  return merged.filter((s) => s.end - s.start >= 0.8);
}

function buildPhrases(words, harmonica, { maxWordsPerPhrase, phraseGap }) {
  const phrases = [];
  let cur = [];
  const inHarmonica = (t) => harmonica.some((h) => t > h.start && t < h.end);
  const flush = () => { if (cur.length) phrases.push(cur); cur = []; };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (prev && (w.start - prev.end > phraseGap || inHarmonica((prev.end + w.start) / 2))) flush();
    cur.push(i);
    if (endsSentence(w.text) || cur.length >= maxWordsPerPhrase) flush();
  });
  flush();
  return phrases.map((idx, id) => ({
    id,
    start: words[idx[0]].start,
    end: words[idx[idx.length - 1]].end,
    words: idx,
    text: idx.map((i) => words[i].text).join(' '),
  }));
}

function scoreWord(w, userKeywords) {
  const c = clean(w.text);
  if (!c || STOP.has(c) || c.length < 3) return 0;
  let s = 0;
  if (userKeywords.has(c)) s += 6;
  if (LEXIQUE.has(c)) s += 4;
  if (/\d/.test(c)) s += 2;
  if (/!$/.test(w.text)) s += 1;
  if (c.length >= 7) s += 1;
  return s;
}

function moodOf(text, fallback) {
  const t = ` ${text.toLowerCase()} `;
  let best = fallback;
  let bestScore = 0;
  for (const [mood, list] of Object.entries(MOODS)) {
    const s = list.reduce((n, w) => n + (t.includes(` ${w}`) ? 1 : 0), 0) + (mood === 'enquete' ? (t.match(/\?/g) ?? []).length : 0);
    if (s > bestScore) { best = mood; bestScore = s; }
  }
  return best;
}

export function buildSpec({ words, events = [], duration, cfg, title }) {
  const sp = cfg.spec;
  const harmonica = detectHarmonica(words, events, duration, sp.harmonicaMinGap);
  const phrases = buildPhrases(words, harmonica, sp);
  const userKeywords = new Set((sp.keywords ?? []).map(clean));

  // Un mot mis en valeur par phrase au plus, et pas plus d'un toutes les 3,5 s.
  let lastKw = -10;
  for (const p of phrases) {
    let best = null;
    for (const i of p.words) {
      const s = scoreWord(words[i], userKeywords);
      if (s >= 4 && (!best || s > best.score)) best = { i, score: s };
    }
    if (best && words[best.i].start - lastKw >= 3.5) {
      const w = words[best.i];
      p.keyword = { word: best.i, text: display(w.text), start: w.start, end: w.end };
      lastKw = w.start;
    } else p.keyword = null;
  }

  // Scènes : coupure aux longues pauses, au jeu d'harmonica ou quand la scène devient longue.
  const scenes = [];
  let cur = null;
  phrases.forEach((p, i) => {
    const prev = phrases[i - 1];
    const gap = prev ? p.start - prev.end : 0;
    const playBetween = prev && harmonica.some((h) => h.start >= prev.end - 0.2 && h.end <= p.start + 0.2);
    const long = cur && p.end - cur.start > sp.sceneMaxSeconds;
    const sentenceBreak = cur && prev && endsSentence(prev.text) && p.start - cur.start > sp.sceneMaxSeconds * 0.55;
    if (!cur || gap > 0.9 || playBetween || long || sentenceBreak) {
      cur = { id: scenes.length, start: scenes.length ? (prev.end + p.start) / 2 : 0, phrases: [] };
      if (scenes.length) scenes[scenes.length - 1].end = cur.start;
      scenes.push(cur);
    }
    cur.phrases.push(p.id);
  });
  if (!scenes.length) scenes.push({ id: 0, start: 0, phrases: [] });
  scenes[scenes.length - 1].end = duration;
  for (const s of scenes) {
    s.start = round3(s.start);
    s.end = round3(s.end);
    s.mood = moodOf(s.phrases.map((id) => phrases[id].text).join(' '), sp.defaultMood);
  }

  // Séquences musicales : une ambiance par séquence, au moins 12 s.
  const music = [];
  for (const s of scenes) {
    const last = music[music.length - 1];
    if (last && (last.mood === s.mood || s.end - s.start < 6 || last.end - last.start < 12)) last.end = s.end;
    else music.push({ start: s.start, end: s.end, mood: s.mood });
  }

  // Éléments à l'écran.
  const elements = [];
  const sfx = [];
  const kwTexts = phrases.filter((p) => p.keyword).map((p) => p.keyword.text);
  const videoTitle = title || sp.title || (kwTexts[0] ?? '').toUpperCase() || cfg.brand.name;
  const firstEnd = scenes[0].end;
  elements.push({ type: 'titleBehind', start: 0.2, end: round3(Math.min(3.6, Math.max(1.5, firstEnd - 0.2))), text: videoTitle });
  sfx.push({ type: 'whoosh', at: 0.05 });
  if (duration > 10) elements.push({ type: 'lowerThird', start: 0.6, end: round3(Math.min(5, duration - 1)) });

  // Pas de mot-clé pendant l'ouverture (titre + bandeau) ni pendant l'appel à l'action final.
  const busy = elements.filter((e) => e.type === 'titleBehind' || e.type === 'lowerThird');
  const ctaStart = duration > 12 ? duration - 3.5 : duration;
  for (const p of phrases) {
    if (!p.keyword) continue;
    const k = p.keyword;
    if (busy.some((b) => k.start < b.end + 0.2) || k.start + 1.6 > ctaStart) { p.keyword = null; continue; }
    const end = round3(Math.min(Math.max(k.start + 1.6, p.end), k.start + 2.6, duration));
    elements.push({ type: 'keyword', start: k.start, end, text: k.text, side: elements.filter((e) => e.type === 'keyword').length % 2 ? 'right' : 'left' });
    elements.push({ type: 'zoom', start: k.start, end, scale: 1 + cfg.render.zoomStrength });
    sfx.push({ type: 'pop', at: round3(k.start) });
  }

  scenes.slice(1).forEach((s) => {
    elements.push({ type: 'transition', start: round3(Math.max(0, s.start - 0.2)), end: round3(s.start + 0.25) });
    sfx.push({ type: 'whoosh', at: round3(Math.max(0, s.start - 0.3)) });
  });

  for (const h of harmonica) {
    elements.push({ type: 'harmonicaBadge', start: h.start, end: h.end, text: '♪ À l’harmonica' });
    elements.push({ type: 'zoom', start: h.start, end: h.end, scale: 1 + cfg.render.zoomStrength * 0.6, slow: true });
  }

  if (duration > 12) {
    const st = round3(duration - 3.5);
    elements.push({ type: 'cta', start: st, end: duration, line1: cfg.brand.cta.line1, line2: cfg.brand.cta.line2 });
    sfx.push({ type: 'click', at: round3(st + 0.15) });
  }

  // Les zooms ne se chevauchent pas : on garde le premier.
  const zooms = elements.filter((e) => e.type === 'zoom').sort((a, b) => a.start - b.start);
  let zEnd = -1;
  const kept = new Set();
  for (const z of zooms) if (z.start >= zEnd) { kept.add(z); zEnd = z.end; }
  const finalElements = elements.filter((e) => e.type !== 'zoom' || kept.has(e)).sort((a, b) => a.start - b.start);

  return {
    version: 1,
    duration: round3(duration),
    title: videoTitle,
    words,
    events,
    harmonica,
    phrases,
    scenes,
    music,
    elements: finalElements,
    sfx: sfx.sort((a, b) => a.at - b.at),
  };
}
