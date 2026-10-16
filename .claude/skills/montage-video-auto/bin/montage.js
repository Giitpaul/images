#!/usr/bin/env node
// Orchestrateur : une seule commande pour tout le montage.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadEnv, loadConfig, saveCorrection } from '../lib/config.js';
import { log, readJson, writeJson, exists, fail, formatInfo } from '../lib/util.js';
import { runPrepareAnalyze, runPrepareCut, probe, remapWords } from '../lib/prepare.js';
import { transcribe, importTranscript, voiceover } from '../lib/elevenlabs.js';
import { buildSpec } from '../lib/spec.js';
import { buildTimeline } from '../lib/timeline.js';
import { segmentPerson } from '../lib/segment.js';
import { renderFormat, stageBrandAssets, resetBundle } from '../lib/render.js';
import { buildMix, muxFinal } from '../lib/audio.js';
import { reviewPass, PASSES } from '../lib/review.js';
import { saveDetectedBrand } from '../lib/brand.js';
import { authorize, buildMetadata, publish } from '../lib/publish.js';

const STEPS = ['prepare', 'transcription', 'decoupe', 'spec', 'timeline', 'detourage', 'render', 'audio', 'relecture', 'publication'];

const AIDE = `
montage-video-auto : montage automatique d'une vidéo face caméra.

  montage <video> [options]                 Montage complet
  montage voixoff --texte "…" --sortie f.mp3 [--voix <id>]
  montage charte --projet <dossier Remotion>   Reprend couleurs, polices et logo
  montage youtube-connexion                    Connexion à la chaîne (une seule fois)

Options du montage :
  --sortie <dossier>        Dossier de travail (défaut : <video>_montage à côté de la vidéo)
  --formats 16:9,9:16       Formats à produire (défaut : les deux)
  --titre "…"               Titre affiché derrière la personne en ouverture
  --musique <dossier>       Pistes musicales (sous-dossiers enquete, profond, fun)
  --transcription <json>    Utilise une transcription existante (pas d'appel ElevenLabs)
  --depuis <étape>          Reprend à une étape : ${STEPS.join(', ')}
  --jusqua <étape>          S'arrête après cette étape
  --moteur mediapipe|rvm    Moteur de détourage
  --sans-detourage          Pas de détourage (titre d'ouverture devant la personne)
  --sans-musique            Pas de musique
  --sans-bruitages          Pas de bruitages
  --mots-cles "a,b,c"       Mots à mettre en valeur en priorité
  --config <json>           Fichier de réglages (fusionné avec config/default.json)
  --passes <n>              Nombre maximum de passes de relecture (défaut 6, minimum 3)
  --sans-publication        Ne pas envoyer sur YouTube
  --simulation              Prépare l'envoi YouTube sans rien envoyer
  --titre-youtube "…"       Titre YouTube (défaut : déduit du titre d'ouverture)
  --description "…"         Début de description YouTube (défaut : deux premières phrases)
`;

