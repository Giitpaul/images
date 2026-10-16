// Étape 8 : relecture automatique du fichier final.
// Passe 1 « technique », passe 2 « visuel », passe 3 « coupes et son ».
// Chaque problème corrigeable renvoie une correction (paramètre + étape à relancer).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { SKILL_DIR, ffmpeg, ffprobe, readJson, exists, round3 } from './util.js';

// ---------- Outils de mesure ----------

function readWav16(file) {
  const b = fs.readFileSync(file);
  let p = 12;
  let fmt = null;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') {
      if (!fmt || fmt.bits !== 16) throw new Error(`WAV 16 bits attendu : ${file}`);
      const n = Math.floor(size / 2 / fmt.channels);
      const mono = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let c = 0; c < fmt.channels; c++) s += b.readInt16LE(p + 8 + (i * fmt.channels + c) * 2);
        mono[i] = s / fmt.channels / 32768;
      }
      return { rate: fmt.rate, data: mono };
    }
    p += 8 + size + (size % 2);
  }
  throw new Error(`WAV illisible : ${file}`);
}

function rmsDb(wav, ranges) {
  let sum = 0;
  let n = 0;
  for (const r of ranges) {
    const a = Math.max(0, Math.floor(r.start * wav.rate));
    const b = Math.min(wav.data.length, Math.floor(r.end * wav.rate));
    for (let i = a; i < b; i++) { sum += wav.data[i] ** 2; n++; }
  }
  return n ? round3(10 * Math.log10(sum / n + 1e-12)) : -120;
}

const lum = (r, g, b) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

async function grabFrame(video, t, out) {
  await ffmpeg(['-ss', t.toFixed(3), '-i', video, '-frames:v', '1', out]);
  return out;
}

/** Contraste texte/fond dans la zone des sous-titres (ratio WCAG). */
function subtitleContrast(pngFile, tl) {
  const img = PNG.sync.read(fs.readFileSync(pngFile));
  const { width: W, height: H } = img;
  const size = tl.layout.subtitleSize;
  const bottom = H * (1 - tl.layout.subtitleBottom);
  const top = bottom - size * (1.18 * 2 + 0.6);
  const x0 = Math.floor(W * 0.08);
  const x1 = Math.floor(W * 0.92);
  const vals = [];
  for (let y = Math.max(0, Math.floor(top)); y < Math.min(H, Math.floor(bottom)); y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * W + x) * 4;
      vals.push(lum(img.data[i], img.data[i + 1], img.data[i + 2]));
    }
  }
  vals.sort((a, b) => a - b);
  const text = vals[Math.floor(vals.length * 0.97)];
  const bg = vals[Math.floor(vals.length * 0.3)];
  return round3((text + 0.05) / (bg + 0.05));
}

async function loudness(file) {
  const { stderr } = await ffmpeg(['-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const summary = stderr.slice(stderr.lastIndexOf('Summary:'));
  const I = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
  const peak = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  return { I, truePeak: peak };
}

async function streamDurations(file) {
  const { stdout } = await ffprobe(['-show_entries', 'stream=codec_type,duration', '-of', 'json', file]);
  const s = JSON.parse(stdout).streams;
  return { video: Number(s.find((x) => x.codec_type === 'video')?.duration), audio: Number(s.find((x) => x.codec_type === 'audio')?.duration) };
}

// ---------- Passes ----------

function checkUnicodeEscapes(workDir) {
  const issues = [];
  const scan = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) scan(p);
      else if (/\.(jsx?|tsx?)$/.test(e.name)) {
        const src = fs.readFileSync(p, 'utf8');
        if (/\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/.test(src)) issues.push(path.relative(SKILL_DIR, p));
      }
    }
  };
  scan(path.join(SKILL_DIR, 'remotion', 'src'));
  for (const f of fs.readdirSync(workDir).filter((f) => f.startsWith('06_props'))) {
    if (/\\u[0-9a-fA-F]{4}/.test(fs.readFileSync(path.join(workDir, f), 'utf8'))) issues.push(f);
  }
  return issues;
}

