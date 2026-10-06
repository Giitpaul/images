# Rendu programmatique et motion design pour un monteur vidéo automatique (sous-titres animés, zooms, musique, overlays, tablature harmonica)

Contexte cible : YouTuber français non-développeur (Paul, apprendrelharmonica.com), chaîne monétisée, rendu local, souvent sans GPU NVIDIA, pilotage par Claude Code. Recherche faite le 2026-10-06. Plusieurs domaines (remotion.dev, pkgpulse.com) étaient bloqués par le proxy : certains chiffres viennent donc d'extraits de moteur de recherche et non d'une lecture complète de la page (signalé à chaque fois).

## Moteurs de rendu : langage, licence, coût, vitesse, GPU, OS, maturité, facilité pour un agent IA

### Takeaway
Pour ce profil, deux moteurs « HTML/navigateur headless » dominent : Remotion (React, gratuit pour un individu ou une société de 3 personnes au plus) et HyperFrames de HeyGen (HTML + GSAP, Apache 2.0, livré avec 21 skills pour agents). Paul a déjà des pipelines Remotion en production (videotab, skillick, grille animée) et les skills HyperFrames sont installés dans son environnement. FFmpeg reste la couche indispensable en dessous (audio, ducking, loudness, ASS) ; les API cloud (Shotstack, Creatomate) coûtent environ 0,10 à 0,40 $ la minute rendue et n'apportent rien d'indispensable à un rendu local.

