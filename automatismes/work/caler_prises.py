# Calage des prises jouées d'un exercice sur l'audio (parties parlées entre les prises).
# Pour chaque prise : départ t0 et durée d'un temps (spb) cherchés pour coller au mieux
# aux attaques détectées (onsets), puis chaque note aimantée sur l'attaque la plus proche
# (±90 ms). Écrit EVENTS / PASSES / prises dans src/videoData.ts du sous-projet.
import json
import re
import sys

import librosa
import numpy as np

projet, prises_json = sys.argv[1], sys.argv[2]
prises = json.loads(prises_json)  # [{"t0":.., "spb":.., "n": nb de notes jouées (optionnel), "nom": ..}]
src = f"{projet}/src/videoData.ts"
txt = open(src, encoding="utf-8").read()
items = json.loads(re.search(r"export const ITEMS = (\[.*?\]) as const;", txt, re.S).group(1))
pages = json.loads(re.search(r"export const PAGES: number\[\]\[\] = (\[.*?\]);", txt, re.S).group(1))
page_of = lambda m: next(i for i, p in enumerate(pages) if m in p)

y, sr = librosa.load(f"{projet}/public/solo.mp3", sr=22050, mono=True)
y = librosa.effects.preemphasis(y)
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
ons = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=256, backtrack=False, units="time", delta=0.04)

events = []
rapport = []
for p, pr in enumerate(prises):
    n = pr.get("n", len(items))
    jouees = [k for k in range(n) if not items[k]["tie"] and not items[k]["rest"]]
    q = np.array([items[k]["q"] for k in jouees])
    zone = ons[(ons > pr["t0"] - 0.4) & (ons < pr["t0"] + (q[-1] + 2) * pr["spb"] * 1.15)]
    meilleur = (-1, pr["t0"], pr["spb"])
    for t0 in np.arange(pr["t0"] - 0.12, pr["t0"] + 0.121, 0.01):
        for spb in np.arange(pr["spb"] * 0.9, pr["spb"] * 1.1, pr["spb"] * 0.002):
            att = t0 + q * spb
            d = np.min(np.abs(att[:, None] - zone[None, :]), axis=1)
            s = np.exp(-(d ** 2) / (2 * 0.04 ** 2)).sum()
            if s > meilleur[0]:
                meilleur = (s, t0, spb)
    _, t0, spb = meilleur
    if pr.get("methode") == "fixe":
        t0, spb = pr["t0"], pr["spb"]  # tempo constant mesuré entre première et dernière note
    temps = {}
    aimantees = 0
    if pr.get("temps"):
        # attaques mesurées à la main (changements de hauteur pYIN), dans l'ordre des notes
        for k, t in zip(jouees, pr["temps"]):
            temps[k] = t
            aimantees += 1
        t0 = pr["temps"][0]
        spb = (pr["temps"][-1] - pr["temps"][0]) / (q[len(pr["temps"]) - 1] - q[0])
    elif pr.get("methode") == "hauteur":
        # notes détectées par leur hauteur (pYIN), alignées par programmation dynamique
        # sur la suite attendue (classe de hauteur : l'octave n'est pas fiable)
        fin = pr["t0"] + (q[-1] + 1.5) * pr["spb"] * 1.2
        a0 = max(0, pr["t0"] - 0.3)
        seg = y[int(a0 * sr): int(fin * sr)]
        f0, vf, _ = librosa.pyin(seg, fmin=240, fmax=2200, sr=sr, frame_length=2048, hop_length=256)
        mid = np.where(vf, np.round(librosa.hz_to_midi(np.nan_to_num(f0, nan=1.0))), -1)
        det = []
        cur, deb = -1, 0
        for i, m in enumerate(list(mid) + [-1]):
            if m != cur:
                if cur > 0 and (i - deb) * 256 / sr >= 0.08:
                    det.append((int(cur) % 12, a0 + deb * 256 / sr))
                cur, deb = m, i
        dd = []
        for c, t in det:
            if dd and dd[-1][0] == c and t - dd[-1][1] < 0.25:
                continue
            dd.append((c, t))
        E = [items[k]["midi"] % 12 for k in jouees]
        nE, nD = len(E), len(dd)
        C = np.full((nE + 1, nD + 1), 1e9)
        B = {}
        C[0, :] = np.arange(nD + 1) * 0.6
        C[:, 0] = np.arange(nE + 1) * 1.0
        for i in range(1, nE + 1):
            for j in range(1, nD + 1):
                m = C[i - 1, j - 1] + (0 if E[i - 1] == dd[j - 1][0] else 1.4)
                a = C[i - 1, j] + 1.0
                b = C[i, j - 1] + 0.6
                C[i, j], B[(i, j)] = min((m, 'm'), (a, 'a'), (b, 'b'))
        i, j = nE, int(np.argmin(C[nE, :]))
        while i > 0 and j > 0:
            op = B[(i, j)]
            if op == 'm':
                if E[i - 1] == dd[j - 1][0]:
                    temps[jouees[i - 1]] = dd[j - 1][1]
                    aimantees += 1
                i, j = i - 1, j - 1
            elif op == 'a':
                i -= 1
            else:
                j -= 1
        # notes non trouvées : interpolation entre voisines trouvées (en temps de partition)
        connues = [(items[k]["q"], temps[k]) for k in jouees if k in temps]
        for k in jouees:
            if k not in temps:
                qq = items[k]["q"]
                av = [c for c in connues if c[0] < qq]
                ap = [c for c in connues if c[0] > qq]
                if av and ap:
                    (q1, t1), (q2, t2) = av[-1], ap[0]
                    temps[k] = t1 + (t2 - t1) * (qq - q1) / (q2 - q1)
                else:
                    temps[k] = t0 + qq * spb
        if len(connues) >= 2:
            (q1, t1), (q2, t2) = connues[0], connues[-1]
            spb = (t2 - t1) / (q2 - q1)
            t0 = t1 - q1 * spb
    else:
        for k, qq in zip(jouees, q):
            t = t0 + qq * spb
            d = np.abs(zone - t)
            if len(d) and d.min() <= (0.12 if pr.get("methode") == "fixe" else 0.09):
                t = float(zone[d.argmin()])
                aimantees += 1
            temps[k] = t
    # monotonie
    prec = -1.0
    for k in jouees:
        temps[k] = max(temps[k], prec + 0.05)
        prec = temps[k]
    for k in range(n):
        it = items[k]
        t = temps.get(k, t0 + it["q"] * spb)
        events.append({"i": k, "p": p, "t": round(t, 3), "d": round(it["dur"] * spb, 3), "page": page_of(it["measure"])})
    bpm = 60 / spb
    rapport.append({"prise": p + 1, "nom": pr.get("nom", ""), "debut": round(t0, 2), "bpm": round(bpm, 1), "notes": len(jouees), "aimantees": aimantees})
    print(f"prise {p+1} {pr.get('nom','')}: départ {t0:.2f} s, {bpm:.1f} BPM, {aimantees}/{len(jouees)} notes calées sur une mesure ({pr.get('methode','attaques')})")

events.sort(key=lambda e: e["t"])
txt = re.sub(r"export const EVENTS = \[.*?\] as const;", "export const EVENTS = " + json.dumps(events) + " as const;", txt, flags=re.S)
txt = re.sub(r"export const PASSES = \d+;", f"export const PASSES = {len(prises)};", txt)
txt = re.sub(r"\nexport const PRISES = .*?;\n", "\n", txt, flags=re.S)
txt += "export const PRISES = " + json.dumps(rapport, ensure_ascii=False) + ";\n"
open(src, "w", encoding="utf-8").write(txt)
