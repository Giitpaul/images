// Étape 9 : envoi sur YouTube (Data API v3) en non répertorié.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { OAuth2Client } from 'google-auth-library';
import { youtube as youtubeApi } from '@googleapis/youtube';
import { log, fail, writeJson, readJson, exists } from './util.js';

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];
const PORT = 53682;

const tokenPath = () => process.env.YOUTUBE_TOKEN_PATH || path.join(os.homedir(), '.montage-video-auto', 'youtube-token.json');

// ---------- Métadonnées ----------

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const sanitize = (s) => String(s).replace(/[<>]/g, '').trim();

export function buildMetadata({ spec, cfg, title, description, format }) {
  const p = cfg.publish;
  const finalTitle = sanitize(title || `${spec.title.charAt(0)}${spec.title.slice(1).toLowerCase()} | Harmonica`).slice(0, 100);
  const intro = description || spec.phrases.slice(0, 2).map((x) => x.text).join(' ');
  // Chapitres YouTube : au moins 3, le premier à 0:00, chacun ≥ 10 s.
  let chapters = '';
  const chaps = [];
  for (const s of spec.scenes) if (!chaps.length || s.start - chaps[chaps.length - 1].start >= 10) chaps.push(s);
  if (chaps.length > 1 && spec.duration - chaps[chaps.length - 1].start < 10) chaps.pop();
  if (format === '16:9' && chaps.length >= 3) {
    chapters = `\n\nChapitres\n${chaps.map((s, i) => {
      const kw = s.phrases.map((id) => spec.phrases[id].keyword?.text).find(Boolean);
      const first = spec.phrases[s.phrases[0]]?.text ?? 'Suite';
      const label = i === 0 ? 'Introduction' : kw ? kw.charAt(0).toUpperCase() + kw.slice(1) : first.split(' ').slice(0, 5).join(' ');
      return `${fmtTime(i === 0 ? 0 : s.start)} ${label}`;
    }).join('\n')}`;
  }
  const shorts = format === '9:16' ? '\n\n#Shorts #harmonica' : '';
  return {
    snippet: {
      title: finalTitle,
      description: sanitize(`${intro}${chapters}\n\n${p.footer}${shorts}`).slice(0, 5000),
      tags: p.tags,
      categoryId: p.categoryId,
      defaultLanguage: p.language,
      defaultAudioLanguage: p.language,
    },
    status: { privacyStatus: p.privacy, selfDeclaredMadeForKids: false },
  };
}

// ---------- OAuth ----------

function client() {
  const id = process.env.YOUTUBE_CLIENT_ID;
  const secret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!id || !secret) fail('YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET manquants dans .env (voir README, section YouTube).');
  return new OAuth2Client(id, secret, `http://127.0.0.1:${PORT}/oauth2callback`);
}

function openBrowser(url) {
  try {
    const child = process.platform === 'win32'
      ? spawn('rundll32', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' })
      : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
  } catch { /* l'adresse est affichée dans la console */ }
}

/** Connexion unique : le navigateur s'ouvre, tu choisis la chaîne, le jeton est gardé. */
export async function authorize() {
  const oauth = client();
  const url = oauth.generateAuthUrl({ access_type: 'offline', prompt: 'consent select_account', scope: SCOPES });
  const code = await new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
      if (u.pathname !== '/oauth2callback') { res.end(); return; }
      const c = u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(c ? '<h2>Connexion YouTube réussie. Tu peux fermer cet onglet.</h2>' : '<h2>Connexion refusée.</h2>');
      srv.close();
      if (c) resolve(c); else reject(new Error(u.searchParams.get('error') || 'refus'));
    });
    srv.listen(PORT, '127.0.0.1', () => {
      log('youtube', `Si le navigateur ne s'ouvre pas, colle cette adresse :\n${url}`);
      openBrowser(url);
    });
    setTimeout(() => { srv.close(); reject(new Error('Délai de connexion dépassé (5 min)')); }, 300000).unref();
  });
  const { tokens } = await oauth.getToken(code);
  writeJson(tokenPath(), tokens);
  oauth.setCredentials(tokens);
  const me = await youtubeApi({ version: 'v3', auth: oauth }).channels.list({ part: ['id', 'snippet'], mine: true });
  const ch = me.data.items?.[0];
  log('youtube', `Connecté à « ${ch?.snippet?.title} » (${ch?.id}). Jeton : ${tokenPath()}`);
  if (process.env.YOUTUBE_CHANNEL_ID && ch?.id !== process.env.YOUTUBE_CHANNEL_ID) {
    log('youtube', `⚠️ Ce n'est pas la chaîne de YOUTUBE_CHANNEL_ID (${process.env.YOUTUBE_CHANNEL_ID}). Relance la connexion et choisis la bonne.`);
  }
  return ch;
}

function authedClient() {
  if (!exists(tokenPath())) fail('Pas encore connecté à YouTube. Lance d\'abord : montage youtube-connexion');
  const oauth = client();
  oauth.setCredentials(readJson(tokenPath()));
  oauth.on('tokens', (t) => writeJson(tokenPath(), { ...readJson(tokenPath()), ...t }));
  return oauth;
}

// ---------- Envoi ----------

export async function publish({ file, metadata, channelId, dryRun, outJson }) {
  writeJson(outJson, { file, channelId: channelId || null, requestBody: metadata, dryRun: Boolean(dryRun) });
  if (dryRun) {
    log('youtube', `Simulation : « ${metadata.snippet.title} » serait envoyée en ${metadata.status.privacyStatus}. Rien n'est envoyé.`);
    return { dryRun: true };
  }
  const yt = youtubeApi({ version: 'v3', auth: authedClient() });
  const me = await yt.channels.list({ part: ['id', 'snippet'], mine: true });
  const ch = me.data.items?.[0];
  if (!ch) fail('Aucune chaîne YouTube sur ce compte.');
  if (channelId && ch.id !== channelId) {
    fail(`Le compte connecté est « ${ch.snippet.title} » (${ch.id}), pas ${channelId}. Relance « montage youtube-connexion » et choisis la bonne chaîne.`);
  }
  log('youtube', `Envoi de ${path.basename(file)} sur « ${ch.snippet.title} » (${metadata.status.privacyStatus})…`);
  const size = fs.statSync(file).size;
  const res = await yt.videos.insert(
    { part: ['snippet', 'status'], notifySubscribers: false, requestBody: metadata, media: { body: fs.createReadStream(file) } },
    { onUploadProgress: (e) => process.stdout.write(`\r  ${Math.round((e.bytesRead / size) * 100)} %`) },
  );
  process.stdout.write('\n');
  const id = res.data.id;
  writeJson(outJson, { file, channelId: ch.id, videoId: id, url: `https://youtu.be/${id}`, privacy: res.data.status?.privacyStatus, requestBody: metadata });
  log('youtube', `En ligne (${res.data.status?.privacyStatus}) : https://youtu.be/${id}`);
  if (res.data.status?.privacyStatus !== metadata.status.privacyStatus) {
    log('youtube', `⚠️ YouTube a gardé la vidéo en « ${res.data.status?.privacyStatus} ». Cause probable : projet Google Cloud non audité (voir README, section YouTube).`);
  }
  return { videoId: id, url: `https://youtu.be/${id}` };
}
