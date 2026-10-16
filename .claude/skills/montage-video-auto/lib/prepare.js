// Étape 1 : analyse (ffprobe), extraction audio, détection des silences, puis découpe.
// La découpe protège chaque mot transcrit : on ne coupe jamais au milieu d'un mot.
import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg, ffprobe, log, writeJson, round3, fail } from './util.js';

export async function probe(input) {
  const { stdout } = await ffprobe(['-print_format', 'json', '-show_format', '-show_streams', input]);
  const info = JSON.parse(stdout);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const a = info.streams.find((s) => s.codec_type === 'audio');
  if (!v) fail(`Aucune piste vidéo dans ${input}`);
  if (!a) fail(`Aucune piste audio dans ${input}`);
  const rot = Number(v.tags?.rotate ?? v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0);
  const swap = Math.abs(rot) % 180 === 90;
  const [n, d] = (v.avg_frame_rate || v.r_frame_rate || '30/1').split('/').map(Number);
  return {
    file: path.resolve(input),
    duration: Number(info.format.duration),
    width: swap ? v.height : v.width,
    height: swap ? v.width : v.height,
    fps: d ? n / d : n,
    rotation: rot,
    videoCodec: v.codec_name,
    audioCodec: a.codec_name,
    sampleRate: Number(a.sample_rate),
  };
}

export async function extractSttAudio(input, out) {
  await ffmpeg(['-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', out]);
  return out;
}

export async function detectSilences(input, { noiseDb, minSilence }) {
  const { stderr } = await ffmpeg([
    '-i', input, '-vn', '-af', `silencedetect=noise=${noiseDb}dB:d=${minSilence}`, '-f', 'null', '-',
  ]);
  const silences = [];
  let start = null;
  for (const line of stderr.split('\n')) {
    const s = line.match(/silence_start: (-?[\d.]+)/);
    const e = line.match(/silence_end: ([\d.]+)/);
    if (s) start = Math.max(0, Number(s[1]));
    if (e && start !== null) { silences.push({ start, end: Number(e[1]) }); start = null; }
  }
  return { silences, openEnd: start };
}

/**
 * Calcule les segments gardés (en secondes, source).
 * silences : zones silencieuses ; words : mots transcrits (source) à protéger.
 */
export function computeKeeps({ duration, silences, openEnd, words = [], fps, silence }) {
  const { padding, minKeep } = silence;
  const all = [...silences];
  if (openEnd !== null && openEnd !== undefined) all.push({ start: openEnd, end: duration });

  // Zones retirées = silences réduits de la marge de chaque côté.
  let removed = all
    .map((s) => ({
      start: s.start <= 0.01 ? 0 : s.start + padding,
      end: s.end >= duration - 0.01 ? duration : s.end - padding,
    }))
    .filter((r) => r.end - r.start > 0.05);

  // Protection des mots : une zone retirée ne doit chevaucher aucun mot (+ petite marge).
  const guard = Math.min(0.06, padding);
  for (const w of words) {
    const ws = w.start - guard;
    const we = w.end + guard;
    removed = removed.flatMap((r) => {
      if (we <= r.start || ws >= r.end) return [r];
      const parts = [];
      if (ws > r.start) parts.push({ start: r.start, end: ws });
      if (we < r.end) parts.push({ start: we, end: r.end });
      return parts.filter((p) => p.end - p.start > 0.05);
    });
  }
  removed.sort((a, b) => a.start - b.start);

  // Complément = segments gardés.
  let keeps = [];
  let cur = 0;
  for (const r of removed) {
    if (r.start > cur) keeps.push({ start: cur, end: r.start });
    cur = Math.max(cur, r.end);
  }
  if (cur < duration) keeps.push({ start: cur, end: duration });

  // Calage sur la grille des frames pour que vidéo et audio aient la même longueur.
  const snap = (t, f) => f(t * fps) / fps;
  keeps = keeps.map((k) => ({ start: snap(k.start, Math.floor), end: Math.min(snap(k.end, Math.ceil), snap(duration, Math.floor)) }));

  // Fusion des segments qui se touchent, suppression des miettes sans parole.
  const merged = [];
  for (const k of keeps) {
    const last = merged[merged.length - 1];
    if (last && k.start - last.end < 1.5 / fps) last.end = Math.max(last.end, k.end);
    else merged.push({ ...k });
  }
  const hasWord = (k) => words.some((w) => w.end > k.start && w.start < k.end);
  return merged
    .filter((k) => k.end - k.start >= minKeep || hasWord(k))
    .filter((k) => k.end - k.start >= 2 / fps)
    .map((k) => ({ start: round3(k.start), end: round3(k.end) }));
}

