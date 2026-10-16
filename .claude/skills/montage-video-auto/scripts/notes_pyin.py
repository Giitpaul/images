"""Suivi des notes jouées (harmonica) par détection de hauteur pYIN (librosa).

Usage : python notes_pyin.py --entree 01_voice.wav --sortie 04_notes.json
Sortie : liste de notes { midi, start, end, confidence } en secondes.
"""
import argparse
import json

import librosa
import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--entree", required=True)
    ap.add_argument("--sortie", required=True)
    ap.add_argument("--min-duree", type=float, default=0.09)
    a = ap.parse_args()

    sr = 22050
    hop = 256
    y, _ = librosa.load(a.entree, sr=sr, mono=True)
    f0, voiced, prob = librosa.pyin(y, fmin=180, fmax=2400, sr=sr, frame_length=2048, hop_length=hop)
    t = librosa.times_like(f0, sr=sr, hop_length=hop)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    floor = np.percentile(rms, 20) * 2.5

    midi = np.where(voiced & (rms[: len(f0)] > floor), np.round(librosa.hz_to_midi(np.nan_to_num(f0, nan=1.0))), np.nan)

    notes = []
    cur = None
    for i, m in enumerate(midi):
        if cur is not None and (np.isnan(m) or m != cur["midi"]):
            cur["end"] = float(t[i])
            notes.append(cur)
            cur = None
        if cur is None and not np.isnan(m):
            cur = {"midi": int(m), "start": float(t[i]), "probs": []}
        if cur is not None:
            cur["probs"].append(float(prob[i]))
    if cur is not None:
        cur["end"] = float(t[-1])
        notes.append(cur)

    # Fusion des mêmes notes séparées par un micro trou, suppression des notes trop brèves.
    merged = []
    for n in notes:
        last = merged[-1] if merged else None
        if last and last["midi"] == n["midi"] and n["start"] - last["end"] < 0.05:
            last["end"] = n["end"]
            last["probs"] += n["probs"]
        else:
            merged.append(n)
    out = [
        {"midi": n["midi"], "start": round(n["start"], 3), "end": round(n["end"], 3), "confidence": round(float(np.mean(n["probs"])), 3)}
        for n in merged
        if n["end"] - n["start"] >= a.min_duree and 52 <= n["midi"] <= 100
    ]
    with open(a.sortie, "w", encoding="utf-8") as f:
        json.dump({"notes": out}, f, ensure_ascii=False, indent=1)
    print(f"NOTES {len(out)}")


if __name__ == "__main__":
    main()
