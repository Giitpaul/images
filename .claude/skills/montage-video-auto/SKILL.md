---
name: montage-video-auto
description: Monte automatiquement une vidéo brute face caméra (Paul, en français, souvent avec harmonica) en vidéo finie 16:9 et 9:16. Coupe les silences, transcrit avec ElevenLabs Scribe, ajoute motion design Remotion (titre derrière la personne détourée, mots-clés, zooms, transitions, sous-titres mot à mot), musique selon l'ambiance, bruitages, mixage normalisé, relecture automatique en 3 passes, puis envoi YouTube en non répertorié. À utiliser quand Paul demande de monter, découper, sous-titrer, habiller ou publier une vidéo brute.
---

# Montage vidéo auto

Une commande fait tout. Le skill tourne sur Windows (et Linux/Mac). Installation : `README-WINDOWS.md`.

## Quand l'utiliser

- « Monte cette vidéo », « coupe les blancs », « fais la version Short », « sous-titre et mets de la musique », « mets-la sur YouTube ».
- Entrée : un fichier vidéo brut (mp4, mov, mkv). Sortie : `<nom>_16x9.mp4`, `<nom>_9x16.mp4`, `rapport.md`, dans `<nom>_montage/` à côté de la vidéo.

## Commande

Depuis le dossier du skill (`%USERPROFILE%\.claude\skills\montage-video-auto`) :

```
node bin/montage.js "C:\Videos\brut.mp4" --titre "Le bend" --musique "D:\Musiques IA"
```

| Option | Effet |
|---|---|
| `--titre "…"` | Grand titre d'ouverture, derrière la personne |
| `--musique <dossier>` | Pistes IA, rangées dans `enquete/`, `profond/`, `fun/` (ou ces mots dans le nom de fichier). Défaut : `MUSIC_DIR` du `.env` |
| `--formats 16:9` | Un seul format (défaut : `16:9,9:16`) |
| `--mots-cles "bend,trou 4"` | Mots à mettre en valeur en priorité |
| `--transcription f.json` | Réutilise une transcription (aucun crédit ElevenLabs) |
| `--depuis <étape>` / `--jusqua <étape>` | Reprendre ou s'arrêter à une étape |
| `--moteur rvm` | Détourage Robust Video Matting (plus fin, plus lent). Défaut : MediaPipe |
| `--sans-detourage`, `--sans-musique`, `--sans-bruitages` | Désactive l'élément |
| `--sans-publication` | Pas d'envoi YouTube |
| `--simulation` | Prépare l'envoi YouTube sans rien envoyer (`09_youtube.*.json`) |
| `--titre-youtube "…"`, `--description "…"` | Métadonnées YouTube |
| `--passes <n>` | Passes de relecture maximum (défaut 6, minimum 3) |
| `--config f.json` | Réglages (fusionnés avec `config/default.json`) |

Autres commandes :

```
node bin/montage.js youtube-connexion                       # une seule fois : choisir la chaîne
node bin/montage.js charte --projet "C:\chemin\projet-remotion"  # reprendre couleurs, polices, logo
node bin/montage.js voixoff --texte "…" --sortie vo.mp3     # voix off ElevenLabs (option)
```

## Étapes (`--depuis` / `--jusqua`)

1. `prepare` : ffprobe, audio 16 kHz, `silencedetect` (seuil `silence.noiseDb`, durée `silence.minSilence`).
2. `transcription` : ElevenLabs Scribe, horodatage au mot. Mise en cache : relancer ne recoûte rien si l'audio n'a pas changé.
3. `decoupe` : coupe les silences sans jamais couper un mot, fondus courts aux raccords, recale les mots sur le montage.
4. `spec` : écrit `03_spec.json` (scènes, phrases, mots-clés, zooms, transitions, passages d'harmonica, ambiances musicales).
5. `timeline` : spec → `04_timeline.<format>.json`. Calcul en secondes, conversion en frames à la fin.
6. `detourage` : `05_fg.webm` (personne avec couche alpha) pour poser le titre derrière elle.
7. `render` : Remotion en Chrome headless, vidéo muette par format.
8. `audio` : voix + musique (ducking sous la voix, coupée pendant l'harmonica) + bruitages DSP (whoosh, pop, clic) → loudnorm −14 LUFS → fichiers finaux.
9. `relecture` : boucle contrôle → correction → nouveau rendu (voir plus bas).
10. `publication` : YouTube en **non répertorié**, sur la chaîne `YOUTUBE_CHANNEL_ID`. Ignorée si les identifiants YouTube manquent.

## Relecture automatique

Trois passes, répétées tant qu'une correction est appliquée (6 passes maximum) :

1. Technique : durées vidéo/audio, loudness, crête, synchro des sous-titres à la frame, durée d'affichage, débordement, chevauchements, Unicode.
2. Visuel : images extraites du fichier final, contraste des sous-titres (≥ 4,5:1), planches, images noires.
3. Coupes et son : clics aux raccords, mots rognés, écart voix/musique (≥ 12 dB), musique coupée pendant l'harmonica.

Les corrections (marge de coupe, fondus, niveau musique, longueur des lignes, fond des sous-titres…) sont gardées dans `corrections.json` et le montage repart de l'étape concernée.

## Ce que l'agent fait après le montage

1. Lire `rapport.md`.
2. Section **Questions mode agent** : ouvrir chaque image citée (outil Read) et répondre à chaque question dans le rapport.
3. Si un point est à revoir : modifier `03_spec.json` (mot-clé, titre, zoom, ambiance d'une séquence, passage d'harmonica), ajouter `"locked": true` à la racine pour que la spec ne soit pas régénérée, puis relancer `node bin/montage.js <video> --depuis timeline`. Pour un cadrage 9:16 décalé : `render.focusX` dans `<dossier>_montage/montage.config.json`.
4. Donner à Paul : chemins des fichiers finaux, lien YouTube (`09_youtube.16x9.json`), points restants.

## Règles

- Ne jamais modifier un projet existant de Paul ni sa structure. `charte` ne fait que lire.
- Dans le JSX, taper les caractères Unicode directement (é, ’, ♪, «), jamais `\uXXXX`. La relecture le vérifie.
- Toujours calculer les temps en secondes, convertir en frames au dernier moment (`secToFrame`).
- Publication YouTube : toujours non répertorié (`publish.privacy`). Ne pas passer en public sans demande explicite.
- Clés dans `.env` du skill, jamais dans le code ni dans le rapport.

## Réglages utiles (`config/default.json`, surchargeables par `<dossier>_montage/montage.config.json`)

- `silence.noiseDb` (−35) : monter à −30 si la pièce est bruyante, descendre à −40 si des fins de mots sont coupées.
- `silence.minSilence` (0,45 s), `silence.padding` (0,12 s) : rythme des coupes.
- `audio.musicDb` (−16), `audio.duck.*` : niveau et ducking de la musique.
- `subtitles.maxCharsPerLine` : 34 en 16:9, 18 en 9:16.
- `brand` (`config/brand.json`) : couleurs du logo, polices Luckiest Guy et Montserrat fournies en fichiers, logo `assets/logo.png`.
