"""
SnapFit batch tester — runs the EXACT same ratio logic as src/App.jsx
against a folder of still images, so you can validate/calibrate thresholds
outside the browser.

Usage:
    pip install mediapipe opencv-python
    python batch_test.py test_images/

It will auto-download the same model the app uses (pose_landmarker_full.task)
on first run.
"""

import os
import sys
import math
import urllib.request

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_full/float16/1/pose_landmarker_full.task"
)
MODEL_PATH = "pose_landmarker_full.task"

# Landmark indices (same as the app)
NOSE = 0
L_SHOULDER = 11
R_SHOULDER = 12
L_ANKLE = 27
R_ANKLE = 28


def get_size_from_ratio(ratio):
    # Identical to getSizeFromRatio in App.jsx
    if ratio < 0.21:
        return "XS"
    if ratio < 0.227:
        return "S"
    if ratio < 0.25:
        return "M"
    if ratio < 0.27:
        return "L"
    if ratio < 0.29:
        return "XL"
    return "XXL"


def distance(p1, p2, w, h):
    # Identical to calculateDistance in App.jsx: denormalize then euclidean
    x1, y1 = p1.x * w, p1.y * h
    x2, y2 = p2.x * w, p2.y * h
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def ensure_model():
    if not os.path.exists(MODEL_PATH):
        print(f"Downloading model -> {MODEL_PATH} ...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Done.\n")


def make_detector():
    base = python.BaseOptions(model_asset_path=MODEL_PATH)
    opts = vision.PoseLandmarkerOptions(
        base_options=base,
        running_mode=vision.RunningMode.IMAGE,
        num_poses=1,
    )
    return vision.PoseLandmarker.create_from_options(opts)


def analyze(detector, path):
    bgr = cv2.imread(path)
    if bgr is None:
        return f"  [skip] could not read {path}"
    h, w = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    result = detector.detect(mp_image)
    if not result.pose_landmarks:
        return "  [no pose detected]"

    lm = result.pose_landmarks[0]

    shoulder_px = distance(lm[L_SHOULDER], lm[R_SHOULDER], w, h)
    avg_ankle_y = (lm[L_ANKLE].y + lm[R_ANKLE].y) / 2
    pixel_height = abs(avg_ankle_y - lm[NOSE].y) * h
    ratio = shoulder_px / pixel_height if pixel_height else 0
    size = get_size_from_ratio(ratio)

    # Visibility: how confident MediaPipe is each key joint is real & in-frame.
    # Low ankle visibility => the height proxy (and thus the ratio) is untrustworthy.
    def vis(i):
        return getattr(lm[i], "visibility", float("nan"))

    flags = []
    if vis(L_ANKLE) < 0.5 or vis(R_ANKLE) < 0.5:
        flags.append("ANKLES NOT VISIBLE -> ratio unreliable")
    if abs(lm[L_ANKLE].y - lm[R_ANKLE].y) > 0.06:
        flags.append("ankles at different heights (mid-stride?) -> height skewed")

    out = [
        f"  ratio = {ratio:.3f}   -> SIZE: {size}",
        f"  shoulderPx={shoulder_px:.1f}  pixelHeight={pixel_height:.1f}  (img {w}x{h})",
        f"  visibility: shoulders L={vis(L_SHOULDER):.2f}/R={vis(R_SHOULDER):.2f}  "
        f"ankles L={vis(L_ANKLE):.2f}/R={vis(R_ANKLE):.2f}",
    ]
    for f in flags:
        out.append(f"  !! {f}")
    return "\n".join(out)


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else "test_images"
    ensure_model()
    detector = make_detector()

    exts = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
    files = sorted(
        f for f in os.listdir(folder) if f.lower().endswith(exts)
    )
    if not files:
        print(f"No images found in '{folder}/'")
        return

    for name in files:
        print(f"\n=== {name} ===")
        print(analyze(detector, os.path.join(folder, name)))


if __name__ == "__main__":
    main()
