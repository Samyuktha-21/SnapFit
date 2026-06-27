# SnapFit Backend

A tiny, stateless **Express API** that turns MediaPipe pose landmarks into a clothing size. It runs **separately** from the React frontend so the web app stays a pure static site while the sizing logic can evolve on its own.

- **No database, no auth, no sessions** — one endpoint, one job.
- **Privacy-friendly** — the browser sends ~99 abstract numbers (landmarks), never the camera image.
- **Stateless** — every request is independent, so it scales horizontally and restarts instantly.

## Why a separate backend?

| Concern | How this design answers it |
|---|---|
| Hosting cost | Frontend stays static (Vercel free tier); only this small API needs a server (Render). |
| Iterating on sizing | Recalibrate thresholds / add logging here **without** rebuilding the frontend. |
| Privacy | Only pose landmarks cross the network — the image stays on-device. |
| Scale | Stateless + no DB means trivial horizontal scaling. |

## API

### `GET /`
Health check (used by Render uptime pings).
```json
{ "status": "ok", "service": "snapfit-backend" }
```

### `POST /api/calculate-size`

**Request body**
```json
{
  "landmarks": [ { "x": 0.5, "y": 0.2, "z": -0.1 }, "...33 points total" ],
  "height": 170,
  "sex": "male"
}
```
- `landmarks` — the raw array MediaPipe `PoseLandmarker` returns: **33 points**, each with normalized `x` / `y` / `z` (0–1). **Required.**
- `height` — body height in cm. Optional; validated and reserved for future calibration.
- `sex` — `"male"` or `"female"`. Optional; validated and reserved for future calibration.

**Response** `200`
```json
{ "size": "M", "ratio": 0.2381, "confidence": "high" }
```

**How the size is derived**
1. `shoulderWidth` = distance between landmarks **11** and **12** (the shoulders).
2. `bodyHeight` = distance from landmark **0** (nose) to the midpoint of landmarks **27** & **28** (ankles).
3. `ratio = shoulderWidth / bodyHeight` — scale-invariant, so distance from the camera doesn't matter.
4. Map the ratio to a size:

   | Size | Ratio |
   |------|-------|
   | XS | `< 0.21` |
   | S  | `< 0.227` ✅ *validated boundary* |
   | M  | `< 0.25` |
   | L  | `< 0.27` |
   | XL | `< 0.29` |
   | XXL | `>= 0.29` |

   > Only the **S/M boundary (0.227)** is validated against real measured data. The other cut points are reasoned estimates (flagged as such in the code).

5. `confidence` is `"high"` when the ratio is inside the tested **0.21–0.25** range, otherwise `"low"`.

**Error responses**
- `400` — `landmarks` missing, not an array, not exactly 33 points, or has non-numeric x/y; or invalid `height` / `sex`.
- `422` — a degenerate pose where body height resolves to zero.

## Local setup

```bash
cd backend
npm install
cp .env.example .env   # optional for local; edit if needed
npm run dev            # auto-restarts on change (node --watch)
# or: npm start
```

Server starts on `http://localhost:3001`.

**Quick test** (PowerShell):
```powershell
$body = @{ landmarks = @(0..32 | ForEach-Object { @{ x = 0.5; y = ($_ / 40); z = 0 } }); height = 170; sex = "male" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/api/calculate-size -Method Post -Body $body -ContentType "application/json"
```

**Quick test** (curl / bash):
```bash
curl -X POST http://localhost:3001/api/calculate-size \
  -H "Content-Type: application/json" \
  -d '{"landmarks":[/* 33 points */],"height":170,"sex":"male"}'
```

## Deploy on Render

1. Push this repo to GitHub.
2. On Render → **New → Web Service**, point it at the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. **Environment** tab → add:
   - `FRONTEND_URL` = your deployed frontend origin (e.g. `https://snapfit.vercel.app`)
   - (`PORT` is provided by Render automatically — no need to set it.)
5. Deploy. Point the frontend's API base URL at the resulting `https://<your-service>.onrender.com`.

## Tech

Node 18+ · Express 4 · cors · dotenv. ES modules (`"type": "module"`).
