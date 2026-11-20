# Cartographie d'un audio : parole (F0 grave) / harmonica (F0 >= 250 Hz) / silence, par tranches de 0,5 s
import sys

import librosa
import numpy as np

y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
hop = 512
f0, vf, vp = librosa.pyin(y, fmin=70, fmax=2200, sr=sr, frame_length=2048, hop_length=hop)
rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
db = 20 * np.log10(rms + 1e-9)
t = librosa.frames_to_time(np.arange(len(f0)), sr=sr, hop_length=hop)
lab = []
for i in range(len(f0)):
    if db[i] < db.max() - 40:
        lab.append('.')
    elif vf[i] and f0[i] >= 250:
        lab.append('H')
    elif vf[i] and f0[i] < 230:
        lab.append('v')
    else:
        lab.append('~')
w = int(0.5 * sr / hop)
segs = []
cur = None
start = 0
for i in range(0, len(lab), w):
    c = lab[i:i + w]
    h, v = c.count('H'), c.count('v')
    s = 'JEU' if h >= max(3, v * 1.5) else ('PAROLE' if v >= 3 else 'silence/bruit')
    if s != cur:
        if cur:
            segs.append((cur, start, t[min(i, len(t) - 1)]))
        cur, start = s, t[i]
segs.append((cur, start, t[-1]))
for s, a, b in segs:
    print(f'{a:6.1f}-{b:6.1f}  {s}')
