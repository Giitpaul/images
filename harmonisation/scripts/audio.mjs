// Synthétise les notes de piano doux et les bruitages, calés sur la voix (public/alignement.json),
// puis mélange avec la voix off. Écrit public/notes.wav puis public/mix.wav.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {calculerReperes, notes, bruitages} from '../src/synchro.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = calculerReperes(JSON.parse(fs.readFileSync(path.join(RACINE, 'public', 'alignement.json'), 'utf8')));
const DUREE = R.duree;
const SR = 44100;
const N = Math.ceil(DUREE * SR);
const G = new Float32Array(N);
const D = new Float32Array(N);

// Bruit pseudo aléatoire reproductible
let graine = 12345;
const alea = () => ((graine = (graine * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

const ajoute = (i, v, pan = 0) => {
	if (i < 0 || i >= N) return;
	G[i] += v * Math.min(1, 1 - pan);
	D[i] += v * Math.min(1, 1 + pan);
};

// Piano doux : harmoniques qui s'éteignent vite, attaque courte.
const piano = (t, midi, d, vel) => {
	const fq = 440 * Math.pow(2, (midi - 69) / 12);
	const longueur = Math.min(d + 1.6, 4);
	const i0 = Math.round(t * SR);
	const pan = ((midi - 66) / 24) * 0.6;
	const harmo = [1, 0.5, 0.28, 0.14, 0.08, 0.04];
	for (let j = 0; j < longueur * SR; j++) {
		const s = j / SR;
		let v = 0;
		for (let h = 0; h < harmo.length; h++) {
			const fh = fq * (h + 1) * (1 + 0.0004 * h * h);
			if (fh > 16000) break;
			v += harmo[h] * Math.sin(2 * Math.PI * fh * s) * Math.exp(-s * (1.4 + h * 1.1));
		}
		const attaque = Math.min(1, s / 0.004);
		const relache = s > d ? Math.exp(-(s - d) * 6) : 1;
		ajoute(i0 + j, v * attaque * relache * 0.16 * vel, pan);
	}
};

const pop = (t) => {
	const i0 = Math.round(t * SR);
	let phase = 0;
	for (let j = 0; j < 0.09 * SR; j++) {
		const s = j / SR;
		const fq = 900 - 5000 * s;
		phase += (2 * Math.PI * Math.max(fq, 200)) / SR;
		ajoute(i0 + j, Math.sin(phase) * Math.exp(-s * 45) * 0.12);
	}
};

const whoosh = (t) => {
	const i0 = Math.round(t * SR);
	const L = 0.55 * SR;
	let bas = 0;
	let bas2 = 0;
	for (let j = 0; j < L; j++) {
		const p = j / L;
		const coupure = 0.02 + 0.25 * Math.sin(Math.PI * p);
		bas += coupure * (alea() - bas);
		bas2 += coupure * (bas - bas2);
		const env = Math.sin(Math.PI * p) ** 2;
		ajoute(i0 + j, (bas - bas2) * env * 0.5, (p - 0.5) * 1.2);
	}
};

const eclat = (t) => {
	const i0 = Math.round(t * SR);
	const fqs = [2093, 2637, 3136, 4186];
	fqs.forEach((fq, k) => {
		const dec = Math.round(k * 0.035 * SR);
		for (let j = 0; j < 0.6 * SR; j++) {
			const s = j / SR;
			ajoute(i0 + dec + j, Math.sin(2 * Math.PI * fq * s) * Math.exp(-s * 9) * 0.05, k % 2 ? 0.4 : -0.4);
		}
	});
};

const alerte = (t) => {
	const i0 = Math.round(t * SR);
	[[880, 0], [660, 0.16]].forEach(([fq, d]) => {
		const j0 = Math.round(d * SR);
		for (let j = 0; j < 0.14 * SR; j++) {
			const s = j / SR;
			ajoute(i0 + j0 + j, Math.sign(Math.sin(2 * Math.PI * fq * s)) * Math.exp(-s * 18) * 0.035);
		}
	});
};

for (const n of notes(R)) piano(n.t, n.midi, n.d, n.v);
for (const b of bruitages(R)) ({pop, whoosh, eclat, alerte})[b.type](b.t);

// Petite réverbération (échos décroissants, décalés à gauche et à droite)
const echos = [
	[0.031, 0.22, 0.037],
	[0.067, 0.16, 0.059],
	[0.113, 0.11, 0.097],
	[0.171, 0.07, 0.149],
];
const G2 = Float32Array.from(G);
const D2 = Float32Array.from(D);
for (const [tg, a, td] of echos) {
	const og = Math.round(tg * SR);
	const od = Math.round(td * SR);
	for (let i = 0; i < N; i++) {
		if (i + og < N) G2[i + og] += D[i] * a;
		if (i + od < N) D2[i + od] += G[i] * a;
	}
}

// Normalisation et fondu final
let crete = 0;
for (let i = 0; i < N; i++) crete = Math.max(crete, Math.abs(G2[i]), Math.abs(D2[i]));
const gain = 0.89 / crete;
const fondu = Math.round(1.0 * SR);
const tampon = Buffer.alloc(44 + N * 4);
tampon.write('RIFF', 0);
tampon.writeUInt32LE(36 + N * 4, 4);
tampon.write('WAVEfmt ', 8);
tampon.writeUInt32LE(16, 16);
tampon.writeUInt16LE(1, 20);
tampon.writeUInt16LE(2, 22);
tampon.writeUInt32LE(SR, 24);
tampon.writeUInt32LE(SR * 4, 28);
tampon.writeUInt16LE(4, 32);
tampon.writeUInt16LE(16, 34);
tampon.write('data', 36);
tampon.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
	const env = i > N - fondu ? (N - i) / fondu : 1;
	tampon.writeInt16LE(Math.round(Math.max(-1, Math.min(1, G2[i] * gain * env)) * 32767), 44 + i * 4);
	tampon.writeInt16LE(Math.round(Math.max(-1, Math.min(1, D2[i] * gain * env)) * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(RACINE, 'public', 'notes.wav'), tampon);

// Voix radio : coupe des graves inutiles, chaleur, présence, de-esser, compression, volume normalisé.
const VOIX = [
	'highpass=f=85',
	'equalizer=f=140:t=q:w=1:g=2',
	'equalizer=f=320:t=q:w=1.2:g=-3',
	'equalizer=f=3500:t=q:w=1.5:g=3',
	'highshelf=f=9000:g=1.5',
	'deesser=i=0.4',
	'acompressor=threshold=-24dB:ratio=3.5:attack=5:release=90:makeup=3',
	'loudnorm=I=-16:TP=-1.5:LRA=7',
	'aresample=44100',
	'aformat=channel_layouts=stereo',
].join(',');

// Mélange : voix au premier plan, notes et bruitages dessous.
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(RACINE, 'voix_off.wav'), '-i', path.join(RACINE, 'public', 'notes.wav'),
	'-filter_complex', `[0]atrim=0:${DUREE.toFixed(2)},${VOIX}[v];[1]volume=0.4[n];[v][n]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.95[m]`,
	'-map', '[m]', '-ar', '44100', '-c:a', 'pcm_s16le', path.join(RACINE, 'public', 'mix.wav')], {stdio: 'inherit'});
if (r.status !== 0) process.exit(1);
console.log(`public/notes.wav et public/mix.wav écrits (${DUREE.toFixed(2)} s).`);