async function main() {
  loadEnv();
  const { values: o, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      sortie: { type: 'string' }, formats: { type: 'string' }, titre: { type: 'string' }, musique: { type: 'string' },
      transcription: { type: 'string' }, depuis: { type: 'string' }, jusqua: { type: 'string' }, moteur: { type: 'string' },
      'sans-detourage': { type: 'boolean' }, 'sans-musique': { type: 'boolean' }, 'sans-bruitages': { type: 'boolean' },
      'mots-cles': { type: 'string' }, config: { type: 'string' }, passes: { type: 'string' },
      'sans-publication': { type: 'boolean' }, simulation: { type: 'boolean' }, 'titre-youtube': { type: 'string' }, description: { type: 'string' },
      texte: { type: 'string' }, voix: { type: 'string' }, projet: { type: 'string' }, aide: { type: 'boolean', short: 'h' },
    },
  });

  if (o.aide || !positionals.length) { console.log(AIDE); return; }

  if (positionals[0] === 'voixoff') {
    if (!o.texte || !o.sortie) fail('Usage : montage voixoff --texte "…" --sortie fichier.mp3');
    const cfg = loadConfig({});
    await voiceover({ text: o.texte, out: o.sortie, voiceId: o.voix || cfg.voiceover.voiceId, model: cfg.voiceover.model });
    log('voixoff', `Créé : ${o.sortie}`);
    return;
  }
  if (positionals[0] === 'charte') {
    if (!o.projet) fail('Usage : montage charte --projet <dossier du projet Remotion>');
    saveDetectedBrand(path.resolve(o.projet));
    return;
  }

  if (positionals[0] === 'youtube-connexion') {
    await authorize();
    return;
  }

  const input = path.resolve(positionals[0]);
  if (!exists(input)) fail(`Vidéo introuvable : ${input}`);
  const name = path.basename(input, path.extname(input));
  const workDir = path.resolve(o.sortie ?? path.join(path.dirname(input), `${name}_montage`));
  fs.mkdirSync(workDir, { recursive: true });

  const cli = {};
  if (o.formats) cli.formats = o.formats.split(',').map((s) => s.trim());
  if (o.titre) cli.spec = { ...(cli.spec ?? {}), title: o.titre };
  if (o['mots-cles']) cli.spec = { ...(cli.spec ?? {}), keywords: o['mots-cles'].split(',').map((s) => s.trim()) };
  if (o.musique) cli.audio = { ...(cli.audio ?? {}), musicDir: path.resolve(o.musique) };
  if (o['sans-musique']) cli.audio = { ...(cli.audio ?? {}), musicDir: '' };
  if (o['sans-bruitages']) cli.audio = { ...(cli.audio ?? {}), sfx: false };
  if (o.moteur) cli.segmentation = { engine: o.moteur };
  if (o['sans-detourage']) cli.segmentation = { ...(cli.segmentation ?? {}), enabled: false };
  if (o.passes) cli.review = { maxPasses: Math.max(3, Number(o.passes)) };
  // Les options de la ligne de commande sont gardées pour les reprises (--depuis).
  const cliFile = path.join(workDir, 'options.json');
  const savedCli = exists(cliFile) && o.depuis ? readJson(cliFile) : {};
  const mergedCli = { ...savedCli, ...cli };
  writeJson(cliFile, mergedCli);
  const loadCfg = () => {
    const c = loadConfig({ workDir, configFile: o.config, cli: mergedCli });
    if (o['sans-musique'] || mergedCli.audio?.musicDir === '') c.audio.musicDir = '';
    return c;
  };
  let cfg = loadCfg();
  for (const f of cfg.formats) formatInfo(f);

  const from = STEPS.indexOf(o.depuis ?? 'prepare');
  const to = STEPS.indexOf(o.jusqua ?? 'publication');
  if (from < 0 || to < 0) fail(`Étape inconnue. Étapes : ${STEPS.join(', ')}`);
  const ctx = { input, workDir, name };
  const P = (f) => path.join(workDir, f);

  // ---------- Étapes ----------
  const steps = {
    async prepare() {
      const a = await runPrepareAnalyze({ ...ctx, cfg });
      writeJson(P('01_analyse.json'), { info: a.info, silences: a.silences, openEnd: a.openEnd });
    },
    async transcription() {
      const t = o.transcription
        ? importTranscript(path.resolve(o.transcription))
        : await transcribe(P('01_stt.wav'), cfg.transcription, workDir);
      writeJson(P('02_transcript.source.json'), t);
      log('transcription', `${t.words.length} mots : « ${t.text.slice(0, 90)}${t.text.length > 90 ? '…' : ''} »`);
    },
    async decoupe() {
      const a = readJson(P('01_analyse.json'));
      const t = readJson(P('02_transcript.source.json'));
      const r = await runPrepareCut({ ...ctx, cfg }, { ...a, words: t.words });
      // Événements audio (harmonica…) recalés eux aussi sur le montage.
      const ev = remapWords(t.events ?? [], r.keeps).words;
      writeJson(P('02_transcript.json'), { language: t.language, duration: r.duration, words: r.words, events: ev });
    },
    async spec() {
      const t = readJson(P('02_transcript.json'));
      const old = exists(P('03_spec.json')) ? readJson(P('03_spec.json')) : null;
      if (old?.locked) { log('spec', '03_spec.json verrouillé (locked: true) : gardé tel quel.'); return; }
      const spec = buildSpec({ words: t.words, events: t.events, duration: t.duration, cfg, title: cfg.spec.title });
      if (old?.voiceovers) spec.voiceovers = old.voiceovers;
      writeJson(P('03_spec.json'), spec);
      log('spec', `${spec.scenes.length} scène(s), ${spec.phrases.length} phrase(s), ${spec.phrases.filter((p) => p.keyword).length} mot(s)-clé(s), ${spec.harmonica.length} passage(s) d'harmonica, ambiances : ${spec.music.map((m) => m.mood).join(' → ')}`);
    },
    async timeline() {
      const spec = readJson(P('03_spec.json'));
      const cut = await probe(P('01_cut.mp4'));
      const brand = stageBrandAssets(workDir, cfg.brand);
      const matte = cfg.segmentation.enabled ? '05_fg.webm' : null;
      for (const fmt of cfg.formats) {
        const tl = buildTimeline(spec, fmt, cfg, { matte, srcWidth: cut.width, srcHeight: cut.height, logo: brand.logo });
        tl.brand = { ...tl.brand, ...brand };
        writeJson(P(`04_timeline.${formatInfo(fmt).id}.json`), tl);
        log('timeline', `${fmt} : ${tl.durationInFrames} frames, ${tl.subtitles.length} sous-titres, ${tl.elements.length} éléments`);
      }
    },
    async detourage() {
      if (!cfg.segmentation.enabled) { log('detourage', 'Désactivé.'); return; }
      if (exists(P('05_fg.webm')) && fs.statSync(P('05_fg.webm')).mtimeMs > fs.statSync(P('01_cut.mp4')).mtimeMs) {
        log('detourage', 'Détourage à jour, réutilisé.');
        return;
      }
      try {
        const r = await segmentPerson({ input: P('01_cut.mp4'), out: P('05_fg.webm'), engine: cfg.segmentation.engine, smoothing: cfg.segmentation.smoothing, threshold: cfg.segmentation.threshold });
        writeJson(P('05_detourage.json'), r);
      } catch (e) {
        // Le montage continue sans détourage : le titre d'ouverture passe devant la personne.
        fs.rmSync(P('05_fg.webm'), { force: true });
        writeJson(P('05_detourage.json'), { error: e.message });
        log('detourage', `⚠️ Détourage impossible, montage sans : ${e.message.split('\n').slice(-2).join(' ')}`);
      }
    },
    async render() {
      resetBundle(workDir);
      for (const fmt of cfg.formats) {
        const id = formatInfo(fmt).id;
        const tl = readJson(P(`04_timeline.${id}.json`));
        if (tl.video.fg && !exists(P(tl.video.fg))) tl.video.fg = null;
        await renderFormat({ workDir, timeline: tl, out: P(`06_video.${id}.mp4`), cfg });
      }
    },
    async audio() {
      const spec = readJson(P('03_spec.json'));
      const mix = await buildMix({ workDir, spec, cfg });
      writeJson(P('07_audio.json'), { music: mix.music, sfx: mix.sfx, loudnorm: mix.measured });
      for (const fmt of cfg.formats) {
        const id = formatInfo(fmt).id;
        const out = P(`${name}_${id}.mp4`);
        await muxFinal({ video: P(`06_video.${id}.mp4`), audio: mix.file, out });
        log('audio', `Fichier final : ${out}`);
      }
    },
    async relecture() {
      await reviewLoop();
    },
    async publication() {
      if (o['sans-publication']) { log('youtube', 'Publication désactivée (--sans-publication).'); return; }
      if (!o.simulation && (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET)) {
        log('youtube', 'Identifiants YouTube absents du .env : envoi ignoré.');
        return;
      }
      const spec = readJson(P('03_spec.json'));
      for (const fmt of cfg.publish.formats.filter((f) => cfg.formats.includes(f))) {
        const id = formatInfo(fmt).id;
        const metadata = buildMetadata({ spec, cfg, title: o['titre-youtube'], description: o.description, format: fmt });
        await publish({ file: P(`${name}_${id}.mp4`), metadata, channelId: process.env.YOUTUBE_CHANNEL_ID, dryRun: o.simulation, outJson: P(`09_youtube.${id}.json`) });
      }
    },
  };

  async function runRange(a, b) {
    for (let i = a; i <= b; i++) {
      cfg = loadCfg();
      await steps[STEPS[i]]();
    }
  }

  // ---------- Boucle montage → contrôle → correction ----------
  async function reviewLoop() {
    const minPasses = Math.max(3, cfg.review.minPasses);
    const maxPasses = Math.max(minPasses, cfg.review.maxPasses);
    const history = [];
    const applied = new Map();
    const validated = new Set();
    let pi = 0;
    for (let pass = 1; pass <= maxPasses; pass++) {
      cfg = loadCfg();
      const spec = readJson(P('03_spec.json'));
      const finals = {};
      const timelines = {};
      for (const fmt of cfg.formats) {
        const id = formatInfo(fmt).id;
        finals[fmt] = P(`${name}_${id}.mp4`);
        timelines[fmt] = readJson(P(`04_timeline.${id}.json`));
      }
      const def = PASSES[pi % PASSES.length];
      log('relecture', `Passe ${pass} — ${def.name}`);
      const r = await reviewPass(pi, { workDir, cfg, spec, finals, timelines });
      const failed = r.checks.filter((c) => !c.ok);
      const todo = r.corrections.filter((c) => (applied.get(c.note) ?? 0) < 2);
      history.push({ pass, kind: def.name, ...r, applied: todo.map((c) => c.note) });
      log('relecture', failed.length ? `${failed.length} point(s) à revoir : ${failed.map((c) => c.label).join(' ; ')}` : 'Tout est validé.');

      if (todo.length) {
        for (const c of todo) { saveCorrection(workDir, c.patch, c.note); applied.set(c.note, (applied.get(c.note) ?? 0) + 1); log('relecture', `Correction : ${c.note}`); }
        const earliest = Math.min(...todo.map((c) => STEPS.indexOf(c.from === 'cut' ? 'decoupe' : c.from)));
        // Une nouvelle découpe impose un nouveau détourage ; sinon on garde l'existant.
        await runRange(earliest, STEPS.indexOf('audio'));
        validated.clear();
        pi = 0;
      } else {
        validated.add(pi % PASSES.length);
        pi++;
        if (validated.size === PASSES.length && pass >= minPasses) break;
      }
    }
    writeReport(history);
  }

  function writeReport(history) {
    const spec = readJson(P('03_spec.json'));
    const audio = exists(P('07_audio.json')) ? readJson(P('07_audio.json')) : { music: [] };
    const keeps = readJson(P('01_keeps.json'));
    const last = new Map();
    for (const h of history) for (const c of h.checks) last.set(c.label, c);
    const remaining = [...last.values()].filter((c) => !c.ok);
    const rel = (f) => path.relative(workDir, f).split(path.sep).join('/');
    const imgs = history.flatMap((h) => h.images);
    const lines = [
      `# Rapport de montage : ${name}`,
      '',
      `Source : ${input}`,
      `Durée : ${keeps.sourceDuration.toFixed(1)} s → ${keeps.cutDuration.toFixed(1)} s après coupe des silences (${keeps.keeps.length} segments).`,
      `Fichiers : ${cfg.formats.map((f) => `\`${name}_${formatInfo(f).id}.mp4\``).join(', ')}`,
      '',
      `## Bilan : ${remaining.length ? `${remaining.length} point(s) restant(s)` : 'validé'}`,
      '',
      ...history.flatMap((h) => [
        `### Passe ${h.pass} — ${h.kind}`,
        '',
        ...h.checks.map((c) => `- ${c.ok ? '✅' : '❌'} ${c.label} : ${c.detail}`),
        ...h.metrics.map((m) => `- 📏 ${m.label} : ${m.value}`),
        ...(h.applied.length ? [`- 🔧 Corrections appliquées : ${h.applied.join(' ; ')}`] : []),
        '',
      ]),
      '## Questions mode agent',
      '',
      'À traiter par l\'agent (Claude Code) en ouvrant les images citées. Corriger dans `03_spec.json` puis relancer `montage <video> --depuis timeline`.',
      '',
    ];
    let q = 1;
    const ask = (s) => lines.push(`${q++}. ${s}`);
    for (const i of imgs.filter((x) => x.label.includes('planche'))) ask(`Ouvre \`${rel(i.file)}\`. Chaque sous-titre est-il lisible, entier, sans mot coupé ni chevauchement avec un autre élément ?`);
    for (const i of imgs.filter((x) => x.label.includes('titleBehind'))) ask(`Ouvre \`${rel(i.file)}\`. Le titre « ${spec.title} » passe-t-il derrière la personne, avec une silhouette nette et sans halo ? Le titre est-il le bon ?`);
    for (const i of imgs.filter((x) => x.label.includes('keyword')).slice(0, 4)) ask(`Ouvre \`${rel(i.file)}\`. Le mot mis en valeur masque-t-il le visage ou l'harmonica ?`);
    ask(`Mots-clés retenus : ${spec.phrases.filter((p) => p.keyword).map((p) => `« ${p.keyword.text} » (${p.keyword.start.toFixed(1)} s)`).join(', ') || 'aucun'}. Sont-ils les bons pour un harmoniciste ? Sinon, modifie les éléments \`keyword\` de la spec.`);
    ask(`Ambiances : ${spec.music.map((m) => `${m.mood} ${m.start.toFixed(0)}–${m.end.toFixed(0)} s`).join(', ')}. Pistes : ${audio.music.map((m) => path.basename(m.track)).join(', ') || 'aucune'}. Collent-elles au propos ?`);
    ask(`Passages d'harmonica détectés : ${spec.harmonica.map((h) => `${h.start.toFixed(1)}–${h.end.toFixed(1)} s`).join(', ') || 'aucun'}. En manque-t-il ou y en a-t-il de faux ?`);
    if (cfg.formats.includes('9:16')) ask('En 9:16, la personne et l\'harmonica sont-ils bien dans le cadre ? Sinon, ajuste `render.focusX` (0 = gauche, 1 = droite) dans montage.config.json.');
    for (const r of remaining) ask(`Point non résolu automatiquement : ${r.label} (${r.detail}). Que faut-il changer ?`);
    lines.push('', '## Corrections automatiques', '', '```json', exists(P('corrections.json')) ? fs.readFileSync(P('corrections.json'), 'utf8') : '{}', '```', '');
    fs.writeFileSync(P('rapport.md'), lines.join('\n'), 'utf8');
    log('relecture', `Rapport : ${P('rapport.md')}`);
  }

  await runRange(from, to);
  log('fin', `Terminé. Dossier : ${workDir}`);
}

main().catch((e) => {
  console.error(`\n❌ ${e.userFacing ? e.message : e.stack}`);
  process.exit(1);
});