/** Découpe la vidéo selon les segments gardés : 01_cut.mp4 (image) + 01_voice.wav (son 48 kHz). */
export async function cutVideo({ input, keeps, outVideo, outVoice, fps, fadeMs, maxHeight = 2160, crf = 17 }) {
  const fade = fadeMs / 1000;
  const n = keeps.length;
  if (!n) fail('Aucun segment de parole trouvé : vérifie le seuil de silence (silence.noiseDb).');
  const lines = [];
  lines.push(`[0:v]setpts=PTS-STARTPTS,fps=${fps},scale=-2:'min(${maxHeight},ih)',format=yuv420p,split=${n}${keeps.map((_, i) => `[vs${i}]`).join('')};`);
  lines.push(`[0:a]asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,asplit=${n}${keeps.map((_, i) => `[as${i}]`).join('')};`);
  keeps.forEach((k, i) => {
    const len = k.end - k.start;
    const f = Math.min(fade, len / 4);
    lines.push(`[vs${i}]trim=start=${k.start}:end=${k.end},setpts=PTS-STARTPTS[v${i}];`);
    lines.push(`[as${i}]atrim=start=${k.start}:end=${k.end},asetpts=PTS-STARTPTS,afade=t=in:d=${f.toFixed(4)},afade=t=out:st=${(len - f).toFixed(4)}:d=${f.toFixed(4)}[a${i}];`);
  });
  lines.push(`${keeps.map((_, i) => `[v${i}][a${i}]`).join('')}concat=n=${n}:v=1:a=1[vout][aout];`);
  lines.push('[aout]asplit=2[aenc][awav]');
  const script = `${outVideo}.filter.txt`;
  fs.writeFileSync(script, lines.join('\n'));
  await ffmpeg([
    '-i', input, '-filter_complex_script', script,
    '-map', '[vout]', '-map', '[aenc]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf),
    '-r', String(fps), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outVideo,
    '-map', '[awav]', '-c:a', 'pcm_s16le', outVoice,
  ]);
  fs.rmSync(script, { force: true });
}

/** Convertit les temps source en temps du montage (après coupe). */
export function remapWords(words, keeps) {
  const offsets = [];
  let acc = 0;
  for (const k of keeps) { offsets.push(acc); acc += k.end - k.start; }
  const toCut = (t) => {
    for (let i = 0; i < keeps.length; i++) {
      const k = keeps[i];
      if (t >= k.start - 1e-6 && t <= k.end + 1e-6) return offsets[i] + Math.min(Math.max(t, k.start), k.end) - k.start;
    }
    return null;
  };
  const out = [];
  for (const w of words) {
    const s = toCut(w.start);
    const e = toCut(w.end);
    if (s === null || e === null) continue;
    out.push({ ...w, start: round3(s), end: round3(Math.max(e, s + 0.04)), srcStart: w.start, srcEnd: w.end });
  }
  return { words: out, duration: round3(acc) };
}

export async function runPrepareAnalyze(ctx) {
  const { input, workDir, cfg } = ctx;
  log('prepare', `Analyse de ${path.basename(input)}`);
  const info = await probe(input);
  writeJson(path.join(workDir, '00_probe.json'), info);
  log('prepare', `${info.width}x${info.height}, ${info.fps.toFixed(2)} i/s, ${info.duration.toFixed(1)} s`);
  const stt = path.join(workDir, '01_stt.wav');
  await extractSttAudio(input, stt);
  const sil = await detectSilences(stt, cfg.silence);
  writeJson(path.join(workDir, '01_silences.json'), { ...sil, params: cfg.silence });
  log('prepare', `${sil.silences.length} silences détectés (seuil ${cfg.silence.noiseDb} dB, ≥ ${cfg.silence.minSilence} s)`);
  return { info, sttAudio: stt, ...sil };
}

export async function runPrepareCut(ctx, { info, silences, openEnd, words }) {
  const { workDir, cfg } = ctx;
  const keeps = computeKeeps({ duration: info.duration, silences, openEnd, words, fps: cfg.fps, silence: cfg.silence });
  const cutDur = keeps.reduce((s, k) => s + k.end - k.start, 0);
  writeJson(path.join(workDir, '01_keeps.json'), { keeps, sourceDuration: info.duration, cutDuration: round3(cutDur) });
  log('prepare', `${keeps.length} segments gardés : ${info.duration.toFixed(1)} s → ${cutDur.toFixed(1)} s (−${(info.duration - cutDur).toFixed(1)} s)`);
  await cutVideo({
    input: info.file, keeps, fps: cfg.fps, fadeMs: cfg.silence.fadeMs,
    outVideo: path.join(workDir, '01_cut.mp4'), outVoice: path.join(workDir, '01_voice.wav'),
  });
  const mapped = remapWords(words, keeps);
  return { keeps, ...mapped };
}
