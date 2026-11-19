// Extrait une image avant et après chaque mot clé, pour contrôler la synchro.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {RACINE, PUBLIC, lireConfig} from './outils.mjs';
import {calculerReperes, reperesAVerifier} from '../src/synchro.mjs';

const mode = lireConfig().AUDIO_MODE === 'B' ? 'B' : 'A';
const video = path.join(RACINE, 'sortie', `accord_tierces_mode${mode}.mp4`);
const dossier = path.join(RACINE, 'verification');
fs.rmSync(dossier, {recursive: true, force: true});
fs.mkdirSync(dossier, {recursive: true});

const alignement = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'alignement.json'), 'utf8'));
const reperes = reperesAVerifier(calculerReperes(alignement));

const image = (t, fichier) =>
	spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', Math.max(0, t).toFixed(3), '-i', video, '-frames:v', '1', '-vf', 'scale=960:-1', fichier]);

reperes.forEach(({nom, t}, i) => {
	const base = path.join(dossier, `${String(i + 1).padStart(2, '0')}_${nom.replace(/[^\p{L}\p{N}]+/gu, '_')}`);
	image(t - 0.1, `${base}_avant.jpg`);
	image(t + 0.5, `${base}_apres.jpg`);
	spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', `${base}_avant.jpg`, '-i', `${base}_apres.jpg`, '-filter_complex', 'hstack', `${base}.jpg`]);
	fs.rmSync(`${base}_avant.jpg`, {force: true});
	fs.rmSync(`${base}_apres.jpg`, {force: true});
	console.log(`${t.toFixed(2).padStart(6)} s  ${nom}`);
});
console.log(`\nImages (gauche : 0,1 s avant le mot, droite : 0,5 s après) dans ${dossier}`);