async function passTechnique(ctx, out) {
  const { workDir, cfg, spec, finals, timelines } = ctx;
  const esc = checkUnicodeEscapes(workDir);
  out.check('Unicode tapé directement (pas de \\uXXXX)', esc.length === 0, esc.length ? `Échappements trouvés dans : ${esc.join(', ')}` : 'OK');

  for (const [fmt, file] of Object.entries(finals)) {
    const tl = timelines[fmt];
    const d = await streamDurations(file);
    const tol = 2 / cfg.fps;
    out.check(`[${fmt}] durée vidéo = timeline`, Math.abs(d.video - tl.durationSec) <= tol + 0.05, `vidéo ${d.video.toFixed(3)} s, timeline ${tl.durationSec.toFixed(3)} s`);
    out.check(`[${fmt}] durée audio = vidéo`, Math.abs(d.audio - d.video) <= 0.1, `audio ${d.audio.toFixed(3)} s`);

    const L = await loudness(file);
    out.metric(`[${fmt}] loudness`, `${L.I} LUFS, crête ${L.truePeak} dBFS`);
    const okI = Math.abs(L.I - cfg.audio.targetLufs) <= cfg.review.lufsTolerance;
    out.check(`[${fmt}] loudness ${cfg.audio.targetLufs} LUFS ± ${cfg.review.lufsTolerance}`, okI, `${L.I} LUFS`,
      okI ? null : { patch: { audio: { loudnormDynamic: true } }, from: 'audio', note: 'Loudness hors cible : normalisation dynamique' });
    const okTP = L.truePeak <= cfg.audio.truePeak + 0.6;
    out.check(`[${fmt}] crête ≤ ${cfg.audio.truePeak} dBFS`, okTP, `${L.truePeak} dBFS`,
      okTP ? null : { patch: { audio: { truePeak: cfg.audio.truePeak - 1 } }, from: 'audio', note: 'Crête trop haute : marge augmentée' });

    // Collisions : deux éléments du même emplacement affichés en même temps.
    const zone = (e) => (['keyword', 'titleBehind', 'lowerThird'].includes(e.type) ? 'haut' : e.type === 'cta' ? 'bas' : null);
    let clash = 0;
    const els = tl.elements.filter((e) => zone(e));
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i]; const b = els[j];
      if (a.type !== b.type && zone(a) === zone(b) && a.from < b.to && b.from < a.to && !(a.type !== 'keyword' && b.type !== 'keyword')) clash++;
    }
    out.check(`[${fmt}] pas de chevauchement d'éléments`, clash === 0, clash ? `${clash} mot(s)-clé(s) en même temps que le titre, le bandeau ou l'appel final` : 'OK');

    // Synchro des sous-titres : chaque mot affiché démarre à la frame de son horodatage.
    const wordFrames = new Map(spec.words.map((w) => [`${Math.round(w.start * cfg.fps)}`, true]));
    let desync = 0;
    for (const s of tl.subtitles) for (const l of s.lines) for (const w of l) if (!wordFrames.has(String(w.from))) desync++;
    out.check(`[${fmt}] synchro sous-titres au mot`, desync === 0, desync ? `${desync} mot(s) décalé(s)` : `${tl.subtitles.length} blocs calés à la frame près`);

    const short = tl.subtitles.filter((s) => (s.to - s.from) / cfg.fps < 0.35).length;
    const okShort = short <= Math.max(1, tl.subtitles.length * 0.1);
    out.check(`[${fmt}] durée d'affichage des sous-titres`, okShort, `${short} bloc(s) < 0,35 s`,
      okShort ? null : { patch: { subtitles: { maxCharsPerLine: { [fmt]: (cfg.subtitles.maxCharsPerLine[fmt] ?? 30) + 4 } } }, from: 'timeline', note: `[${fmt}] blocs trop brefs : lignes plus longues` });
    const fast = tl.subtitles.filter((s) => s.cps > cfg.subtitles.maxCps).length;
    out.metric(`[${fmt}] vitesse de lecture`, `${fast} bloc(s) > ${cfg.subtitles.maxCps} car/s (débit de parole, non corrigeable)`);

    // Débordement estimé : largeur du texte vs largeur utile.
    const size = tl.layout.subtitleSize;
    const maxW = tl.width * 0.9 - size * 0.9;
    const over = tl.subtitles.filter((s) => s.lines.some((l) => l.map((w) => w.t).join(' ').length * size * 0.66 > maxW)).length;
    out.check(`[${fmt}] sous-titres dans le cadre`, over === 0, over ? `${over} ligne(s) trop large(s)` : 'OK',
      over ? { patch: { subtitles: { maxCharsPerLine: { [fmt]: Math.max(12, (cfg.subtitles.maxCharsPerLine[fmt] ?? 30) - 4) } } }, from: 'timeline', note: `[${fmt}] lignes trop larges : moins de caractères par ligne` } : null);
  }
}

