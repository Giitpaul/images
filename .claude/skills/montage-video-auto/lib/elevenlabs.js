// Étape 2 : transcription ElevenLabs Scribe (horodatage au mot) + voix off optionnelle.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { log, fail, readJson, writeJson, exists, round3 } from './util.js';

const baseUrl = () => (process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io').replace(/\/$/, '');

function apiKey() {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) fail('ELEVENLABS_API_KEY manquante. Renseigne-la dans le fichier .env du skill.');
  return k;
}

function fileHash(p) {
  return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
}

/** Normalise la réponse Scribe : mots, événements audio (ex. « (harmonica) »), texte. */
export function normalizeScribe(raw) {
  const words = [];
  const events = [];
  for (const w of raw.words ?? []) {
    const item = { text: String(w.text).trim(), start: round3(Number(w.start)), end: round3(Number(w.end)) };
    if (!item.text) continue;
    if (w.type === 'word' || w.type === undefined) words.push(item);
    else if (w.type === 'audio_event') events.push(item);
  }
  return { language: raw.language_code ?? 'fr', text: raw.text ?? words.map((w) => w.text).join(' '), words, events };
}

export async function transcribe(audioPath, { model, language, tagAudioEvents }, cacheDir) {
  const hash = fileHash(audioPath);
  const rawPath = path.join(cacheDir, '02_transcript.raw.json');
  if (exists(rawPath)) {
    const cached = readJson(rawPath);
    if (cached._audioHash === hash) {
      log('transcription', 'Transcription en cache réutilisée (aucun crédit consommé).');
      return normalizeScribe(cached);
    }
  }
  log('transcription', `Envoi à ElevenLabs Scribe (${model}, ${language})…`);
  const form = new FormData();
  form.append('model_id', model);
  form.append('language_code', language);
  form.append('timestamps_granularity', 'word');
  form.append('tag_audio_events', String(Boolean(tagAudioEvents)));
  form.append('diarize', 'false');
  form.append('file', await fs.openAsBlob(audioPath, { type: 'audio/wav' }), path.basename(audioPath));

  let res;
  for (let attempt = 1; attempt <= 4; attempt++) {
    res = await fetch(`${baseUrl()}/v1/speech-to-text`, { method: 'POST', headers: { 'xi-api-key': apiKey() }, body: form });
    if (res.ok || (res.status < 500 && res.status !== 429)) break;
    const wait = 2 ** attempt * 1000;
    log('transcription', `Réponse ${res.status}, nouvel essai dans ${wait / 1000} s`);
    await new Promise((r) => setTimeout(r, wait));
  }
  if (!res.ok) fail(`ElevenLabs Scribe a répondu ${res.status} : ${(await res.text()).slice(0, 500)}`);
  const raw = await res.json();
  writeJson(rawPath, { ...raw, _audioHash: hash });
  const norm = normalizeScribe(raw);
  log('transcription', `${norm.words.length} mots, ${norm.events.length} événements audio`);
  return norm;
}

/** Importe une transcription existante (format Scribe brut ou format normalisé). */
export function importTranscript(file) {
  const data = readJson(file);
  if (Array.isArray(data.words) && data.words[0] && 'type' in data.words[0]) return normalizeScribe(data);
  if (Array.isArray(data.words)) return { language: data.language ?? 'fr', text: data.text ?? '', words: data.words, events: data.events ?? [] };
  fail(`Format de transcription non reconnu : ${file}`);
}

/** Voix off ElevenLabs (option). Renvoie le chemin du MP3 créé. */
export async function voiceover({ text, out, voiceId, model }) {
  if (!voiceId) fail('Aucune voix : renseigne ELEVENLABS_VOICE_ID dans .env ou passe --voix <id>.');
  log('voixoff', `Synthèse ElevenLabs (${model}), ${text.length} caractères`);
  const res = await fetch(`${baseUrl()}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
  });
  if (!res.ok) fail(`ElevenLabs TTS a répondu ${res.status} : ${(await res.text()).slice(0, 500)}`);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  return out;
}
