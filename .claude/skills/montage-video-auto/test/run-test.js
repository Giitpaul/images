// Test complet sur la vidéo d'exemple (≈ 30 s).
// ElevenLabs est remplacé par un faux serveur local qui renvoie test/exemple/transcript.scribe.json :
// le code d'appel (multipart, en-tête, réponse) est exercé sans consommer de crédit.
// YouTube est testé en simulation (--simulation) : rien n'est envoyé.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ffprobe } from '../lib/util.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..');
const EX = path.join(HERE, 'exemple');
const OUT = path.join(HERE, 'sortie');

const received = [];
const server = http.createServer((req, res) => {
  let body = Buffer.alloc(0);
  req.on('data', (d) => { body = Buffer.concat([body, d]); });
  req.on('end', () => {
    const txt = body.toString('latin1');
    const ok = req.method === 'POST' && req.url === '/v1/speech-to-text' && req.headers['xi-api-key'] === 'cle-de-test'
      && /name="model_id"/.test(txt) && /name="timestamps_granularity"\r\n\r\nword/.test(txt) && /name="file"; filename="01_stt.wav"/.test(txt);
    received.push({ url: req.url, ok, bytes: body.length });
    if (!ok) { res.writeHead(400); res.end('requête invalide'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(fs.readFileSync(path.join(EX, 'transcript.scribe.json')));
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
fs.rmSync(OUT, { recursive: true, force: true });

const code = await new Promise((resolve) => {
  const p = spawn(process.execPath, [
    path.join(SKILL, 'bin', 'montage.js'), path.join(EX, 'exemple.mp4'),
    '--sortie', OUT, '--musique', path.join(EX, 'musique'), '--titre', 'Le bend', '--simulation',
  ], {
    stdio: 'inherit',
    env: { ...process.env, ELEVENLABS_API_KEY: 'cle-de-test', ELEVENLABS_BASE_URL: `http://127.0.0.1:${port}` },
  });
  p.on('close', resolve);
});
server.close();

const checks = [];
const check = (label, ok) => { checks.push({ label, ok }); console.log(`${ok ? '✅' : '❌'} ${label}`); };
check('Le montage se termine sans erreur', code === 0);
check('ElevenLabs Scribe appelé avec une requête conforme', received.length === 1 && received[0].ok);
for (const id of ['16x9', '9x16']) {
  const f = path.join(OUT, `exemple_${id}.mp4`);
  const okFile = fs.existsSync(f);
  check(`Fichier ${id} produit`, okFile);
  if (okFile) {
    const { stdout } = await ffprobe(['-show_entries', 'stream=codec_type,width,height', '-of', 'json', f]);
    const s = JSON.parse(stdout).streams;
    const v = s.find((x) => x.codec_type === 'video');
    check(`${id} : vidéo ${v.width}x${v.height} + piste audio`, Boolean(v) && s.some((x) => x.codec_type === 'audio') && (id === '16x9' ? v.width === 1920 : v.height === 1920));
  }
}
check('Rapport de relecture écrit', fs.existsSync(path.join(OUT, 'rapport.md')));
check('Envoi YouTube préparé (simulation, non répertorié)', fs.existsSync(path.join(OUT, '09_youtube.16x9.json'))
  && JSON.parse(fs.readFileSync(path.join(OUT, '09_youtube.16x9.json'), 'utf8')).requestBody.status.privacyStatus === 'unlisted');
const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `\n${failed} échec(s).` : '\nTest complet réussi.');
process.exit(failed ? 1 : 0);
