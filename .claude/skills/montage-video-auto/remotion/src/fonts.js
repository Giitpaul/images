import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

const loaded = new Set();

// Polices de la charte : fichiers locaux copiés dans le dossier de travail (aucun accès réseau au rendu).
export function ensureFonts(brand) {
  const out = {};
  for (const role of ['title', 'text']) {
    const f = brand.fonts?.[role] ?? {};
    const key = `${f.family}|${f.file}|${f.weight}`;
    if (f.file && !loaded.has(key)) {
      loaded.add(key);
      loadFont({ family: f.family, url: staticFile(f.file), weight: f.weight ?? '400' });
    }
    out[role] = `"${f.family ?? 'Arial'}", "Arial Black", sans-serif`;
  }
  return out;
}
