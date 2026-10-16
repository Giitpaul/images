// Fabrique la vidéo d'exemple du test (déjà fournie dans test/exemple/ : à relancer seulement pour la recréer).
// Besoin : espeak-ng (voix française de synthèse) + FFmpeg.
// Produit : exemple.mp4 (≈ 25 s : paroles, silences, passage d'harmonica), transcript.scribe.json (format ElevenLabs), musique/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, ffmpeg, ffprobe, round3, SKILL_DIR } from '../lib/util.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'exemple');
const TMP = path.join(DIR, 'tmp');

const SCRIPT = [
  { say: "Salut, c'est Paul d'apprendre l'harmonica.", pause: 1.2 },
  { say: "Aujourd'hui, je te montre le secret du bend sur le trou quatre.", pause: 0.9 },
  { say: 'Pourquoi ta note sonne faux ? C’est souvent une question de langue.', pause: 1.0 },
  { harmonica: 3.6, pause: 0.7 },
  { say: 'Tu entends la différence ? Le son descend, il devient plus profond.', pause: 1.3 },
  { say: "Allez, à toi de jouer, c'est super facile avec la tablature.", pause: 0.8 },
  { say: 'Abonne-toi pour la suite, on se retrouve sur le site.', pause: 0.6 },
];

const dur = async (f) => Number((await ffprobe(['-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f])).stdout.trim());

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
  const parts = [];
  const words = [];
  let t = 0.5;
  parts.push({ file: null, silence: 0.5 });
  for (const [i, s] of SCRIPT.entries()) {
    if (s.say) {
      const raw = path.join(TMP, `s${i}_raw.wav`);
      const wav = path.join(TMP, `s${i}.wav`);
      await run('espeak-ng', ['-v', 'fr-fr', '-s', '150', '-w', raw, s.say]);
      // Retire le silence de début/fin d'espeak pour des horodatages précis.
      await ffmpeg(['-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,aresample=48000', '-ac', '1', wav]);
      const d = await dur(wav);
      const toks = s.say.split(/\s+/);
      const total = toks.reduce((n, w) => n + w.length + 1, 0);
      let acc = 0;
      for (const w of toks) {
        const ws = t + (acc / total) * d;
        acc += w.length + 1;
        const we = t + (acc / total) * d - 0.03;
        words.push({ text: w, start: round3(ws), end: round3(we), type: 'word', speaker_id: 'speaker_0' });
        words.push({ text: ' ', start: round3(we), end: round3(we), type: 'spacing', speaker_id: 'speaker_0' });
      }
      parts.push({ file: wav });
      t += d;
    } else {
      const wav = path.join(TMP, `s${i}.wav`);
      const f = '(392-24*min(1,max(0,t-1.2)/0.8)+3*sin(2*PI*5.5*t))';
      const env = `min(1,t/0.08)*min(1,(${s.harmonica}-t)/0.25)`;
      await ffmpeg(['-f', 'lavfi', '-i', `aevalsrc='0.22*${env}*(sin(2*PI*${f}*t)+0.6*sin(4*PI*${f}*t)+0.35*sin(6*PI*${f}*t)+0.2*sin(8*PI*${f}*t))':s=48000:d=${s.harmonica}`, wav]);
      words.push({ text: '(harmonica)', start: round3(t), end: round3(t + s.harmonica), type: 'audio_event', speaker_id: 'speaker_0' });
      parts.push({ file: wav });
      t += s.harmonica;
    }
    parts.push({ file: null, silence: s.pause });
    t += s.pause;
  }

  // Assemblage de la piste son (voix + silences avec léger bruit de fond).
  const list = [];
  for (const [i, p] of parts.entries()) {
    if (p.file) list.push(p.file);
    else {
      const f = path.join(TMP, `sil${i}.wav`);
      await ffmpeg(['-f', 'lavfi', '-i', `anoisesrc=c=pink:a=0.002:d=${p.silence}:r=48000`, '-ac', '1', f]);
      list.push(f);
    }
  }
  const concat = path.join(TMP, 'list.txt');
  fs.writeFileSync(concat, list.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
  const audio = path.join(TMP, 'voix.wav');
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', concat, '-c:a', 'pcm_s16le', audio]);
  const total = await dur(audio);

  // Image : le personnage du logo devant un fond, léger mouvement de tête.
  const logo = path.join(SKILL_DIR, 'assets', 'logo.png');
  await ffmpeg([
    '-f', 'lavfi', '-i', `gradients=s=1920x1080:c0=0x3a4a5a:c1=0xc9b79c:x0=0:y0=0:x1=1920:y1=1080:d=${total}:r=30`,
    '-loop', '1', '-i', logo, '-i', audio,
    '-filter_complex', `[1:v]scale=900:-1[p];[0:v][p]overlay=x=(W-w)/2+14*sin(t*1.3):y=H-h+60+8*sin(t*2.1):shortest=1[v]`,
    '-map', '[v]', '-map', '2:a', '-t', String(total), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', path.join(DIR, 'exemple.mp4'),
  ]);

  const text = SCRIPT.filter((s) => s.say).map((s) => s.say).join(' ');
  fs.writeFileSync(path.join(DIR, 'transcript.scribe.json'), JSON.stringify({ language_code: 'fra', language_probability: 0.99, text, words }, null, 2));

  // Trois pistes musicales de test, une par ambiance.
  const tracks = {
    enquete: "0.18*(sin(2*PI*110*t)*(0.5+0.5*sin(2*PI*2*t))+0.5*sin(2*PI*130.8*t)*(0.5+0.5*sin(2*PI*1*t+1)))",
    profond: '0.15*(sin(2*PI*130.8*t)+0.7*sin(2*PI*164.8*t)+0.5*sin(2*PI*196*t))*(0.7+0.3*sin(2*PI*0.25*t))',
    fun: '0.15*(sin(2*PI*(262+131*mod(floor(t*4),3))*t)*exp(-6*mod(t,0.25))+0.6*sin(2*PI*65.4*t)*exp(-8*mod(t,0.5)))',
  };
  for (const [mood, expr] of Object.entries(tracks)) {
    const d = path.join(DIR, 'musique', mood);
    fs.mkdirSync(d, { recursive: true });
    await ffmpeg(['-f', 'lavfi', '-i', `aevalsrc='${expr}':s=44100:d=30`, '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '96k', path.join(d, `test_${mood}.mp3`)]);
  }
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`Vidéo d'exemple : ${path.join(DIR, 'exemple.mp4')} (${total.toFixed(1)} s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