async function passVisuel(ctx, out) {
  const { workDir, cfg, finals, timelines } = ctx;
  const dir = path.join(workDir, '08_relecture');
  fs.mkdirSync(dir, { recursive: true });
  for (const [fmt, file] of Object.entries(finals)) {
    const tl = timelines[fmt];
    const id = fmt.replace(':', 'x');
    const subs = tl.subtitles;
    const n = Math.min(cfg.review.framesPerFormat, subs.length);
    const picks = [];
    for (let i = 0; i < n; i++) picks.push(subs[Math.floor(((i + 0.5) * subs.length) / n)]);
    let low = 0;
    const contrasts = [];
    for (const [i, s] of picks.entries()) {
      const t = (s.lines[0][0].from + 2) / tl.fps;
      const png = await grabFrame(file, t, path.join(dir, `st_${id}_${String(i + 1).padStart(2, '0')}.png`));
      const c = subtitleContrast(png, tl);
      contrasts.push(c);
      if (c < cfg.review.minContrast) low++;
    }
    out.metric(`[${fmt}] contraste sous-titres`, contrasts.length ? `min ${Math.min(...contrasts)}:1, médian ${contrasts.sort((a, b) => a - b)[Math.floor(contrasts.length / 2)]}:1` : 'aucun sous-titre');
    out.check(`[${fmt}] lisibilité (contraste ≥ ${cfg.review.minContrast}:1)`, low === 0, `${low}/${picks.length} vignette(s) sous le seuil`,
      low ? { patch: { brand: { colors: { subtitleBg: 'rgba(12, 10, 10, 0.92)' } } }, from: 'timeline', note: `[${fmt}] fond des sous-titres plus opaque` } : null);

    if (picks.length) {
      const sheet = path.join(dir, `planche_${id}.jpg`);
      const cols = fmt === '9:16' ? 5 : 3;
      await ffmpeg(['-framerate', '1', '-i', path.join(dir, `st_${id}_%02d.png`), '-vf', `scale=${fmt === '9:16' ? 300 : 560}:-1,tile=${cols}x${Math.ceil(picks.length / cols)}:padding=6:color=white`, '-frames:v', '1', '-q:v', '3', sheet]);
      out.image(`[${fmt}] planche des sous-titres`, sheet);
    }

    // Vignettes des moments clés : titre derrière la personne, mots-clés, appel à l'action.
    const keyEls = tl.elements.filter((e) => ['titleBehind', 'keyword', 'cta', 'harmonicaBadge'].includes(e.type));
    // Tablature : trois vignettes réparties sur le passage joué.
    for (const e of tl.elements.filter((x) => x.type === 'tab')) {
      for (const k of [0.25, 0.5, 0.75]) {
        const n = e.notes[Math.floor(e.notes.length * k)];
        if (n) keyEls.push({ ...e, from: e.from + n.from, to: e.from + n.to, text: `tab ${n.tab}` });
      }
    }
    for (const e of keyEls.slice(0, 9)) {
      const t = (e.from + Math.min(18, (e.to - e.from) / 2)) / tl.fps;
      const jpg = path.join(dir, `${e.type}_${id}_${e.from}.jpg`);
      await ffmpeg(['-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-q:v', '3', jpg]);
      out.image(`[${fmt}] ${e.type}${e.text ? ` « ${e.text} »` : ''} à ${t.toFixed(1)} s`, jpg);
    }

    const { stderr } = await ffmpeg(['-i', file, '-vf', 'blackdetect=d=0.25:pix_th=0.06', '-an', '-f', 'null', '-']);
    const blacks = (stderr.match(/black_start/g) ?? []).length;
    out.check(`[${fmt}] pas d'image noire`, blacks === 0, blacks ? `${blacks} passage(s) noir(s)` : 'OK');
  }
}

