// Notes jouées → tablature harmonica diatonique (accord Richter).
// Choix automatique de la tonalité de l'harmonica : celle qui joue la phrase avec le moins de bends.
import path from 'node:path';
import { SKILL_DIR, run, pythonBin, log, readJson } from './util.js';

const BLOW = [0, 4, 7, 12, 16, 19, 24, 28, 31, 36];
const DRAW = [2, 7, 11, 14, 17, 21, 23, 26, 29, 33];
// Hauteur du trou 1 soufflé par tonalité (G le plus grave, F# le plus aigu).
const HARP_BASE = { G: 55, Ab: 56, A: 57, Bb: 58, B: 59, C: 60, Db: 61, D: 62, Eb: 63, E: 64, F: 65, 'F#': 66 };
const FR = ['Do', 'Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
const FR_KEY = { G: 'Sol', Ab: 'La♭', A: 'La', Bb: 'Si♭', B: 'Si', C: 'Do', Db: 'Ré♭', D: 'Ré', Eb: 'Mi♭', E: 'Mi', F: 'Fa', 'F#': 'Fa♯' };

export const noteNameFr = (midi) => FR[((midi % 12) + 12) % 12];

/** Toutes les façons de jouer chaque demi-ton (relatif au trou 1 soufflé). */
function layout() {
  const map = new Map();
  const add = (semi, tab, cost) => {
    if (!map.has(semi) || map.get(semi).cost > cost) map.set(semi, { tab, cost });
  };
  BLOW.forEach((s, i) => add(s, `${i + 1}`, 0.01));
  DRAW.forEach((s, i) => add(s, `-${i + 1}`, 0));
  // Bends aspirés (trous 1 à 6), bends soufflés (trous 8 à 10).
  for (let h = 0; h < 6; h++) for (let d = 1; DRAW[h] - d > BLOW[h]; d++) add(DRAW[h] - d, `-${h + 1}${"'".repeat(d)}`, 0.3 * d);
  for (let h = 7; h < 10; h++) for (let d = 1; BLOW[h] - d > DRAW[h]; d++) add(BLOW[h] - d, `${h + 1}${"'".repeat(d)}`, 0.3 * d);
  return map;
}
const LAYOUT = layout();

function mapNote(midi, key) {
  const semi = midi - HARP_BASE[key];
  for (const shift of [0, -12, 12]) {
    const hit = LAYOUT.get(semi + shift);
    if (hit) return { ...hit, cost: hit.cost + (shift ? 1.5 : 0) };
  }
  return null;
}

/** Position : écart entre la tonique jouée et la tonalité de l'harmonica. */
function positionOf(tonicPc, key) {
  const d = (((tonicPc - HARP_BASE[key]) % 12) + 12) % 12;
  return { 0: 1, 7: 2, 2: 3, 5: 12 }[d] ?? null;
}

export function chooseHarp(notes, forced) {
  const tonic = notes.length ? notes[notes.length - 1].midi % 12 : 0;
  const keys = forced ? [forced] : Object.keys(HARP_BASE);
  let best = null;
  for (const key of keys) {
    let cost = 0;
    let unplayable = 0;
    for (const n of notes) {
      const m = mapNote(n.midi, key);
      const d = n.end - n.start;
      if (!m) { unplayable += d; cost += 5 * d; } else cost += m.cost * d;
    }
    const pos = positionOf(tonic, key);
    cost += { 1: 0.05, 2: 0, 3: 0.1, 12: 0.2 }[pos] ?? 0.6;
    if (!best || cost < best.cost) best = { key, cost, unplayable, position: pos };
  }
  return { ...best, keyFr: FR_KEY[best.key], tonicFr: FR[tonic] };
}

export function toTab(notes, key, position) {
  return notes.map((n) => {
    const m = mapNote(n.midi, key);
    let tab = m?.tab ?? '?';
    // 3 soufflé et 2 aspiré donnent la même note : en 2e position on joue 2 aspiré.
    if (tab === '3' && position === 2) tab = '-2';
    return { ...n, tab, name: noteNameFr(n.midi) };
  });
}

/** Lance la détection de notes et renvoie la tablature (ou null si librosa manque). */
export async function detectTab({ workDir, wav, forcedKey }) {
  const out = path.join(workDir, '02_notes.raw.json');
  try {
    await run(pythonBin(), [path.join(SKILL_DIR, 'scripts', 'notes_pyin.py'), '--entree', wav, '--sortie', out]);
  } catch (e) {
    log('notes', `⚠️ Détection des notes impossible (python -m pip install librosa) : ${e.message.split('\n').slice(-2).join(' ')}`);
    return null;
  }
  const notes = readJson(out).notes;
  if (notes.length < 3) return { notes: [], harp: null };
  const harp = chooseHarp(notes, forcedKey);
  const tab = toTab(notes, harp.key, harp.position);
  log('notes', `${notes.length} notes, harmonica en ${harp.keyFr} (${harp.key}), ${harp.position ?? '?'}e position, tonique ${harp.tonicFr}`);
  log('notes', `Tab : ${tab.map((n) => n.tab).join(' ')}`);
  return { notes: tab, harp };
}
