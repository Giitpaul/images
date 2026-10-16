// Outils communs : chemins, exécution FFmpeg, journal, conversions temps/frames.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const t0 = Date.now();
export function log(step, ...msg) {
  const s = ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
  console.log(`[${s}s] [${step}]`, ...msg);
}

export function fail(msg) {
  const e = new Error(msg);
  e.userFacing = true;
  throw e;
}

/** Lance une commande, renvoie { code, stdout, stderr }. Rejette si code != 0 (sauf allowFail). */
export function run(cmd, args, { allowFail = false, input, quiet = true, cwd, env } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, env: env ?? process.env, windowsHide: true });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => { stdout += d; if (!quiet) process.stdout.write(d); });
    p.stderr.on('data', (d) => { stderr += d; if (!quiet) process.stderr.write(d); });
    p.on('error', (err) => reject(new Error(`Impossible de lancer « ${cmd} » : ${err.message}`)));
    p.on('close', (code) => {
      if (code !== 0 && !allowFail) {
        const tail = stderr.split('\n').slice(-25).join('\n');
        reject(new Error(`${cmd} a échoué (code ${code}) :\n${tail}`));
      } else resolve({ code, stdout, stderr });
    });
    if (input) { p.stdin.write(input); }
    p.stdin.end();
  });
}

export const ffmpegBin = () => process.env.FFMPEG_PATH || 'ffmpeg';
export const ffprobeBin = () => process.env.FFPROBE_PATH || 'ffprobe';
export const pythonBin = () => process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');

export const ffmpeg = (args, opts) => run(ffmpegBin(), ['-hide_banner', '-y', ...args], opts);
export const ffprobe = (args, opts) => run(ffprobeBin(), ['-v', 'error', ...args], opts);

/** Règle unique : on calcule en secondes, on convertit en frames au dernier moment. */
export const secToFrame = (sec, fps) => Math.round(sec * fps);
export const frameToSec = (frame, fps) => frame / fps;

export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // JSON.stringify garde les accents tels quels (pas d'échappement \uXXXX).
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}
export const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const round3 = (v) => Math.round(v * 1000) / 1000;

/** Fusion profonde simple (objets uniquement, tableaux remplacés). */
export function deepMerge(base, over) {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return over ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base?.[k] && typeof base[k] === 'object'
      ? deepMerge(base[k], v)
      : v;
  }
  return out;
}

/** PRNG déterministe (mulberry32) : même vidéo, même montage. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashString(s) {
  let h = 2166136261;
  for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Dimensions par format. */
export const FORMATS = {
  '16:9': { id: '16x9', width: 1920, height: 1080 },
  '9:16': { id: '9x16', width: 1080, height: 1920 },
};
export function formatInfo(fmt) {
  const f = FORMATS[fmt];
  if (!f) fail(`Format inconnu « ${fmt} ». Formats possibles : ${Object.keys(FORMATS).join(', ')}`);
  return { name: fmt, ...f };
}