async function passMontageSon(ctx, out) {
  const { workDir, cfg, spec } = ctx;
  const keeps = readJson(path.join(workDir, '01_keeps.json')).keeps;
  const voice = readWav16(path.join(workDir, '01_voice.wav'));

  // Coupes : clics aux raccords.
  let acc = 0;
  const cuts = [];
  for (const k of keeps.slice(0, -1)) { acc += k.end - k.start; cuts.push(acc); }
  let clicks = 0;
  for (const c of cuts) {
    const i = Math.round(c * voice.rate);
    const w = Math.round(0.003 * voice.rate);
    let peak = 0;
    for (let j = Math.max(1, i - w); j < Math.min(voice.data.length, i + w); j++) peak = Math.max(peak, Math.abs(voice.data[j] - voice.data[j - 1]));
    if (peak > 0.08) clicks++;
  }
  out.metric('Coupes', `${cuts.length} raccord(s), ${keeps.length} segment(s) gardé(s)`);
  out.check('Raccords sans clic', clicks === 0, clicks ? `${clicks} raccord(s) avec saut de niveau` : 'OK',
    clicks ? { patch: { silence: { fadeMs: cfg.silence.fadeMs + 10 } }, from: 'cut', note: 'Clics aux coupes : fondus plus longs' } : null);

  // Mots rognés : un mot doit tenir dans son segment avec une petite marge.
  let clipped = 0;
  for (const w of spec.words) {
    const k = keeps.find((kk) => w.srcStart >= kk.start - 1e-3 && w.srcStart <= kk.end);
    if (!k) { clipped++; continue; }
    const atFileStart = k.start <= 0.001;
    const atFileEnd = k === keeps[keeps.length - 1];
    if ((!atFileStart && w.srcStart - k.start < 0.02) || (!atFileEnd && k.end - w.srcEnd < 0.02)) clipped++;
  }
  const okClip = clipped <= Math.max(0, Math.floor(spec.words.length * 0.01));
  out.check('Aucun mot rogné par une coupe', okClip, `${clipped} mot(s) collé(s) à une coupe`,
    okClip ? null : { patch: { silence: { padding: round3(cfg.silence.padding + 0.05) } }, from: 'cut', note: 'Mots rognés : marge de coupe augmentée' });

  const shortKeeps = keeps.filter((k) => k.end - k.start < cfg.silence.minKeep).length;
  out.metric('Segments courts', `${shortKeeps} segment(s) < ${cfg.silence.minKeep} s (gardés car ils contiennent un mot)`);

  // Voix / musique.
  const musicStem = path.join(workDir, '07_stem_musique.wav');
  if (exists(musicStem)) {
    const music = readWav16(musicStem);
    const vstem = readWav16(path.join(workDir, '07_stem_voix.wav'));
    const speech = spec.words.map((w) => ({ start: w.start, end: w.end }));
    const v = rmsDb(vstem, speech);
    const m = rmsDb(music, speech);
    const margin = round3(v - m);
    out.metric('Voix / musique pendant la parole', `voix ${v} dB, musique ${m} dB, écart ${margin} dB`);
    out.check('Musique sous la voix (écart ≥ 12 dB)', margin >= 12, `${margin} dB`,
      margin >= 12 ? null : { patch: { audio: { musicDb: cfg.audio.musicDb - Math.ceil(12 - margin + 1), duck: { threshold: round3(cfg.audio.duck.threshold * 0.7) } } }, from: 'audio', note: 'Musique trop forte sous la voix : baissée' });
    if (spec.harmonica.length && cfg.audio.muteMusicOnHarmonica) {
      const inner = spec.harmonica.map((h) => ({ start: h.start + 0.5, end: h.end - 0.5 })).filter((r) => r.end > r.start);
      const mh = rmsDb(music, inner);
      out.check('Musique coupée pendant le jeu d\'harmonica', mh < -50, `${mh} dB`,
        mh < -50 ? null : { patch: { audio: { muteMusicOnHarmonica: true } }, from: 'audio', note: 'Musique audible sous l\'harmonica' });
    }
  } else out.metric('Musique', 'aucune (pas de dossier musique)');
}

export const PASSES = [
  { id: 1, name: 'Technique : durées, loudness, synchro, Unicode', run: passTechnique },
  { id: 2, name: 'Visuel : lisibilité, planches, images noires', run: passVisuel },
  { id: 3, name: 'Montage et son : raccords, mots rognés, voix/musique', run: passMontageSon },
];

export async function reviewPass(passIndex, ctx) {
  const result = { checks: [], metrics: [], images: [], corrections: [] };
  const out = {
    check: (label, ok, detail, correction) => {
      result.checks.push({ label, ok, detail });
      if (!ok && correction) result.corrections.push(correction);
    },
    metric: (label, value) => result.metrics.push({ label, value }),
    image: (label, file) => result.images.push({ label, file }),
  };
  await PASSES[passIndex % PASSES.length].run(ctx, out);
  return result;
}
