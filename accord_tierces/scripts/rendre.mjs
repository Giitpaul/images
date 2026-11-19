// Rend la vidéo dans sortie/accord_tierces_modeA.mp4 ou _modeB.mp4.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {RACINE, lireConfig} from './outils.mjs';

const mode = lireConfig().AUDIO_MODE === 'B' ? 'B' : 'A';
const sortie = path.join('sortie', `accord_tierces_mode${mode}.mp4`);
const args = ['remotion', 'render', 'src/index.ts', 'AccordTierces', sortie, '--codec=h264', '--crf=18'];

// Navigateur déjà présent sur la machine (sinon Remotion télécharge le sien).
const navigateurs = [process.env.REMOTION_NAVIGATEUR, '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'];
const nav = navigateurs.find((n) => n && fs.existsSync(n));
if (nav) args.push(`--browser-executable=${nav}`);

const r = spawnSync('npx', args, {stdio: 'inherit', cwd: RACINE, shell: process.platform === 'win32'});
if (r.status === 0) console.log(`\nVidéo : ${path.join(RACINE, sortie)}`);
process.exit(r.status ?? 1);
