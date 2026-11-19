// Rendu de la vidéo : sortie/gamme_majeure.mp4
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = ['remotion', 'render', 'src/index.ts', 'GammeMajeure', 'sortie/gamme_majeure.mp4', '--codec=h264', '--crf=20', '--timeout=120000'];
const nav = [process.env.REMOTION_NAVIGATEUR, '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'].find((n) => n && fs.existsSync(n));
if (nav) args.push(`--browser-executable=${nav}`);
const extra = process.argv.slice(2);
const r = spawnSync('npx', [...args, ...extra], {stdio: 'inherit', cwd: RACINE, shell: process.platform === 'win32'});
process.exit(r.status ?? 1);
