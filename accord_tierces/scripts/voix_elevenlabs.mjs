// Mode A : génère voix_off.mp3 et alignement.json avec ElevenLabs.
import fs from 'node:fs';
import path from 'node:path';
import {RACINE, PUBLIC, lireEnv} from './outils.mjs';

const ENV_VIDE = 'ELEVENLABS_API_KEY=\nELEVENLABS_VOICE_ID=\n';

const env = lireEnv();
const cle = (env.ELEVENLABS_API_KEY || '').trim();
const voix = (env.ELEVENLABS_VOICE_ID || '').trim();

if (!cle || !voix) {
	const fichierEnv = path.join(RACINE, '.env');
	if (!fs.existsSync(fichierEnv)) fs.writeFileSync(fichierEnv, ENV_VIDE);
	console.error(`
Il manque ${!cle && !voix ? 'la clé API et l\'identifiant de voix' : !cle ? 'la clé API' : 'l\'identifiant de voix'} dans le fichier .env.

Clé API (ELEVENLABS_API_KEY) :
  Connecte-toi sur elevenlabs.io. En bas à gauche, clique sur ton nom,
  puis sur « API Keys ». Crée une clé et copie-la.

Identifiant de voix (ELEVENLABS_VOICE_ID) :
  Va dans « Voices », puis « My Voices ». Ouvre la voix choisie.
  Clique sur « ID » (ou les trois points, puis « Copy Voice ID »).

Colle les deux valeurs dans le fichier .env, juste après le signe =.
`);
	process.exit(1);
}

const texte = fs.readFileSync(path.join(RACINE, 'voix_off_elevenlabs.txt'), 'utf8').trim();

const reponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voix}/with-timestamps?output_format=mp3_44100_128`, {
	method: 'POST',
	headers: {'xi-api-key': cle, 'Content-Type': 'application/json'},
	body: JSON.stringify({text: texte, model_id: 'eleven_multilingual_v2'}),
});
if (!reponse.ok) {
	console.error(`ElevenLabs a refusé la demande (${reponse.status}) : ${await reponse.text()}`);
	process.exit(1);
}
const donnees = await reponse.json();
const al = donnees.alignment;

// Regroupe les caractères en mots. Ignore les balises <break ... />.
const mots = [];
let courant = null;
let dansBalise = false;
al.characters.forEach((c, i) => {
	if (c === '<') dansBalise = true;
	const lettre = !dansBalise && /[\p{L}\p{N}'’]/u.test(c);
	if (lettre) {
		if (!courant) courant = {mot: '', debut: al.character_start_times_seconds[i], fin: 0};
		courant.mot += c;
		courant.fin = al.character_end_times_seconds[i];
	} else if (courant) {
		mots.push(courant);
		courant = null;
	}
	if (c === '>') dansBalise = false;
});
if (courant) mots.push(courant);

fs.mkdirSync(PUBLIC, {recursive: true});
fs.writeFileSync(path.join(PUBLIC, 'voix_off.mp3'), Buffer.from(donnees.audio_base64, 'base64'));
fs.writeFileSync(
	path.join(PUBLIC, 'alignement.json'),
	JSON.stringify({mode: 'A', caracteres: al, mots}, null, 1),
);
console.log(`voix_off.mp3 et alignement.json écrits dans public/ (${mots.length} mots).`);
