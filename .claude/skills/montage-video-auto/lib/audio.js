// Étape 7 : musique selon l'ambiance, bruitages procéduraux (DSP JavaScript), mixage avec ducking, normalisation.
import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg, ffprobe, log, rng, hashString, exists } from './util.js';

const SR = 48000;

// ---------- Bruitages procéduraux ----------

function writeWav(file, left, right) {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  const peak = Math.max(1e-9, ...left.map(Math.abs), ...right.map(Math.abs));
  const g = 0.89 / peak; // crête à −1 dBFS
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * g)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

/** Filtre passe-bande RBJ, coefficients recalculés à chaque échantillon (balayage). */
function bandpass() {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, freq, q) => {
    const w = (2 * Math.PI * freq) / SR;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    const b0 = alpha / a0, b2 = -alpha / a0, a1 = (-2 * Math.cos(w)) / a0, a2 = (1 - alpha) / a0;
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

export function synthWhoosh(seed = 1, dur = 0.6) {
  const r = rng(seed);
  const n = Math.round(dur * SR);
  const L = new Array(n), R = new Array(n);
  const fl = bandpass(), fr = bandpass();
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const env = Math.sin(Math.PI * Math.pow(p, 0.7)) ** 2;
    const freq = 350 + 3800 * Math.sin(Math.PI * p) ** 1.5;
    const noise = r() * 2 - 1;
    const pan = p; // de gauche à droite
    const s = env;
    L[i] = fl(noise, freq, 1.4) * s * Math.cos((pan * Math.PI) / 2);
    R[i] = fr(r() * 2 - 1, freq * 1.03, 1.4) * s * Math.sin((pan * Math.PI) / 2);
  }
  return [L, R];
}

export function synthPop(seed = 2, dur = 0.14) {
  const r = rng(seed);
  const n = Math.round(dur * SR);
  const L = new Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 180 + 900 * Math.exp(-t * 45);
    phase += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t * 2000) * Math.exp(-t * 32);
    const click = i < 48 ? (r() * 2 - 1) * (1 - i / 48) * 0.5 : 0;
    L[i] = Math.sin(phase) * env + click;
  }
  return [L, [...L]];
}

export function synthClick(seed = 3, dur = 0.05) {
  const r = rng(seed);
  const n = Math.round(dur * SR);
  const L = new Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const noise = r() * 2 - 1;
    const hp = noise - prev; // passe-haut simple
    prev = noise;
    L[i] = hp * Math.exp(-t * 400) * 0.6 + Math.sin(2 * Math.PI * 2600 * t) * Math.exp(-t * 180);
  }
  return [L, [...L]];
}

export function makeSfxFiles(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const out = {};
  for (const [name, fn] of Object.entries({ whoosh: synthWhoosh, pop: synthPop, click: synthClick })) {
    const f = path.join(dir, `${name}.wav`);
    writeWav(f, ...fn());
    out[name] = f;
  }
  return out;
}

// ---------- Musique ----------

const MOOD_ALIASES = { enquete: ['enquete', 'enquête', 'mystere', 'mystère', 'investigation'], profond: ['profond', 'deep', 'emotion', 'émotion', 'calme'], fun: ['fun', 'joyeux', 'happy', 'energie', 'énergie'] };
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i;

export function listMusic(musicDir) {
  if (!musicDir || !exists(musicDir)) return [];
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (AUDIO_EXT.test(e.name)) files.push(p);
    }
  };
  walk(musicDir);
  return files.sort();
}

export function pickTrack(files, mood, seedText) {
  const names = MOOD_ALIASES[mood] ?? [mood];
  const match = files.filter((f) => names.some((n) => f.toLowerCase().normalize('NFC').includes(n)));
  const pool = match.length ? match : files;
  if (!pool.length) return null;
  return pool[hashString(seedText) % pool.length];
}

