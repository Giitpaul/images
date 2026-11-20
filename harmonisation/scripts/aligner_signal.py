# Mode B sans modèle de reconnaissance vocale (aucun téléchargement).
# Le texte est connu (voix_off_paul.txt). On analyse le signal :
#   1. blocs de parole séparés par des silences ;
#   2. syllabes = pics d'énergie dans la bande des voyelles.
# Niveau 1 : les groupes de mots du texte (coupés à la ponctuation) sont calés
# sur les blocs de parole, en comparant nombre de syllabes et nombre de pics.
# Un bloc en trop (hésitation, reprise) est ignoré.
# Niveau 2 : dans chaque bloc, chaque mot prend l'attaque de sa première syllabe.
import json
import re
import shutil
import sys
import wave
from pathlib import Path

import numpy as np

RACINE = Path(__file__).resolve().parent.parent
PUBLIC = RACINE / "public"
AUDIO = RACINE / "voix_off.wav"
TEXTE = RACINE / "voix_off.txt"

PAS = 0.01  # 10 ms par trame
FUSION = 15  # trou de moins de 150 ms : même bloc de parole


# ---------- Signal ----------
def lire_audio(chemin):
    with wave.open(str(chemin)) as w:
        sr, nc, larg = w.getframerate(), w.getnchannels(), w.getsampwidth()
        brut = w.readframes(w.getnframes())
    if larg != 2:
        sys.exit("Le WAV doit être en 16 bits.")
    x = np.frombuffer(brut, dtype=np.int16).astype(float) / 32768
    if nc > 1:
        x = x.reshape(-1, nc).mean(1)
    return x, sr


def energie_voyelles(x, sr):
    hop, fen = int(sr * PAS), 1024
    n = (len(x) - fen) // hop
    trames = np.lib.stride_tricks.sliding_window_view(x, fen)[::hop][:n] * np.hanning(fen)
    spectre = np.abs(np.fft.rfft(trames, axis=1))
    f = np.fft.rfftfreq(fen, 1 / sr)
    e = 20 * np.log10(spectre[:, (f > 300) & (f < 2500)].sum(1) + 1e-9)
    k = np.hanning(5)
    return np.convolve(e, k / k.sum(), "same")


