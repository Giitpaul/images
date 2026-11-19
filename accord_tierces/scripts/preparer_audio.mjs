// Prépare l'audio et alignement.json selon AUDIO_MODE (config.json).
// Mode A : ElevenLabs. Mode B : ton enregistrement, traité en voix radio, aligné sur le texte.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {RACINE, PUBLIC, lireConfig} from './outils.mjs';

const config = lireConfig();
const lancer = (cmd, args) => {
	const r = spawnSync(cmd, args, {stdio: 'inherit', cwd: RACINE});
	if (r.status !== 0) process.exit(r.status ?? 1);
};

// Voix radio : coupe des graves inutiles, réduction du souffle, chaleur, présence,
// de-esser, compression, limiteur, volume normalisé à -16 LUFS.
const VOIX_RADIO = [
	'highpass=f=85',
	'afftdn=nf=-30',
	'equalizer=f=140:t=q:w=1:g=2.5',
	'equalizer=f=320:t=q:w=1.2:g=-3',
	'equalizer=f=3500:t=q:w=1.5:g=3',
	'highshelf=f=9000:g=2',
	'deesser=i=0.4',
	'acompressor=threshold=-21dB:ratio=4:attack=5:release=90:makeup=4',
	'alimiter=limit=0.89',
	'loudnorm=I=-16:TP=-1.5:LRA=7',
	'aresample=44100',
].join(',');

if (config.AUDIO_MODE === 'B') {
	const source = path.join(RACINE, 'voix_off_paul.wav');
	const cible = path.join(PUBLIC, 'voix_off_paul.wav');
	const filtre = config.VOIX_RADIO === false ? 'anull' : VOIX_RADIO;
	lancer('ffmpeg', ['-v', 'error', '-y', '-i', source, '-af', filtre, '-ac', '1', '-c:a', 'pcm_s16le', cible]);
	console.log(`Voix ${config.VOIX_RADIO === false ? 'copiée' : 'traitée (radio)'} : public/voix_off_paul.wav`);
	if (config.METHODE_B === 'whisper') {
		lancer(process.platform === 'win32' ? 'python' : 'python3', [path.join(RACINE, 'scripts', 'transcrire_whisper.py')]);
	} else {
		lancer(process.platform === 'win32' ? 'python' : 'python3', [path.join(RACINE, 'scripts', 'aligner_signal.py')]);
	}
} else {
	lancer(process.execPath, [path.join(RACINE, 'scripts', 'voix_elevenlabs.mjs')]);
}
