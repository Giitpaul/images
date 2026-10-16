"""Détourage de la personne pour placer des éléments derrière elle.

Produit une vidéo WebM VP9 avec couche alpha (personne nette, fond transparent).
Moteurs : MediaPipe Selfie Segmentation (défaut, rapide sur CPU) ou Robust Video Matting (plus fin, plus lent).

Usage : python segment_person.py --entree 01_cut.mp4 --sortie 05_fg.webm --moteur mediapipe --modele selfie_segmenter.tflite
"""
import argparse
import subprocess
import sys

import cv2
import numpy as np


def open_writer(path, w, h, fps, ffmpeg):
    cmd = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "32",
        "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-auto-alt-ref", "0", path,
    ]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


def soften(mask, prev, smoothing, threshold):
    """Lissage temporel (anti-scintillement) + bord progressif."""
    if prev is not None:
        mask = smoothing * prev + (1 - smoothing) * mask
    soft = np.clip((mask - (threshold - 0.18)) / 0.36, 0.0, 1.0)
    return mask, cv2.GaussianBlur(soft, (0, 0), 1.2)


def mediapipe_masks(cap, model):
    import mediapipe as mp
    from mediapipe.tasks import python as mpt
    from mediapipe.tasks.python import vision

    opts = vision.ImageSegmenterOptions(
        base_options=mpt.BaseOptions(model_asset_path=model),
        running_mode=vision.RunningMode.VIDEO,
        output_confidence_masks=True,
        output_category_mask=False,
    )
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    with vision.ImageSegmenter.create_from_options(opts) as seg:
        i = 0
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            res = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(i * 1000 / fps))
            masks = res.confidence_masks
            m = masks[0].numpy_view() if len(masks) == 1 else 1.0 - masks[0].numpy_view()
            m = np.squeeze(m).astype(np.float32)
            if m.shape[:2] != rgb.shape[:2]:
                m = cv2.resize(m, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_LINEAR)
            yield rgb, m
            i += 1


def rvm_masks(cap, variant):
    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = torch.hub.load("PeterL1n/RobustVideoMatting", variant).to(device).eval()
    rec = [None] * 4
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    ratio = min(1.0, 512 / max(1, h))
    with torch.no_grad():
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            src = torch.from_numpy(rgb).to(device).permute(2, 0, 1).float().div(255).unsqueeze(0)
            _fgr, pha, *rec = model(src, *rec, downsample_ratio=ratio)
            yield rgb, pha[0, 0].cpu().numpy().astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--entree", required=True)
    ap.add_argument("--sortie", required=True)
    ap.add_argument("--moteur", default="mediapipe", choices=["mediapipe", "rvm"])
    ap.add_argument("--modele", default="selfie_segmenter.tflite")
    ap.add_argument("--rvm-variante", default="mobilenetv3")
    ap.add_argument("--lissage", type=float, default=0.6)
    ap.add_argument("--seuil", type=float, default=0.5)
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--occupation", default=None, help="JSON : où se trouve la personne pendant les premières secondes")
    ap.add_argument("--occupation-secondes", type=float, default=4.0)
    a = ap.parse_args()

    cap = cv2.VideoCapture(a.entree)
    if not cap.isOpened():
        sys.exit(f"Impossible d'ouvrir {a.entree}")
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    writer = open_writer(a.sortie, w, h, fps, a.ffmpeg)

    gen = mediapipe_masks(cap, a.modele) if a.moteur == "mediapipe" else rvm_masks(cap, a.rvm_variante)
    prev = None
    coverage = []
    occ = None
    occ_n = 0
    OCC_W, OCC_H = 24, 24
    for n, (rgb, m) in enumerate(gen):
        # RVM produit déjà un alpha fin : lissage temporel léger seulement.
        if a.moteur == "rvm":
            alpha = m if prev is None else 0.3 * prev + 0.7 * m
            prev = alpha
        else:
            prev, alpha = soften(m, prev, a.lissage, a.seuil)
        coverage.append(float(alpha.mean()))
        if n < a.occupation_secondes * fps:
            small = cv2.resize(alpha.astype(np.float32), (OCC_W, OCC_H), interpolation=cv2.INTER_AREA)
            occ = small if occ is None else occ + small
            occ_n += 1
        rgba = np.dstack([rgb, (alpha * 255).astype(np.uint8)])
        writer.stdin.write(rgba.tobytes())
        if n % 150 == 0:
            print(f"frame {n}/{total}", flush=True)
    writer.stdin.close()
    if writer.wait() != 0:
        sys.exit("FFmpeg a échoué pendant l'encodage WebM")
    if a.occupation and occ is not None:
        import json
        with open(a.occupation, "w", encoding="utf-8") as f:
            json.dump({"cols": OCC_W, "rows": OCC_H, "width": w, "height": h, "grid": np.round(occ / occ_n, 3).tolist()}, f)
    cov = np.array(coverage) if coverage else np.zeros(1)
    print(f"COUVERTURE moyenne={cov.mean():.3f} min={cov.min():.3f} max={cov.max():.3f}", flush=True)


if __name__ == "__main__":
    main()
