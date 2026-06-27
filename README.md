# SnapFit

**Find your perfect t-shirt size from a single webcam scan.** SnapFit reads your proportions through your camera, estimates your body measurements, and translates them into the right size across 15+ clothing brands. Everything runs in your browser, and your photo never leaves your device.

## The problem

Clothing sizes aren't standardized. A Medium at one brand is a Large at another, and online shopping becomes a guessing game with a 30%+ return rate. SnapFit is a fitting room that lives in your camera.

## Why it matters

SnapFit was built to cut down the **exchanges and returns** that come from guessing your size online. Every returned garment is shipped back, re-handled, and often re-shipped or discarded. Reducing that means:

- **Money saved** — fewer wasted orders and return-shipping fees for shoppers and stores.
- **Energy and fuel saved** — far fewer parcels travelling back and forth.
- **A lighter footprint** — less transport, packaging, and product waste.

Getting the size right the first time is a small fix that adds up.

## What it does

- **Guided two-angle scan.** A camera overlay guides you into a front and side pose with live alignment feedback, then auto-captures when you hold steady (green confirmation per angle).
- **Body measurement estimate.** From your height, weight, and sex, a regression trained on ANSUR II (6,068 real adults) estimates chest, waist, hip, and shoulder to roughly ±3 cm. The model's real average error is shown next to every number.
- **Per-brand size recommendation.** Your measurements are matched against real size charts for 15+ brands (Nike, Adidas, Uniqlo, Puma, New Balance, The North Face, Gap, ASICS, Carhartt WIP, Converse, Champion, Levi's, Vans, H&M, and more).
- **Fit preference.** Slim / True / Relaxed shifts every recommendation to match how you like clothes to sit.
- **Size Passport.** Download a shareable card of your sizes to pull up while shopping or send to whoever buys for you.
- **cm / in toggle**, brand search, and a side-by-side comparison table.

## How it works

1. **Pose detection** runs fully client-side with MediaPipe Tasks Vision (PoseLandmarker), a deep-learning pose + body-segmentation model. It powers the guided capture experience and the body-silhouette analysis.
2. **Measurement model (machine learning).** Body circumferences can't be truly measured from a single front photo (no depth, no scale), so SnapFit predicts them with a **machine-learning regression** trained on real anthropometric data. From height + weight + sex it estimates chest, waist, hip and shoulder, and every output is labelled as an estimate with the model's real average error.
3. **Body type** (Hourglass / Pear / Rectangle / Inverted Triangle / Apple) is read from your front silhouette using the pose segmentation mask — based on proportions (ratios), which are scale-independent, so it works without exact measurements.
4. **Brand matching** compares your chest/bust against each brand's size ranges and returns the best size with a confidence score and borderline guidance.

## Data & machine learning

- We **analysed body-measurement data with machine learning** to build the size estimator — a linear-regression model fit on real anthropometric measurements.
- **Datasets** were sourced and evaluated from **Kaggle** (public body-measurement datasets) during development. The shipped model is trained on the public **ANSUR II** anthropometric dataset (6,068 adults); only the resulting coefficients ship to the browser — no dataset and no images are uploaded at runtime.

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS v4
- Zustand (state), Framer Motion (animation)
- MediaPipe Tasks Vision (pose), html-to-image (Size Passport export)
- Model trained in Python (numpy) on ANSUR II; only the coefficients ship to the browser

## Getting started

The web app lives in `Snapfit-UI/`.

```bash
cd Snapfit-UI
npm install
npm run dev
```

Open the printed localhost URL. Click **Scan Fit** to run a scan, then view **Brand Grid** or **Comparison View**.

To retrain the measurement model:

```bash
pip install numpy
python scripts/train_ansur.py
```

## Project structure

```
Snapfit-UI/              Main web app (React + TypeScript)
  src/pages/             Home, ScanFit, BrandGrid, Comparison, Results, ...
  src/components/        UI components (Logo, SizePassport, toggles, ...)
  src/scanfit/           Camera + pose + measurement model (the scan engine)
  src/services/          Brand size charts + matching, mock data layer
  src/store/             Zustand store (profile, unit, fit preference)
scripts/train_ansur.py   ANSUR II measurement-model training
```

## Privacy

All processing happens in your browser. No image is uploaded and no measurement leaves your device unless you choose to download or share your Size Passport.

## Disclaimer

SnapFit size recommendations are estimates from a statistical body model and a camera scan. They are guidance, not guarantees. Garments vary by cut, fabric, and brand, so always check a brand's own size chart before buying. This is not a medical or professional tailoring assessment.
