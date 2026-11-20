# Suite des notes jouées (pYIN) entre deux instants : nom, début, durée
import sys

import librosa
import numpy as np

NOMS = ['Do', 'Do#', 'Ré', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Lab', 'La', 'Sib', 'Si']
f, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
y, sr = librosa.load(f, sr=22050, mono=True, offset=a, duration=b - a)
y = librosa.effects.preemphasis(y)
hop = 256
f0, vf, _ = librosa.pyin(y, fmin=240, fmax=2200, sr=sr, frame_length=2048, hop_length=hop)
midi = np.where(vf, np.round(librosa.hz_to_midi(np.nan_to_num(f0, nan=1.0))), -1)
dt = hop / sr
evts = []
cur, deb = -1, 0
for i, m in enumerate(list(midi) + [-1]):
    if m != cur:
        if cur > 0 and (i - deb) * dt >= 0.08:
            evts.append((int(cur), a + deb * dt, (i - deb) * dt))
        cur, deb = m, i
# fusion des répétitions séparées par un court trou
out = []
for e in evts:
    if out and out[-1][0] == e[0] and e[1] - (out[-1][1] + out[-1][2]) < 0.06:
        out[-1] = (e[0], out[-1][1], e[1] + e[2] - out[-1][1])
    else:
        out.append(e)
print(' '.join(f"{NOMS[m % 12]}{m // 12 - 1}@{t:.2f}" for m, t, d in out))