### Cited Findings
**Remotion (React/TypeScript)**
- Licence « Remotion Free License » : gratuite pour « an individual », « a for-profit organization with up to 3 employees », les associations à but non lucratif, et pour l'évaluation ; usage commercial autorisé « for the purpose of creating videos and images ». Les autres organisations doivent acheter une Company License (renvoi vers remotion.pro/license). — [Remotion LICENSE.md (GitHub)](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
- Tarifs 2026 (extrait de recherche, page remotion.dev bloquée à la lecture) : « Remotion for Automators » 0,01 $ par rendu avec un minimum de 100 $/mois ; « Remotion for Creators » 25 $ par siège et par mois, sans minimum de sièges, pour la création manuelle à faible volume ; Enterprise à partir de 500 $/mois. Une licence devient obligatoire dès que 4 personnes ou plus d'une entreprise à but lucratif travaillent sur le projet Remotion. — [remotion.dev/docs/license/pricing (via extrait de recherche)](https://www.remotion.dev/docs/license/pricing); [Spotsaas review](https://www.spotsaas.com/blog/remotion-review)
- Environ 60 000 téléchargements npm par semaine, maintenance active, rendu côté serveur et via GitHub Actions. — [pkgpulse comparatif 2026 (via extrait de recherche)](https://www.pkgpulse.com/guides/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026)
- Sous-titres : `@remotion/captions` fournit `createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds})`, qui découpe les tokens en « pages ». Une valeur élevée met beaucoup de mots par page, une valeur basse donne une animation mot par mot. La fonction tourne dans le navigateur, sous Node.js et sous Bun. — [Remotion docs : create-tiktok-style-captions](https://remotion.dev/docs/captions/create-tiktok-style-captions)
- Une chaîne de transcription existe aussi (whisper.cpp vers captions). — [Remotion docs : install-whisper-cpp/convert-to-captions](https://v4.remotion.dev/docs/install-whisper-cpp/convert-to-captions)

**HyperFrames (HeyGen)**
- Licence Apache 2.0, développé en TypeScript. Les compositions sont des fichiers HTML avec des attributs `data-*` pour le minutage et les pistes ; les animations seekables utilisent GSAP, Lottie, Three.js, Anime.js ou la Web Animations API. « No React requirement, no proprietary timeline format. » — [GitHub heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
- CLI : `init`, `preview`, `lint`, `check`, `snapshot`, `render`, `publish`, plus le rendu cloud HeyGen et AWS Lambda. Le rendu local demande Node.js 22+, FFmpeg et Chrome headless. macOS, Linux et Windows sont mentionnés. Le dépôt compte environ 57 400 étoiles et 5 279 commits. Le README ne donne pas de chiffre de vitesse. — [GitHub heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
- 21 skills sont fournis pour les agents (Claude Code, Copilot, Cursor, Gemini CLI). Parmi eux, `/embedded-captions` (sous-titres sur talking-head en 3 styles : rail verbatim, climax intégré, embed cinématique). — [GitHub heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
- Le rendu est déterministe : il ouvre la page dans Chrome headless (Puppeteer) et demande chaque image exacte via beginFrame, sans lecture temps réel, donc sans image perdue sur une machine lente. HyperFrames reconnaît reprendre des patterns de Remotion (flags Chrome, flux image2pipe vers FFmpeg). Sur macOS et Windows, le mode déterministe se replie sur `Page.captureScreenshot` avec des heuristiques, parce que Chrome y plante sous `--deterministic-mode`. Les rendus de production tournent dans Docker sous Linux ; le dev local marche partout, « with lower fidelity on non-Linux ». — [HeyGen research : html-to-video](https://www.heygen.com/research/html-to-video); [pyshine : What is HyperFrames](https://pyshine.com/HyperFrames-Write-HTML-Render-Video-Built-for-Agents/) (sources secondaires, résumé de recherche)
- Le MCP hébergé HyperFrames désactive `compose` et `render_video` pour les agents CLI (Claude Code) et les renvoie vers les skills locaux (`npx skills add heygen-com/hyperframes`). — instructions du serveur MCP HyperFrames by HeyGen visibles dans cette session (source primaire, pas d'URL)

**Revideo / Motion Canvas**
- Motion Canvas : framework TypeScript à générateurs, avec éditeur temps réel, pensé pour les vidéos explicatives ; environ 8 000 téléchargements par semaine. — [pkgpulse (via extrait de recherche)](https://www.pkgpulse.com/guides/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026)
- Revideo : fork de Motion Canvas qui ajoute le rendu headless et l'audio. « As of 2026 it has folded into Midrender, a visual motion-graphics editor on the same engine », donc sa feuille de route suit un produit commercial ; environ 3 000 téléchargements par semaine. — [pkgpulse (via extrait de recherche)](https://www.pkgpulse.com/guides/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026)

**MoviePy v2 (Python)**
- La v2.0 a apporté de gros changements cassants et la v1 n'est plus maintenue. Versions récentes sur PyPI : 2.1.2, puis 2.2.1. Le dépôt cherche des mainteneurs. MoviePy est « slower than using ffmpeg directly due to heavier data import/export ». — [PyPI moviepy](https://pypi.python.org/pypi/moviepy); [GitHub Zulko/moviepy](https://github.com/Zulko/moviepy)

**Editly (Node.js + FFmpeg)**
- Montage non linéaire déclaratif (CLI ou spécification JSON/JSON5) avec titres, shaders GL, écrans Canvas/Fabric.js personnalisés et montage en streaming ; environ 4 955 étoiles. Je n'ai trouvé aucune date de dernière version. — [awesome.ecosyste.ms : mifi/editly](https://awesome.ecosyste.ms/projects/github.com%2Fmifi%2Feditly); [blog mifi](https://mifi.no/blog/editly-slick-declarative-command-line-video-editing/)

**Shotstack / Creatomate (API cloud)**
- Shotstack : à partir de 39 $/mois pour 200 crédits, 1 crédit = 1 minute rendue jusqu'en 1080p ; 0,40 $/min en paiement à l'usage, environ 0,20 $/min avec un abonnement ; 4K et 60 i/s au même prix. — [wireflow : shotstack pricing](https://www.wireflow.ai/blog/shotstack-pricing)
- Creatomate : formule Essential à 54 $/mois pour 2 000 crédits, soit 0,10 à 0,84 $ la minute selon la résolution et la cadence ; environ 0,14 $/min au palier à 99 $. — [wireflow : creatomate vs shotstack](https://www.wireflow.ai/blog/creatomate-vs-shotstack); [Creatomate compare](https://creatomate.com/compare/shotstack-alternative). Les chiffres diffèrent un peu selon les sources (Shotstack « 49 $ pour 200 min de 720p ») : prix à revérifier sur les pages officielles.

**Précédent local chez Paul**
- Ses skills internes `videotab`, `skillick` et `grille-animee-backing-track` produisent déjà des vidéos Remotion (tablature harmonica animée en 9:16, grille d'accords 1920×1080 à 30 i/s synchronisée au backing track). `grille-animee-backing-track` est « rendue sans jamais utiliser le GPU ». — fichiers SKILL.md locaux (/root/.claude/skills/synced/…/videotab, skillick, grille-animee-backing-track)

### Inferences
- Statut de licence Remotion pour Paul : s'il est seul (micro-entrepreneur, ou moins de 4 personnes sur le projet), la Free License couvre l'usage commercial et une chaîne YouTube monétisée. Il n'aurait à payer (25 $/siège/mois en Creators, ou 0,01 $/rendu avec 100 $/mois minimum en Automators) que s'il embauchait 4 personnes ou plus sur le projet. À confirmer sur la page officielle, que je n'ai pas pu lire.
- Rendu sans GPU : Remotion et HyperFrames rendent avec Chrome headless + FFmpeg, donc sur CPU. Aucune carte NVIDIA n'est requise, et le pipeline grille animée de Paul le prouve. La vitesse dépend surtout du nombre de cœurs CPU et de la complexité CSS/WebGL. Je n'ai trouvé aucun benchmark chiffré.
- Facilité pour Claude Code : HyperFrames (HTML/CSS/GSAP, skills officiels pour agents, `lint`/`check`/`snapshot`) et Remotion (React, très présent dans les données d'entraînement, skills « remotion-best-practices » publics) sont les deux plus faciles à écrire pour un agent. FFmpeg filtergraph et ASS restent faciles pour des tâches ciblées (audio, sous-titres). Motion Canvas et Revideo sont moins documentés et leur avenir est incertain.
- Sous Windows ou macOS, HyperFrames prévient d'une fidélité moindre hors Linux. Un rendu dans Docker ou WSL2 peut être plus sûr pour la version finale.
- Recommandation implicite : garder Remotion pour la tablature (déjà en production), utiliser HyperFrames ou Remotion pour les overlays, et FFmpeg pour l'audio et l'assemblage final.

### Gaps
- Page officielle des tarifs Remotion non lue (domaine bloqué) : chiffres issus d'extraits de recherche.
- Pas de benchmark de vitesse de rendu (images/s) fiable pour Remotion, HyperFrames, MoviePy ou Editly sur CPU grand public.
- PyAV : aucune source consultée (bindings Python de FFmpeg, licence BSD selon mes connaissances, non vérifié). Utile pour un décodage ou encodage image par image en Python, pas pour le motion design.
- Licence de Motion Canvas (MIT selon mes connaissances, non vérifiée ici) et état réel de Midrender non confirmés par une source primaire.
- Dernière version et activité d'Editly en 2026 non confirmées.

## Sous-titres animés mot par mot (style TikTok/Hormozi) et typographie française

### Takeaway
Trois voies matures : (1) Remotion `@remotion/captions` (pages + mot actif en React) ; (2) HyperFrames `/embedded-captions` (catalogue de 35 styles, transcription et détourage du sujet en local) ; (3) ASS/libass via FFmpeg avec les balises karaoké `\k`/`\kf`, le plus léger à rendre. pycaps (Python, Whisper + styles CSS par état de mot) est une alternative clé en main. La typographie française (espaces insécables avant ; : ! ?, guillemets « ») n'est gérée nativement par aucun de ces outils : c'est un post-traitement à prévoir.

### Cited Findings
- Remotion : `createTikTokStyleCaptions` regroupe les mots plus proches que `combineTokensWithinMilliseconds` sur une même page. Une valeur basse donne une animation mot par mot. Chaque page porte `text` et `startMs`. — [Remotion docs](https://remotion.dev/docs/captions/create-tiktok-style-captions)
- Remotion propose aussi des éléments prêts à l'emploi « timed captions » et « basic captions ». — [remotion.dev/elements/text/timed-captions](https://www.remotion.dev/elements/text/timed-captions/); [basic-captions](https://www.remotion.dev/elements/captions/basic-captions/)
- HyperFrames `embedded-captions` : sous-titres sur un talking-head à un seul sujet, sans retoucher les images ; catalogue de 35 identités visuelles ; style par défaut « anchor » (rail sobre) avec un « embed » derrière le sujet au moment fort ; transcription et matting du sujet en local. — SKILL.md local embedded-captions; [GitHub hyperframes](https://github.com/heygen-com/hyperframes)
- ASS karaoké : la balise `\kf` suivie d'une durée en centisecondes (ex. `{\kf100}mot`) produit un remplissage progressif. Le filtre `subtitles` de FFmpeg grave l'ASS via libass, à condition que FFmpeg soit compilé avec libass. Des outils convertissent la sortie de Whisper (timestamps par mot) en ASS karaoké, par exemple le paquet R `subtitles` 0.1.1. — [CRAN subtitles README](https://archive.linux.duke.edu/cran/web/packages/subtitles/readme/README.html); [n8n workflow karaoke captions FFmpeg](https://n8n.io/workflows/18486-burn-word-highlighted-karaoke-captions-onto-videos-with-ffmpeg-and-ffprobe/)
- pycaps : bibliothèque Python open source qui extrait l'audio, transcrit avec Whisper (timestamps par mot), segmente, puis rend des sous-titres stylés en CSS avec des classes d'état `word-not-narrated-yet`, `word-being-narrated` et `word-already-narrated`. Elle peut aussi mettre en couleur des mots selon le contenu. — [DEV : content-aware animated subtitles with Python](https://dev.to/francozanardi/how-to-create-content-aware-animated-subtitles-with-python-24dn); [DEV : adding animated subtitles](https://dev.to/francozanardi/adding-animated-subtitles-to-videos-with-python-4hml)

### Inferences
- Pour Paul, le plus simple est une transcription WhisperX ou whisper.cpp (timestamps par mot, modèle français), puis une correction du vocabulaire métier (trou, aspiré, bend, « 4 aspiré », noms propres), puis le rendu (composant Remotion ou HyperFrames si le style compte, ASS si la vitesse compte).
- Typographie française à imposer dans le code : espace fine insécable (U+202F) ou insécable (U+00A0) avant ; : ! ? et à l'intérieur des « guillemets » ; ne jamais couper une ligne entre un nombre et son unité (« 4 aspiré », « trou 2 ») ; gérer les élisions (l'harmonica, d'accord) comme un seul token visuel ; capitales accentuées (É, À) pour les styles tout en majuscules, car `text-transform: uppercase` en CSS les conserve, alors qu'une mise en majuscules faite à la main dans le texte peut les perdre. En ASS, utiliser `\h` (espace insécable libass) ou U+00A0.
- Le style Hormozi (2 ou 3 mots par écran, mot actif en couleur ou agrandi) correspond à une petite valeur de `combineTokensWithinMilliseconds` dans Remotion, ou à un événement ASS par groupe de mots avec `\k`.

### Gaps
- Je n'ai trouvé aucune source traitant explicitement de la typographie française dans ces bibliothèques. Les règles ci-dessus viennent des conventions typographiques françaises usuelles, pas d'une page consultée.
- Précision des timestamps par mot de Whisper en français et besoin d'un alignement forcé (WhisperX/wav2vec2) : non vérifiés ici.
- La licence de pycaps n'a pas été vérifiée.

## Zooms automatiques / punch-ins

### Takeaway
La technique standard : détection de visage (MediaPipe Face Detector ou landmarks) image par image, centre du visage, lissage (moyenne mobile ou filtre) pour que le cadre « glisse », puis recadrage et mise à l'échelle avec une interpolation adoucie. Les règles de déclenchement (mots d'emphase, toutes les N secondes, sur les coupes) relèvent de la logique éditoriale et ne sont documentées par aucune source primaire trouvée.

### Cited Findings
- On calcule le centre du visage à chaque image, on centre un rectangle de crop dessus et on lisse par moyenne mobile pour que le mouvement glisse au lieu de sauter. MoviePy ou OpenCV lisent la vidéo, MediaPipe `face_detection` donne les points du visage. — [Reddit snapshot 2026 (via extrait)](https://reddit.sentinel-team.org/posts/1qa5ira/snapshots/2026-01-12T03%3A21%3A30.45965Z); [LearnOpenCV : Center Stage avec MediaPipe](https://learnopencv.com/center-stage-for-zoom-calls-using-mediapipe/)
- La stabilisation est indispensable pour éviter un suivi saccadé. — [LearnOpenCV](https://learnopencv.com/center-stage-for-zoom-calls-using-mediapipe/)
- Il existe un guide officiel Python de MediaPipe Face Detector. — [Google AI Edge : MediaPipe face detector Python](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/python?hl=ja)
- Exemples open source : ViralCutterPRO (détection de visage InsightFace + édition), scripts « reframe_offset ». — [HF Space ViralCutterPRO](https://huggingface.co/spaces/RafaG/ViralCutterPRO/blob/main/scripts/face_detection_insightface.py); [tessl reels-producer reframe_offset.py](https://tessl.io/registry/gamussa/reels-producer-skill/files/skills/reel-builder/scripts/reframe_offset.py)

### Inferences
- Pour un plan fixe de prof face caméra, un seul calcul de la position moyenne du visage par plan suffit souvent. Pas besoin de suivi image par image : le zoom devient un `scale` plus `translate` centré sur ce point, très peu coûteux, faisable en CSS/Remotion (`interpolate` + `Easing`), en GSAP (`power2.inOut`) ou en FFmpeg (`zoompan`, `crop` + `scale` avec expressions).
- Règles usuelles (à valider) : punch-in de 110 à 120 % sur les jump cuts pour masquer la coupe, en alternant serré et large ; zoom plus marqué sur les mots d'emphase choisis par le LLM ; ne pas zoomer plus d'une fois toutes les 4 à 8 s ; ease-in-out de 200 à 400 ms ou coupe sèche ; ne jamais couper l'harmonica ni les mains quand Paul montre une technique.
- Pour une vidéo d'harmonica, il faut détecter aussi la bouche et les mains (MediaPipe Hands/FaceMesh) pour que le recadrage garde l'instrument dans le cadre.

### Gaps
- Je n'ai trouvé aucune source primaire (étude, doc d'outil) qui fixe des règles chiffrées sur quand zoomer. Les règles ci-dessus sont des conventions de montage, non sourcées.
- Coût CPU de MediaPipe sur une vidéo de 20 min sans GPU : non mesuré.

## Musique : ducking, loudness, sources libres de droits, musique générée par IA

### Takeaway
Ducking : `sidechaincompress` de FFmpeg (la voix pilote la compression de la musique), ou une automation de volume calculée à partir d'une VAD. Loudness : `loudnorm` en deux passes vers -14 LUFS intégrés, -1 dBTP, LRA 11. Licences : Pixabay (gratuit, monétisable, mais claims Content ID possibles), Uppbeat gratuit (3 téléchargements/mois, crédit obligatoire), ElevenLabs Music (conditions commerciales les plus nettes en 2026), Suno payant (droits commerciaux, mais contentieux sur les données d'entraînement).

### Cited Findings
- `sidechaincompress` : la piste de voix sert d'entrée de détection et la musique baisse quand la voix est présente. Paramètres : `threshold`, `ratio`, `attack` (ms), `release` (ms). Forme typique : `-filter_complex "[1:a]asplit=2[sc][mix];[0:a][sc]sidechaincompress=...[duck];[duck][mix]amix"`. — [FFmpeg docs : sidechaincompress](https://ffmpeg.org/ffmpeg-filters.html#sidechaincompress); [ffmpeg-user list 2018 : audio ducking](https://ffmpeg.org/pipermail/ffmpeg-user/2018-August/040933.html) (fil ancien mais la technique est stable)
- Loudness : -14 LUFS intégrés, true peak -1 dB, LRA environ 11 pour YouTube, Instagram, TikTok, etc. Il faut deux passes : la 1re mesure (`loudnorm=...:print_format=json`), la 2e applique une normalisation linéaire avec les valeurs mesurées et évite le pompage. — [DEV : FFmpeg loudnorm EBU R128 guide](https://dev.to/javidjamae/ffmpeg-loudnorm-filter-ebu-r128-loudness-normalization-guide-15d4); [instagit : video-use loudness targets](https://instagit.com/browser-use/video-use/social-media-loudness-normalization-targets/)
- HyperFrames a un skill audio dédié (« voiceover carve » du lit musical, compresseur, limiteur, enveloppes d'automation). — liste des skills locaux `hyperframes-audio`
- Pixabay : usage commercial gratuit sans attribution, monétisation YouTube permise. Un morceau peut quand même déclencher un claim Content ID si le compositeur l'a enregistré ; le certificat de licence Pixabay sert alors de preuve pour contester. — [thewavevideomarketing : Pixabay license & YouTube monetization](https://thewavevideomarketing.com/blog/pixabay-content-license-music-youtube-monetization)
- Uppbeat gratuit : depuis le 10 août 2026, 3 téléchargements par mois et une partie seulement du catalogue. Chaque téléchargement génère un code crédit à coller dans la description, et l'outil Claim Release lève les claims. Attribution obligatoire en gratuit, monétisation permise. — [checkthat.ai : Uppbeat pricing 2026](https://checkthat.ai/brands/uppbeat/pricing); [foximusic blog](https://www.foximusic.com/blog/need-background-music-that-wont-trigger-content-id/)
- Suno : seuls les abonnés payants (Pro 10 $/mois, Premier 30 $/mois) ont les droits commerciaux, monétisation YouTube incluse ; le plan gratuit ne les a pas. Téléchargements plafonnés selon le plan. — [terms.law : Suno commercial rights](https://terms.law/ai-output-rights/suno/); [dynamoi : Suno Pro vs Premier](https://dynamoi.com/learn/ai-music-distribution/suno-commercial-rights-explained)
- Udio : droits commerciaux pour les payants, avec des réserves (indemnisation, similarité avec des œuvres protégées). Règlement avec UMG en octobre 2025, accord avec Warner. — [blog.dubspot : AI music licensing 2026](https://blog.dubspot.com/ai-music-licensing-explained-2026)
- ElevenLabs Music : les abonnés payants détiennent les droits commerciaux (vidéo commerciale, publicité, distribution). Des accords avec Merlin et Kobalt couvrent la monétisation YouTube. Usage commercial sur tous les plans sauf film, TV, radio et jeux de studio ; les plans Free et Starter ne peuvent pas distribuer sur les plateformes de streaming. « As of April 2026, ElevenLabs Music and Stable Audio ship clean commercial terms; Suno and Udio have unsettled commercial-use posture due to training-data lawsuits. » — [licenseorg : AI music licensing 2026](https://www.licenseorg.com/blog/ai-music-licensing-suno-elevenlabs); [teamday : best AI music models (Sept 2026)](https://www.teamday.ai/blog/best-ai-music-models-2026) (sources secondaires, à vérifier dans les CGU officielles)

### Inferences
- Chaîne audio recommandée, dans l'ordre : nettoyage de la voix, puis musique à environ -18/-22 dB sous la voix avec `sidechaincompress` (attack 20 à 50 ms, release 300 à 600 ms) ou une automation basée sur Silero VAD, puis `amix`, puis `loudnorm` deux passes vers I=-14:TP=-1:LRA=11. Point propre au métier de Paul : le ducking doit aussi s'enclencher quand il joue de l'harmonica, ou bien il faut couper la musique pendant les démos, sinon le lit musical entre en conflit tonal avec l'instrument.
- Pour une chaîne pédagogique monétisée, la YouTube Audio Library (bibliothèque de YouTube) reste l'option la plus sûre contre les claims. Elle n'a pas été vérifiée par une source dans cette recherche.

### Gaps
- Conditions précises de la YouTube Audio Library, de Free Music Archive (licences Creative Commons variables selon le morceau, souvent NC, donc risquées pour une chaîne monétisée), d'Epidemic Sound et d'Artlist (prix 2026, levée de claims) : non consultées faute d'appels disponibles.
- CGU officielles de Suno, Udio et ElevenLabs non lues directement : les données viennent de blogs secondaires de 2026.
- Valeurs optimales de `sidechaincompress` pour une voix parlée française : aucune source.

## Motion design piloté par la transcription (callouts, listes, diagrammes, B-roll, SFX, tablature)

### Takeaway
Le motif établi est le suivant : la transcription horodatée va à un LLM, qui choisit les moments et le type de carte (titre, lower-third, liste, chiffre, citation, schéma), puis l'agent écrit le HTML/React de chaque carte et le rend par-dessus la vidéo qui joue intacte. HyperFrames l'outille directement (`talking-head-recut`), et Remotion le permet par composants. Pour la tablature, VexFlow et alphaTab rendent de la notation et de la tab dans le navigateur, donc utilisables dans Remotion ou HyperFrames. Paul a déjà son propre précédent (videotab, skillick) qui part de partitions exactes.

### Cited Findings
- HyperFrames `talking-head-recut` : la vidéo joue en entier et l'agent superpose des cartes (titres cinétiques, lower-thirds, chiffres, citations, panneaux latéraux, PiP) synchronisées sur la transcription. Il écrit le HTML de chaque carte, assemble une composition et la rend en MP4 ; il n'y a pas de liste d'archétypes figée, les overlays « emerge from what the transcript actually says ». — SKILL.md local talking-head-recut; [GitHub hyperframes](https://github.com/heygen-com/hyperframes)
- VexFlow : API JavaScript open source de rendu de notation (Canvas/SVG), avec tablatures de guitare intégrables. — [GitHub vexflow](https://github.com/digitalcoder/vexflow); [gittrend 0xfe/vexflow](https://gittrend.io/repo/0xfe/vexflow)
- alphaTab : bibliothèque multiplateforme de notation et de tablature (Guitar Pro, MusicXML), synthèse MIDI intégrée, rendu SVG ou raster, avec une API d'événements. — [openhub alphaTab](https://openhub.net/p/alphatab); [alphatab.net API](https://alphatab.net/docs/reference/api)
- Précédent harmonica chez Paul : `videotab` (partition .musicxml/.mscz ou export HarmonicaTrainer, puis tablature harmonica en vidéo Remotion 9:16 synchronisée ou en image JPG) et `skillick` (lick du jour en 9:16, tablature statique animée et synchronisée, logos). Règle absolue des deux : la tablature ne se devine jamais et vient d'un fichier de partition exact. — SKILL.md locaux videotab et skillick

### Inferences
- La tablature harmonica (numéros de trous, flèches souffle/aspiré, bends) n'est gérée nativement ni par VexFlow ni par alphaTab, qui sont orientés guitare (cordes et frettes). Le plus simple reste un composant React/HTML maison, comme le fait déjà Paul, avec la partition (MusicXML) comme source de vérité pour la synchronisation.
- Pour des callouts dans une vidéo parlée, le LLM peut produire un JSON du type `{t_start, t_end, type, texte, icône}`, rendu ensuite par une bibliothèque de composants fixes aux couleurs de la marque, ce qui est plus fiable que du code libre à chaque vidéo. Quand Paul mentionne un trou ou une note, le système peut afficher automatiquement une mini-tablature (« 4 aspiré », etc.), ce qui suppose un vocabulaire contrôlé dans la transcription.
- B-roll et SFX : le skill `media-use` de HyperFrames prétend résoudre BGM, SFX, images et icônes dans un fichier local avec un registre, ce qui pourrait couvrir les whoosh.

### Gaps
- Je n'ai trouvé aucune source sur des bibliothèques de SFX (whoosh) libres pour YouTube monétisé : licences de Pixabay SFX, Mixkit, Freesound (CC0 ou CC-BY selon le fichier) et Uppbeat SFX non vérifiées.
- Je n'ai trouvé aucun précédent public d'overlay animé de tablature harmonica en dehors des outils internes de Paul. alphaTab et VexFlow ne traitent pas l'harmonica diatonique (non confirmé par une source, déduit de leur orientation guitare).
- Aucun retour d'expérience chiffré (qualité, taux de rejet) sur des overlays choisis par un LLM.
