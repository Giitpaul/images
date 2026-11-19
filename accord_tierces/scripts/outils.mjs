import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC = path.join(RACINE, 'public');

export const lireConfig = () => JSON.parse(fs.readFileSync(path.join(RACINE, 'config.json'), 'utf8'));

// Lecture simple du fichier .env (sans dépendance).
export const lireEnv = () => {
	const fichier = path.join(RACINE, '.env');
	const valeurs = {};
	if (fs.existsSync(fichier)) {
		for (const ligne of fs.readFileSync(fichier, 'utf8').split(/\r?\n/)) {
			const m = ligne.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
			if (m) valeurs[m[1]] = m[2].replace(/^["']|["']$/g, '');
		}
	}
	return {...valeurs, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('ELEVENLABS_')))};
};
