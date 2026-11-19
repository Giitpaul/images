// Prépare l'audio et alignement.json selon AUDIO_MODE (config.json).
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {RACINE, lireConfig} from './outils.mjs';

const mode = lireConfig().AUDIO_MODE;
const commande =
	mode === 'B'
		? [process.platform === 'win32' ? 'python' : 'python3', [path.join(RACINE, 'scripts', 'transcrire_whisper.py')]]
		: [process.execPath, [path.join(RACINE, 'scripts', 'voix_elevenlabs.mjs')]];
const r = spawnSync(commande[0], commande[1], {stdio: 'inherit', cwd: RACINE});
process.exit(r.status ?? 1);
