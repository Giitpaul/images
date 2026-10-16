# Installation sous Windows, pas à pas

Compte 30 à 45 minutes, une seule fois. Toutes les commandes se tapent dans **PowerShell**.

## 1. Les outils

```powershell
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Python.Python.3.12
winget install Git.Git
```

Ferme puis rouvre PowerShell, puis vérifie :

```powershell
node -v      # v20 ou plus
ffmpeg -version
python --version   # 3.10 à 3.12
```

## 2. Le détourage (Python)

```powershell
python -m pip install mediapipe opencv-python numpy librosa
```

Option Robust Video Matting (plus fin, plus lent, utile surtout avec une carte NVIDIA) :

```powershell
python -m pip install torch torchvision
```

## 3. Le skill

Copie le dossier du skill dans tes skills Claude Code :

```powershell
git clone -b ccr-a4ad934b-26pk3a https://github.com/Giitpaul/images.git $env:TEMP\images
robocopy "$env:TEMP\images\.claude\skills\montage-video-auto" "$env:USERPROFILE\.claude\skills\montage-video-auto" /E
cd "$env:USERPROFILE\.claude\skills\montage-video-auto"
npm install
```

Au premier rendu, Remotion télécharge son Chrome headless (environ 100 Mo).

## 4. Les clés (.env)

```powershell
copy .env.example .env
notepad .env
```

- `ELEVENLABS_API_KEY` : elevenlabs.io > Settings > API Keys. La transcription Scribe se paie au temps d'audio.
- `MUSIC_DIR` : ton dossier de musiques IA, avec trois sous-dossiers `enquete`, `profond`, `fun`.
- `ELEVENLABS_VOICE_ID` : seulement pour la voix off.

## 5. YouTube (envoi en non répertorié)

1. Va sur console.cloud.google.com, crée un projet (ex. « Montage harmonica »).
2. « API et services » > « Bibliothèque » > active **YouTube Data API v3**.
3. « Écran de consentement OAuth » : type Externe, ajoute ton adresse Gmail comme utilisateur test, puis passe l'application **en production**. En mode test, la connexion expire tous les 7 jours.
4. « Identifiants » > « Créer des identifiants » > « ID client OAuth » > type **Application de bureau**.
5. Copie l'ID client et le code secret dans `.env` (`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`).
6. `YOUTUBE_CHANNEL_ID` : YouTube Studio > Paramètres > Chaîne > Paramètres avancés (commence par `UC`).
7. Connexion, une seule fois :

```powershell
node bin/montage.js youtube-connexion
```

Le navigateur s'ouvre, choisis le compte **et la chaîne**. Le jeton est gardé dans `%USERPROFILE%\.montage-video-auto\`.

**Limite Google à connaître** : un projet Google Cloud non audité ne peut envoyer qu'en **privé**. YouTube forcera « privé » même si le skill demande « non répertorié », et le skill te le signalera. Pour débloquer le non répertorié, demande l'audit gratuit : formulaire « YouTube API Services Audit and Quota Extension ». En attendant, passe la vidéo en non répertorié à la main dans YouTube Studio (deux clics).

Quota : 10 000 unités par jour, un envoi en coûte environ 1 600. Tu peux donc envoyer environ 6 vidéos par jour.

## 6. Ta charte Remotion (facultatif)

Si tu as déjà un projet Remotion avec tes couleurs et ton logo :

```powershell
node bin/montage.js charte --projet "C:\chemin\vers\ton-projet-remotion"
```

Rien n'est modifié dans ton projet. La charte est enregistrée dans `%USERPROFILE%\.montage-video-auto\brand.json`. Sans cette étape, le skill prend les couleurs de ton logo (rouge, brun, crème) et les polices Luckiest Guy et Montserrat, fournies avec le skill.

## 7. Le test

```powershell
npm test
```

Monte la vidéo d'exemple de 30 s (`test\exemple\`). ElevenLabs est remplacé par un faux serveur local (aucun crédit consommé) et l'envoi YouTube est simulé. Le résultat arrive dans `test\sortie\` : deux vidéos, `rapport.md`, images de contrôle dans `08_relecture\`.

## 8. Utilisation

```powershell
node bin/montage.js "D:\Rushs\bend-trou-4.mp4" --titre "Le bend"
```

Ou dans Claude Code : « Monte D:\Rushs\bend-trou-4.mp4 avec le titre Le bend ». Claude lit le rapport, regarde les images de contrôle et corrige si besoin.

## Temps de calcul

Mesuré sur un processeur à 4 cœurs, sans carte graphique, pour 25 s de vidéo :

| Étape | Durée |
|---|---|
| Coupe des silences | ≈ 10 s |
| Détourage MediaPipe | ≈ 45 s |
| Rendu Remotion, par format | ≈ 3 min |
| Son et relecture | ≈ 40 s |

Repère : le rendu prend environ 7 fois la durée de la vidéo par format sur ce type de machine. Un PC de bureau récent (8 cœurs ou plus) va 2 à 3 fois plus vite. Pendant le rendu, la console affiche le temps restant et l'heure de fin estimée. Pour gagner du temps : `--formats 16:9`.

## En cas de souci

| Message | Solution |
|---|---|
| `Impossible de lancer « ffmpeg »` | FFmpeg absent du PATH : rouvre PowerShell, ou mets le chemin complet dans `FFMPEG_PATH` |
| `Impossible de lancer « python »` | Mets le chemin de python.exe dans `PYTHON_PATH` |
| `Détourage impossible` | Le montage continue sans détourage. Vérifie `python -m pip install mediapipe opencv-python` |
| Fins de mots coupées | Dans `montage.config.json` du dossier de sortie : `{ "silence": { "noiseDb": -40, "padding": 0.18 } }` puis `--depuis decoupe` |
| Trop de blancs gardés | `{ "silence": { "noiseDb": -30, "minSilence": 0.35 } }` |