async function mediaDuration(file) {
  const { stdout } = await ffprobe(['-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
  return Number(stdout.trim());
}

// ---------- Mixage ----------

/** Gain de la musique : coupée pendant le jeu d'harmonica (rampe de 0,4 s). */
function harmonicaGainExpr(segs, ramp = 0.4) {
  if (!segs.length) return '1';
  return segs.map((h) => `clip(max((${h.start}-t)/${ramp},(t-${h.end})/${ramp}),0,1)`).join('*');
}

async function loudnorm(input, out, { targetLufs, truePeak, loudnormDynamic }) {
  const base = `loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=11`;
  if (loudnormDynamic) {
    await ffmpeg(['-i', input, '-af', `${base},aresample=${SR}`, '-c:a', 'pcm_s16le', out]);
    return { input_i: 'mode dynamique' };
  }
  const { stderr } = await ffmpeg(['-i', input, '-af', `${base}:print_format=json`, '-f', 'null', '-']);
  const json = JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
  const second = `${base}:measured_I=${json.input_i}:measured_TP=${json.input_tp}:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true`;
  await ffmpeg(['-i', input, '-af', `${second},aresample=${SR}`, '-c:a', 'pcm_s16le', out]);
  return json;
}

export async function buildMix({ workDir, spec, cfg }) {
  const a = cfg.audio;
  const dur = spec.duration;
  const voice = path.join(workDir, '01_voice.wav');
  const inputs = ['-i', voice];
  const filters = [];
  let idx = 1;

  // Voix off ElevenLabs éventuelles, ajoutées à la voix.
  const vo = (spec.voiceovers ?? []).filter((v) => exists(path.resolve(workDir, v.file)));
  const voLabels = [];
  for (const v of vo) {
    inputs.push('-i', path.resolve(workDir, v.file));
    const ms = Math.round(v.at * 1000);
    filters.push(`[${idx}:a]aresample=${SR},aformat=channel_layouts=stereo,adelay=${ms}|${ms}[vo${idx}]`);
    voLabels.push(`[vo${idx}]`);
    idx++;
  }
  if (voLabels.length) filters.push(`[0:a]${voLabels.join('')}amix=inputs=${voLabels.length + 1}:normalize=0[voiceall]`);
  else filters.push('[0:a]anull[voiceall]');
  filters.push(`[voiceall]apad,atrim=0:${dur},asplit=3[vox][sc][voxstem]`);

  // Musique par séquence d'ambiance.
  const files = listMusic(a.musicDir);
  const chosen = [];
  const musicLabels = [];
  if (files.length) {
    for (const [i, seq] of spec.music.entries()) {
      const track = pickTrack(files, seq.mood, `${spec.title}|${i}|${seq.mood}`);
      if (!track) continue;
      const tdur = await mediaDuration(track);
      const overlap = i < spec.music.length - 1 ? 1.2 : 0;
      const len = Math.min(seq.end - seq.start + overlap, dur - seq.start);
      // Départ dans la piste : déterministe, mais pas toujours au début.
      const offset = tdur > len + 4 ? (hashString(track + i) % Math.floor(tdur - len - 2)) : 0;
      inputs.push('-stream_loop', '-1', '-i', track);
      const ms = Math.round(seq.start * 1000);
      const fin = i === 0 ? 0.3 : 1.0;
      filters.push(`[${idx}:a]aresample=${SR},aformat=channel_layouts=stereo,atrim=${offset}:${offset + len},asetpts=PTS-STARTPTS,afade=t=in:d=${fin},afade=t=out:st=${Math.max(0, len - 1.5)}:d=1.5,adelay=${ms}|${ms}[mu${idx}]`);
      musicLabels.push(`[mu${idx}]`);
      chosen.push({ ...seq, track, offset: Math.round(offset * 10) / 10 });
      idx++;
    }
  } else {
    log('audio', a.musicDir ? `Aucune piste trouvée dans ${a.musicDir}` : 'Pas de dossier musique (MUSIC_DIR) : montage sans musique.');
  }

  const mixInputs = ['[vox]'];
  if (musicLabels.length) {
    const gain = a.muteMusicOnHarmonica ? harmonicaGainExpr(spec.harmonica) : '1';
    filters.push(`${musicLabels.join('')}amix=inputs=${musicLabels.length}:normalize=0,volume=${a.musicDb}dB,volume='${gain}':eval=frame,apad,atrim=0:${dur}[mus]`);
    const d = a.duck;
    filters.push(`[mus][sc]sidechaincompress=threshold=${d.threshold}:ratio=${d.ratio}:attack=${d.attack}:release=${d.release}:makeup=1,asplit=2[musd][musstem]`);
    mixInputs.push('[musd]');
  } else {
    filters.push('[sc]anullsink');
  }

  // Bruitages.
  const sfxList = a.sfx ? spec.sfx : [];
  if (sfxList.length) {
    const sfxFiles = makeSfxFiles(path.join(workDir, '07_sfx'));
    const labels = [];
    for (const s of sfxList) {
      if (!sfxFiles[s.type]) continue;
      inputs.push('-i', sfxFiles[s.type]);
      const ms = Math.max(0, Math.round(s.at * 1000));
      const vol = a.sfxDb + (s.type === 'whoosh' ? -4 : 0);
      filters.push(`[${idx}:a]adelay=${ms}|${ms},volume=${vol}dB[sx${idx}]`);
      labels.push(`[sx${idx}]`);
      idx++;
    }
    filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,apad,atrim=0:${dur}[sfx]`);
    mixInputs.push('[sfx]');
  }

  filters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:normalize=0:duration=first[mix]`);
  const script = path.join(workDir, '07_mix.filter.txt');
  fs.writeFileSync(script, filters.join(';\n'));

  const pre = path.join(workDir, '07_premix.wav');
  const outArgs = ['-map', '[mix]', '-c:a', 'pcm_s24le', pre, '-map', '[voxstem]', '-c:a', 'pcm_s16le', path.join(workDir, '07_stem_voix.wav')];
  if (musicLabels.length) outArgs.push('-map', '[musstem]', '-c:a', 'pcm_s16le', path.join(workDir, '07_stem_musique.wav'));
  await ffmpeg([...inputs, '-filter_complex_script', script, ...outArgs]);

  const final = path.join(workDir, '07_mix.wav');
  const measured = await loudnorm(pre, final, a);
  log('audio', `Mix normalisé : ${a.targetLufs} LUFS visé (entrée ${measured.input_i} LUFS), ${chosen.length} séquence(s) musicale(s), ${sfxList.length} bruitage(s)`);
  return { file: final, music: chosen, sfx: sfxList.length, measured };
}

export async function muxFinal({ video, audio, out }) {
  await ffmpeg(['-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  return out;
}
