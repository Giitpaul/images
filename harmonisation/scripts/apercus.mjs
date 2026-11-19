// Aperçus : rend quelques images (demi taille) aux temps donnés. Usage : node scripts/apercus.mjs <projet> <dossier> t1 t2 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
const racine = process.argv[2], sortie = process.argv[3], temps = process.argv.slice(4).map(Number);
const serveUrl = await bundle({entryPoint: path.join(racine, 'src/index.ts'), publicDir: path.join(racine, 'public')});
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const composition = await selectComposition({serveUrl, id: 'Harmonisation', browserExecutable});
for (const t of temps) {
  await renderStill({serveUrl, composition, frame: Math.round(t * 30), output: path.join(sortie, `t${t.toFixed(2).padStart(7, '0')}.jpg`), imageFormat: 'jpeg', jpegQuality: 70, scale: 0.5, browserExecutable});
}
console.log('ok', temps.length);
