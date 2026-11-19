# Mode B : transcrit voix_off_paul.wav avec faster-whisper et écrit public/alignement.json.
import json
import os
import shutil
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
PUBLIC = RACINE / "public"
AUDIO = RACINE / "voix_off_paul.wav"


def dossier_modele():
    # Le modèle (environ 500 Mo) va hors de C: si possible.
    config = json.loads((RACINE / "config.json").read_text(encoding="utf-8"))
    if config.get("WHISPER_DOSSIER"):
        return Path(config["WHISPER_DOSSIER"])
    if os.name == "nt":
        for lettre in "DEFGH":
            if Path(f"{lettre}:\\").exists():
                return Path(f"{lettre}:\\modeles_whisper")
    return RACINE / "modeles_whisper"


def main():
    if not AUDIO.exists():
        sys.exit("voix_off_paul.wav introuvable à la racine du projet.")
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper n'est pas installé : pip install faster-whisper")

    dossier = dossier_modele()
    dossier.mkdir(parents=True, exist_ok=True)
    print(f"Modèle Whisper dans : {dossier}")

    texte = (RACINE / "voix_off_paul.txt").read_text(encoding="utf-8")
    texte = texte.replace("(pause longue)", "").replace("(pause)", "")

    # Modèle déjà présent dans le dossier (copie locale) : on l'utilise sans téléchargement.
    local = dossier / "small"
    source = str(local) if (local / "model.bin").exists() else "small"
    modele = WhisperModel(source, device="cpu", compute_type="int8", download_root=str(dossier))
    segments, _ = modele.transcribe(
        str(AUDIO), language="fr", word_timestamps=True, initial_prompt=texte, vad_filter=False
    )
    mots = []
    for seg in segments:
        for m in seg.words:
            mots.append({"mot": m.word.strip(), "debut": round(m.start, 3), "fin": round(m.end, 3)})

    PUBLIC.mkdir(exist_ok=True)
    shutil.copyfile(AUDIO, PUBLIC / "voix_off_paul.wav")
    (PUBLIC / "alignement.json").write_text(
        json.dumps({"mode": "B", "mots": mots}, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"alignement.json écrit ({len(mots)} mots).")
    print(" ".join(m["mot"] for m in mots))


if __name__ == "__main__":
    main()