def blocs_parole(x, sr):
    h = int(sr * PAS)
    n = len(x) // h
    db = 20 * np.log10(np.sqrt((x[: n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
    # seuil : au dessus du bruit de fond LOCAL (il peut changer pendant l'enregistrement),
    # et au plus 32 dB sous la voix (silences numériques des noise gates)
    pas = 100  # fenêtres d'une seconde
    centres, fonds = [], []
    for c in range(0, n, pas):
        fen = db[max(0, c - 500): c + 500]
        centres.append(c)
        fonds.append(np.percentile(fen, 10))
    fond_local = np.interp(np.arange(n), centres, fonds)
    seuil = np.maximum(fond_local + 12, np.percentile(db, 90) - 32)
    parole = db > seuil
    blocs, i = [], 0
    while i < n:
        if parole[i]:
            j = i
            while j < n and parole[j]:
                j += 1
            if blocs and i - blocs[-1][1] < FUSION:  # trou court : même bloc
                blocs[-1][1] = j
            else:
                blocs.append([i, j])
            i = j
        else:
            i += 1
    return [b for b in blocs if b[1] - b[0] >= 5]


def pics_syllabes(e, debut, fin):
    plafond = e.max() - 30
    pics = []
    for i in range(max(3, debut - 3), min(len(e) - 3, fin + 3)):
        if e[i] != e[max(0, i - 8): i + 9].max() or e[i] < plafond:
            continue
        gauche = e[max(0, i - 20): i].min()
        droite = e[i + 1: i + 21].min()
        if e[i] - max(gauche, droite) >= 3:
            if pics and i - pics[-1] < 14:  # moins de 140 ms : même syllabe
                continue
            pics.append(i)
    return pics


def attaque(e, pic, mini):
    # Début de syllabe : on remonte depuis le pic jusqu'au creux qui précède.
    seuil = e[pic] - 18
    i = pic
    while i > max(mini, pic - 25) and e[i - 1] <= e[i] + 0.5 and e[i - 1] > seuil:
        i -= 1
    return i


# ---------- Texte ----------
VOYELLES = "aeiouyàâäéèêëîïôöûùü"


def syllabes(mot):
    m = mot.lower().replace("qu", "q").replace("gu", "g")
    n = len(re.findall(f"[{VOYELLES}]+", m))
    if n > 1 and re.search(f"[^{VOYELLES}](e|es|ent)$", m):
        n -= 1  # e muet final
    return max(1, n)


def sections_texte():
    # Une section par marque (pause) : liste de groupes de mots.
    brut = TEXTE.read_text(encoding="utf-8")
    brut = brut.replace("(pause longue)", " ⏸ ").replace("(pause)", " ⏸ ")
    return [groupes_texte(morceau) for morceau in brut.split("⏸") if morceau.strip()]


def groupes_texte(brut):
    groupes, courant = [], []
    for jeton in brut.split():
        propre = jeton.strip(".,?!;:")
        if propre:
            courant.append(propre)
        if re.search(r"[.,?!;:]$", jeton) and courant:
            groupes.append(courant)
            courant = []
    if courant:
        groupes.append(courant)
    return [{"mots": g, "syl": [syllabes(m) for m in g]} for g in groupes]


# ---------- Niveau 1 : groupes de mots sur blocs de parole ----------
def caler_groupes(groupes, blocs):
    G, B = len(groupes), len(blocs)
    INF = float("inf")
    cout = np.full((G + 1, B + 1), INF)
    prec = {}
    cout[0, 0] = 0
    nsyl = [sum(g["syl"]) for g in groupes]
    npic = [len(b["pics"]) for b in blocs]
    for i in range(G + 1):
        for j in range(B + 1):
            c0 = cout[i, j]
            if c0 == INF:
                continue
            # Bloc ignoré (hésitation, reprise, bruit).
            if j < B:
                court = blocs[j]["fin"] - blocs[j]["debut"] < 12
                c = c0 + (0.3 if court else 2.0 + 0.6 * npic[j])
                if c < cout[i, j + 1]:
                    cout[i, j + 1], prec[(i, j + 1)] = c, (i, j, "saut")
            # a groupes de mots sur b blocs.
            for a in range(1, 17):
                if i + a > G:
                    break
                s = sum(nsyl[i: i + a])
                for b in range(1, 7):
                    if j + b > B:
                        break
                    p = sum(npic[j: j + b])
                    c = c0 + (s - p) ** 2 / (s + 3) * 3 + 0.15 * (a - 1) + 1.0 * (b - 1)
                    if c < cout[i + a, j + b]:
                        cout[i + a, j + b], prec[(i + a, j + b)] = c, (i, j, (a, b))
    i, j, liens = G, B, []
    while (i, j) != (0, 0):
        pi, pj, op = prec[(i, j)]
        if op != "saut":
            liens.append((pi, i, pj, j))
        i, j = pi, pj
    return list(reversed(liens))


# ---------- Niveau 2 : mots dans un bloc ----------
def caler_mots(mots, syl, pics, e):
    n, m = sum(syl), len(pics)
    pics = list(pics)
    # Trop de pics : on fusionne les plus proches (une syllabe coupée en deux).
    while len(pics) > n:
        k = min(range(len(pics) - 1), key=lambda q: pics[q + 1] - pics[q])
        del pics[k + 1]
    resultat = []
    if len(pics) == n:
        k = 0
        for mot, s in zip(mots, syl):
            resultat.append((mot, pics[k], pics[k + s - 1]))
            k += s
        return resultat
    # Pas assez de pics : position proportionnelle, puis aimantée au pic le plus proche.
    t0, t1 = pics[0], pics[-1]
    k = 0
    for mot, s in zip(mots, syl):
        debut = t0 + (t1 - t0) * (k / max(1, n - 1))
        fin = t0 + (t1 - t0) * ((k + s - 1) / max(1, n - 1))
        proche = min(pics, key=lambda p: abs(p - debut))
        if abs(proche - debut) <= 12:
            debut = proche
        resultat.append((mot, int(debut), int(max(debut, fin))))
        k += s
    return resultat


def aligner(chemin_audio):
    x, sr = lire_audio(chemin_audio)
    e = energie_voyelles(x, sr)
    blocs = []
    for d, f in blocs_parole(x, sr):
        p = pics_syllabes(e, d, f)
        if p:
            blocs.append({"debut": d, "fin": f, "pics": p})
    sections = sections_texte()
    # Les longs silences de l'audio correspondent aux marques (pause) du texte.
    silences = sorted(range(len(blocs) - 1), key=lambda j: blocs[j + 1]["debut"] - blocs[j]["fin"], reverse=True)
    coupes = sorted(silences[: len(sections) - 1])
    bornes = [0] + [c + 1 for c in coupes] + [len(blocs)]
    groupes, liens = [], []
    for k, sec in enumerate(sections):
        b0, b1 = bornes[k], bornes[k + 1]
        for gi0, gi1, bj0, bj1 in caler_groupes(sec, blocs[b0:b1]):
            liens.append((gi0 + len(groupes), gi1 + len(groupes), bj0 + b0, bj1 + b0))
        groupes += sec

    mots = []
    for gi0, gi1, bj0, bj1 in liens:
        ws = [w for g in groupes[gi0:gi1] for w in g["mots"]]
        ss = [s for g in groupes[gi0:gi1] for s in g["syl"]]
        ps = [p for b in blocs[bj0:bj1] for p in b["pics"]]
        mini = blocs[bj0]["debut"] - 5
        # Premier pic de chaque bloc : le mot commence au début du bloc (consonnes s, f, ch comprises).
        ouverture = {b["pics"][0]: b["debut"] for b in blocs[bj0:bj1]}
        for mot, p0, p1 in caler_mots(ws, ss, ps, e):
            debut = attaque(e, p0, mini) if p0 in ps else p0
            if p0 in ouverture:
                debut = min(debut, ouverture[p0])
            mots.append({"mot": mot, "debut": round(debut * PAS, 3), "fin": round(p1 * PAS + 0.12, 3)})
            mini = p1 + 3
    return mots, groupes, blocs, liens


def corriger(mots):
    # Corrections facultatives (corrections_alignement.json), relevées sur les pics mesurés.
    fichier = RACINE / "corrections_alignement.json"
    if not fichier.exists():
        return
    for c in json.loads(fichier.read_text(encoding="utf-8"))["corrections"]:
        i = next(k for k, m in enumerate(mots) if m["mot"] == c["mots"][0] and m["fin"] >= c["apres"])
        for k, (attendu, t) in enumerate(zip(c["mots"], c["debuts"])):
            if mots[i + k]["mot"] != attendu:
                sys.exit(f"Correction impossible : « {mots[i + k]['mot']} » au lieu de « {attendu} »")
            mots[i + k]["debut"] = t
            mots[i + k]["fin"] = round(t + 0.35, 3)
        print(f"Correction appliquée à partir de {c['apres']} s : {' '.join(c['mots'])}")


def main():
    if not AUDIO.exists():
        sys.exit("voix_off_paul.wav introuvable à la racine du projet.")
    mots, groupes, blocs, liens = aligner(AUDIO)
    corriger(mots)
    PUBLIC.mkdir(exist_ok=True)
    (PUBLIC / "alignement.json").write_text(
        json.dumps({"mode": "B", "methode": "signal", "mots": mots}, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"alignement.json écrit : {len(mots)} mots, {len(blocs)} blocs de parole.")
    for gi0, gi1, bj0, bj1 in liens:
        texte = " / ".join(" ".join(g["mots"]) for g in groupes[gi0:gi1])
        print(f"{blocs[bj0]['debut']*PAS:6.2f}-{blocs[bj1-1]['fin']*PAS:6.2f}  [{sum(len(b['pics']) for b in blocs[bj0:bj1])} pics / {sum(sum(g['syl']) for g in groupes[gi0:gi1])} syl]  {texte}")
    utilises = {j for _, _, a, b in liens for j in range(a, b)}
    for j, b in enumerate(blocs):
        if j not in utilises:
            print(f"ignoré : {b['debut']*PAS:6.2f}-{b['fin']*PAS:6.2f}")


if __name__ == "__main__":
    main()
