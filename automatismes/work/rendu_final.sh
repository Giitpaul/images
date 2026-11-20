#!/bin/bash
# Rendu final : intro + exercices 02, 03, 04 (audio complet, parole comprise) + fin, puis assemblage.
set -e
cd "$(dirname "$0")/.."
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
R="--gl=swiftshader --codec=h264 --crf=20 --timeout=120000 --concurrency=4 --browser-executable=$B"
mkdir -p out
(cd projets/ex02 && npx remotion render src/index.ts Intro169 ../../out/p0_intro.mp4 --props='{"title":"Les automatismes","subtitle":"Exercices de déplacement 02, 03 et 04 · Leçon 5"}' $R)
for e in 02 03 04; do (cd projets/ex$e && npx remotion render src/index.ts Exercice169 ../../out/p_ex$e.mp4 $R); done
(cd projets/ex02 && npx remotion render src/index.ts Outro169 ../../out/p9_outro.mp4 $R)
# audio : silence de l'intro, les trois audios (même niveau, -16 LUFS), silence de la fin ; chaque morceau à la durée exacte de sa vidéo
dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
for e in 02 03 04; do
  d=$(dur out/p_ex$e.mp4)
  ffmpeg -v error -y -i sources/ex$e.mp3 -af "loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000,apad" -t "$d" -ac 2 -c:a pcm_s16le out/a_ex$e.wav
done
ffmpeg -v error -y -f lavfi -i anullsrc=r=48000:cl=stereo -t "$(dur out/p0_intro.mp4)" -c:a pcm_s16le out/a_intro.wav
ffmpeg -v error -y -f lavfi -i anullsrc=r=48000:cl=stereo -t "$(dur out/p9_outro.mp4)" -c:a pcm_s16le out/a_outro.wav
printf "file 'a_intro.wav'\nfile 'a_ex02.wav'\nfile 'a_ex03.wav'\nfile 'a_ex04.wav'\nfile 'a_outro.wav'\n" > out/audio.txt
ffmpeg -v error -y -f concat -safe 0 -i out/audio.txt -c:a pcm_s16le out/audio_total.wav
printf "file 'p0_intro.mp4'\nfile 'p_ex02.mp4'\nfile 'p_ex03.mp4'\nfile 'p_ex04.mp4'\nfile 'p9_outro.mp4'\n" > out/video.txt
ffmpeg -v error -y -f concat -safe 0 -i out/video.txt -c copy out/video_total.mp4
mkdir -p sortie
ffmpeg -v error -y -i out/video_total.mp4 -i out/audio_total.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ac 2 -shortest "sortie/Les automatismes - exercices 02 03 04.mp4"
echo "RENDU TERMINÉ"
