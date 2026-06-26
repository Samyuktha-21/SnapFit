"""Train circumference predictors on ANSUR II and report HONEST error in cm.

We compare two feature sets so we can see if asking for weight is worth it:
  (1) height + sex
  (2) height + sex + weight
  (3) height + sex + weight + shoulder  (shoulder = what the camera measures)

ANSUR units: lengths in mm, weightkg stored in kg*10. We work in cm.
"""
import csv, numpy as np

F = 'data/ansur.csv'
rows = list(csv.DictReader(open(F, encoding='utf-8-sig')))

def col(name):
    return np.array([float(r[name]) for r in rows])

# Inputs
stature_cm = col('stature') / 10.0          # mm -> cm
weight_kg  = col('weightkg') / 10.0         # kg*10 -> kg
gender     = np.array([1.0 if r['gender'].strip().lower().startswith('m') else 0.0 for r in rows])

# Targets (mm -> cm)
targets = {
    'chest':    col('chestcircumference') / 10.0,
    'waist':    col('waistcircumference') / 10.0,
    'hip':      col('buttockcircumference') / 10.0,
    'shoulder': col('biacromialbreadth') / 10.0,
}

print('Sanity (cm): height %.0f-%.0f  weight %.0f-%.0f  chest %.0f-%.0f  waist %.0f-%.0f' % (
    stature_cm.min(), stature_cm.max(), weight_kg.min(), weight_kg.max(),
    targets['chest'].min(), targets['chest'].max(), targets['waist'].min(), targets['waist'].max()))

rng = np.random.default_rng(0)
idx = rng.permutation(len(rows))
cut = int(0.8 * len(rows))
tr, te = idx[:cut], idx[cut:]

def fit_eval(X, y):
    Xtr = np.c_[np.ones(len(tr)), X[tr]]
    Xte = np.c_[np.ones(len(te)), X[te]]
    beta, *_ = np.linalg.lstsq(Xtr, y[tr], rcond=None)
    pred = Xte @ beta
    rmse = np.sqrt(np.mean((pred - y[te])**2))
    mae  = np.mean(np.abs(pred - y[te]))
    return rmse, mae

feat2 = np.c_[stature_cm, gender, weight_kg]  # chosen model: height + sex + weight

# Final coefficients fit on ALL data; report MAE from the held-out split.
import json
model = {}
for name, y in targets.items():
    rmse, mae = fit_eval(feat2, y)
    X = np.c_[np.ones(len(rows)), feat2]
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    model[name] = {
        'beta': [round(float(b), 5) for b in beta],  # [intercept, height, sexMale, weight]
        'mae': round(float(mae), 1),
    }
print(json.dumps(model, indent=2))
