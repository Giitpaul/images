// Chargement de la configuration : défauts < charte < montage.config.json < options CLI < corrections de relecture.
import path from 'node:path';
import os from 'node:os';
import dotenv from 'dotenv';
import { SKILL_DIR, readJson, exists, deepMerge, writeJson } from './util.js';

export function loadEnv() {
  // .env du dossier courant puis .env du skill (le premier trouvé gagne pour chaque clé).
  dotenv.config({ path: path.join(process.cwd(), '.env'), quiet: true });
  dotenv.config({ path: path.join(SKILL_DIR, '.env'), quiet: true });
}

export function loadConfig({ workDir, configFile, cli = {} } = {}) {
  let cfg = readJson(path.join(SKILL_DIR, 'config', 'default.json'));
  cfg.brand = readJson(path.join(SKILL_DIR, 'config', 'brand.json'));

  const userBrand = path.join(os.homedir(), '.montage-video-auto', 'brand.json');
  if (exists(userBrand)) cfg.brand = deepMerge(cfg.brand, readJson(userBrand));

  if (configFile) cfg = deepMerge(cfg, readJson(path.resolve(configFile)));
  if (workDir && exists(path.join(workDir, 'montage.config.json'))) {
    cfg = deepMerge(cfg, readJson(path.join(workDir, 'montage.config.json')));
  }
  cfg = deepMerge(cfg, cli);

  // Corrections automatiques décidées par la relecture (persistées entre les passes).
  if (workDir && exists(path.join(workDir, 'corrections.json'))) {
    cfg = deepMerge(cfg, readJson(path.join(workDir, 'corrections.json')).config ?? {});
  }

  if (!cfg.audio.musicDir && process.env.MUSIC_DIR) cfg.audio.musicDir = process.env.MUSIC_DIR;
  if (process.env.ELEVENLABS_STT_MODEL) cfg.transcription.model = process.env.ELEVENLABS_STT_MODEL;
  if (process.env.ELEVENLABS_VOICE_ID && !cfg.voiceover.voiceId) cfg.voiceover.voiceId = process.env.ELEVENLABS_VOICE_ID;
  return cfg;
}

export function saveCorrection(workDir, patch, note) {
  const p = path.join(workDir, 'corrections.json');
  const cur = exists(p) ? readJson(p) : { config: {}, history: [] };
  cur.config = deepMerge(cur.config, patch);
  cur.history.push({ at: new Date().toISOString(), note, patch });
  writeJson(p, cur);
}
