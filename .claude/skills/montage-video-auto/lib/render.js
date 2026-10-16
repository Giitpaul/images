// Étape 6 : rendu Remotion en Chrome headless, un fichier par format (vidéo muette, le son est mixé à part).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { SKILL_DIR, log, writeJson } from './util.js';

const bundles = new Map();

async function getBundle(workDir) {
  if (bundles.has(workDir)) return bundles.get(workDir);
  log('render', 'Préparation du projet Remotion…');
  const url = await bundle({
    entryPoint: path.join(SKILL_DIR, 'remotion', 'src', 'index.jsx'),
    publicDir: workDir, // les fichiers du dossier de travail sont servis via staticFile()
    onProgress: () => {},
  });
  bundles.set(workDir, url);
  return url;
}

export function resetBundle(workDir) {
  bundles.delete(workDir);
}

/** Copie le logo et les polices locales de la charte dans le dossier de travail. */
export function stageBrandAssets(workDir, brand) {
  const staged = { ...brand, fonts: { ...brand.fonts } };
  const copy = (rel, name) => {
    const src = path.isAbsolute(rel) ? rel : path.join(SKILL_DIR, rel);
    if (!fs.existsSync(src)) return null;
    const dest = `brand_${name}${path.extname(src)}`;
    fs.copyFileSync(src, path.join(workDir, dest));
    return dest;
  };
  staged.logo = brand.logo ? copy(brand.logo, 'logo') : null;
  for (const role of Object.keys(staged.fonts)) {
    const f = staged.fonts[role];
    if (f?.file) staged.fonts[role] = { ...f, file: copy(f.file, `font_${role}`) };
  }
  return staged;
}

export async function renderFormat({ workDir, timeline, out, cfg }) {
  const serveUrl = await getBundle(workDir);
  const propsFile = path.join(workDir, `06_props.${timeline.format.replace(':', 'x')}.json`);
  writeJson(propsFile, timeline);
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
  const composition = await selectComposition({ serveUrl, id: 'Montage', inputProps: timeline, browserExecutable, logLevel: 'error' });
  log('render', `Rendu ${timeline.format} : ${composition.width}x${composition.height}, ${composition.durationInFrames} frames`);
  let last = -1;
  const t0 = Date.now();
  await renderMedia({
    serveUrl,
    composition,
    inputProps: timeline,
    codec: 'h264',
    crf: cfg.render.crf,
    muted: true,
    outputLocation: out,
    browserExecutable,
    concurrency: cfg.render.concurrency ?? Math.max(1, Math.min(8, os.cpus().length - 1)),
    chromiumOptions: { gl: 'swangle' },
    timeoutInMilliseconds: 120000,
    logLevel: 'error',
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        let eta = '';
        if (progress > 0.05) {
          const left = ((Date.now() - t0) / progress) * (1 - progress);
          const end = new Date(Date.now() + left).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          eta = ` (reste ≈ ${Math.ceil(left / 60000)} min, fin vers ${end})`;
        }
        log('render', `${timeline.format} ${p * 10} %${eta}`);
      }
    },
  });
  return out;
}
