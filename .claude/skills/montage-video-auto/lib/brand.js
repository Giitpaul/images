// Détection de la charte visuelle dans un projet Remotion existant (lecture seule, rien n'est modifié).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { log, writeJson } from './util.js';

const SKIP = new Set(['node_modules', '.git', 'out', 'build', 'dist', '.next']);
const ROLE_PATTERNS = [
  ['primary', /(primary|principal|brand|main|rouge|red)/i],
  ['secondary', /(secondary|secondaire|brown|marron|brun)/i],
  ['accent', /(accent|highlight|yellow|jaune|gold|or)\b/i],
  ['light', /(light|white|blanc|cream|creme|crème|text)/i],
  ['dark', /(dark|black|noir|background|bg)/i],
];

function walk(dir, files = [], depth = 0) {
  if (depth > 6) return files;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files, depth + 1);
    else files.push(p);
  }
  return files;
}

export function detectBrand(projectDir) {
  const files = walk(projectDir);
  const colors = {};
  const fonts = [];
  let logo = null;
  for (const f of files) {
    if (!logo && /logo.*\.(png|svg|webp)$/i.test(path.basename(f))) logo = f;
    if (!/\.(tsx?|jsx?|css|json)$/i.test(f) || fs.statSync(f).size > 300000) continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/([A-Za-z_][\w-]*)\s*[:=]\s*['"](#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})['"]/g)) {
      for (const [role, re] of ROLE_PATTERNS) if (!colors[role] && re.test(m[1])) colors[role] = m[2];
    }
    for (const m of src.matchAll(/fontFamily\s*[:=]\s*['"`]([^'"`,]+)/g)) fonts.push(m[1].trim());
    for (const m of src.matchAll(/@remotion\/google-fonts\/(\w+)/g)) fonts.push(m[1]);
  }
  const uniqFonts = [...new Set(fonts)].filter((x) => !/^(inherit|sans-serif|serif|monospace)$/i.test(x));
  return { colors, fonts: uniqFonts, logo };
}

/** Écrit ~/.montage-video-auto/brand.json : fusionné par-dessus la charte par défaut à chaque montage. */
export function saveDetectedBrand(projectDir) {
  const d = detectBrand(projectDir);
  const brand = { _source: `Détecté dans ${projectDir}` };
  if (Object.keys(d.colors).length) brand.colors = d.colors;
  if (d.logo) brand.logo = d.logo;
  // Les polices Google déjà intégrées (Luckiest Guy, Montserrat) sont gardées ; une autre police doit être fournie en fichier.
  const out = path.join(os.homedir(), '.montage-video-auto', 'brand.json');
  writeJson(out, brand);
  log('charte', `Couleurs : ${JSON.stringify(d.colors)}`);
  log('charte', `Polices vues : ${d.fonts.join(', ') || 'aucune'}${d.fonts.length ? ' (à brancher via brand.fonts.*.file si ce ne sont pas Luckiest Guy / Montserrat)' : ''}`);
  log('charte', `Logo : ${d.logo ?? 'aucun'}`);
  log('charte', `Charte enregistrée : ${out}`);
  return { ...d, file: out };
}
