// Étape 5 : détourage de la personne (MediaPipe ou Robust Video Matting) → 05_fg.webm avec alpha.
import fs from 'node:fs';
import path from 'node:path';
import { SKILL_DIR, run, pythonBin, ffmpegBin, log, exists, fail } from './util.js';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

async function ensureModel() {
  const p = path.join(SKILL_DIR, 'models', 'selfie_segmenter.tflite');
  if (exists(p)) return p;
  log('detourage', 'Téléchargement du modèle MediaPipe (une seule fois)…');
  const res = await fetch(MODEL_URL);
  if (!res.ok) fail(`Téléchargement du modèle impossible (${res.status}) : ${MODEL_URL}`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.from(await res.arrayBuffer()));
  return p;
}

export async function segmentPerson({ input, out, engine, smoothing, threshold }) {
  const args = [
    path.join(SKILL_DIR, 'scripts', 'segment_person.py'),
    '--entree', input, '--sortie', out, '--moteur', engine,
    '--lissage', String(smoothing), '--seuil', String(threshold), '--ffmpeg', ffmpegBin(),
  ];
  if (engine === 'mediapipe') args.push('--modele', await ensureModel());
  log('detourage', `Détourage ${engine === 'rvm' ? 'Robust Video Matting' : 'MediaPipe Selfie Segmentation'}…`);
  const { stdout } = await run(pythonBin(), args);
  const m = stdout.match(/COUVERTURE moyenne=([\d.]+) min=([\d.]+) max=([\d.]+)/);
  const coverage = m ? { mean: Number(m[1]), min: Number(m[2]), max: Number(m[3]) } : null;
  if (coverage) log('detourage', `Personne détectée sur ${(coverage.mean * 100).toFixed(0)} % de l'image en moyenne`);
  return { file: out, coverage };
}
