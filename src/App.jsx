// App.jsx — THIN demo + calibration harness around the measurement hook.
// This is the throwaway dev UI; the teammate's real UI will import the same
// useSnapFitMeasurement() hook and render its own layout. All the logic lives in
// src/measurement/, not here.

import { useState } from 'react';
import { useSnapFitMeasurement } from './measurement/useSnapFitMeasurement';
import { predictMeasurements, cmToIn } from './measurement/bodyModel';

const PHASE_LABEL = {
  front: 'Step 1 · Front view',
  side: 'Step 2 · Side view',
  done: 'Done',
};

export default function App() {
  const {
    videoRef, canvasRef,
    phase, status, aligned, holdProgress, reasons, debug, result,
    reset,
  } = useSnapFitMeasurement();

  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [sex, setSex] = useState('female');
  const predictions = predictMeasurements({ heightCm, weightKg, sex });

  return (
    <div style={s.page}>
      <header style={s.header}>
        <h1 style={s.brand}>SnapFit</h1>
        <p style={s.tagline}>Two-angle size capture · everything stays on your device</p>
      </header>

      <div style={s.layout}>
        {/* Camera + guide */}
        <div style={s.card}>
          <div style={s.phasePill(phase === 'done')}>{PHASE_LABEL[phase]}</div>
          <div style={s.videoWrap}>
            <video ref={videoRef} autoPlay playsInline muted style={s.video} />
            <canvas ref={canvasRef} style={s.canvas} />
          </div>

          {/* status + hold-steady progress */}
          <div style={s.statusRow}>
            <span style={s.dot(aligned)} />
            {status !== 'Ready' ? status : aligned ? 'Hold still…' : 'Line up with the guide'}
          </div>
          {phase !== 'done' && (
            <div style={s.barTrack}>
              <div style={{ ...s.barFill, width: `${Math.round(holdProgress * 100)}%` }} />
            </div>
          )}
          {phase !== 'done' && reasons.length > 0 && (
            <ul style={s.reasons}>
              {reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
        </div>

        {/* Result + calibration */}
        <div style={s.card}>
          {result ? (
            <>
              <p style={s.kicker}>Recommended size</p>
              <p style={s.size}>{result.size}</p>

              <div style={s.form}>
                <label style={s.field}>Height (cm)
                  <input style={s.input} type="number" value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)} placeholder="160" />
                </label>
                <label style={s.field}>Weight (kg)
                  <input style={s.input} type="number" value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)} placeholder="55" />
                </label>
                <label style={s.field}>Sex
                  <select style={s.input} value={sex} onChange={(e) => setSex(e.target.value)}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
              </div>

              {predictions ? (
                <>
                  <p style={s.caption}>Estimated body measurements</p>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}></th><th style={s.th}>cm</th>
                        <th style={s.th}>in</th><th style={s.th}>±cm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['shoulder', 'chest', 'waist', 'hip'].map((k) => (
                        <tr key={k}>
                          <td style={s.tdL}>{k[0].toUpperCase() + k.slice(1)}</td>
                          <td style={s.td}>{predictions[k].cm}</td>
                          <td style={s.td}>{cmToIn(predictions[k].cm)}</td>
                          <td style={s.tdMae}>±{predictions[k].mae}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={s.note}>
                    Size is from the camera. Measurements are estimated from your
                    height, weight &amp; sex (ANSUR II, 6,068 adults) — the ±cm is the
                    model&apos;s real average error.
                  </p>
                </>
              ) : (
                <p style={s.note}>Enter height &amp; weight to estimate your measurements.</p>
              )}

              <button style={s.btn} onClick={reset}>Measure again</button>
            </>
          ) : (
            <p style={s.kicker}>Complete both captures to see your size.</p>
          )}

          {/* Step 6: calibration panel — raw numbers for testing on known sizes */}
          <div style={s.debug}>
            <p style={s.debugTitle}>Calibration (debug)</p>
            {debug ? (
              <pre style={s.pre}>{JSON.stringify(roundAll(debug), null, 2)}</pre>
            ) : <p style={s.note}>No pose yet.</p>}
            {result && (
              <pre style={s.pre}>
                {JSON.stringify({ front: roundAll(result.front), side: roundAll(result.side), girth: result.girth ? roundAll(result.girth) : null }, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const roundAll = (o) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) =>
    [k, typeof v === 'number' ? Math.round(v * 1000) / 1000 : v]));

const s = {
  page: { minHeight: '100vh', background: '#0b0c10', color: '#e8e8ea', padding: '28px 18px',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', boxSizing: 'border-box' },
  header: { textAlign: 'center', marginBottom: 22 },
  brand: { fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' },
  tagline: { color: '#9a9aa2', margin: '6px 0 0', fontSize: 13 },
  layout: { display: 'flex', gap: 22, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 940, margin: '0 auto' },
  card: { background: '#15161c', border: '1px solid #23242d', borderRadius: 16, padding: 16, width: 440, maxWidth: '92vw', boxSizing: 'border-box' },
  phasePill: (done) => ({ display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
    background: done ? 'rgba(52,211,153,0.15)' : 'rgba(129,140,248,0.15)', color: done ? '#34d399' : '#a5b4fc', marginBottom: 10 }),
  videoWrap: { position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', background: '#000' },
  video: { width: '100%', display: 'block' },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: '#c8c8d0' },
  dot: (ok) => ({ width: 8, height: 8, borderRadius: '50%', background: ok ? '#34d399' : '#f59e0b' }),
  barTrack: { height: 6, background: '#23242d', borderRadius: 99, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', background: '#34d399', transition: 'width 0.1s linear' },
  reasons: { margin: '10px 0 0', paddingLeft: 18, color: '#f59e0b', fontSize: 12.5, lineHeight: 1.6 },
  kicker: { color: '#9a9aa2', fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' },
  size: { fontSize: 64, fontWeight: 800, margin: '4px 0 12px', color: '#818cf8' },
  caption: { fontSize: 13, color: '#c8c8d0', margin: '0 0 8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'right', color: '#7a7a84', fontWeight: 500, fontSize: 12, padding: '4px 6px' },
  tdL: { textAlign: 'left', color: '#e8e8ea', fontWeight: 600, padding: 6 },
  td: { textAlign: 'right', color: '#c8c8d0', padding: 6, fontVariantNumeric: 'tabular-nums' },
  tdMae: { textAlign: 'right', color: '#6a6a74', padding: 6, fontSize: 12, fontVariantNumeric: 'tabular-nums' },
  form: { display: 'flex', gap: 8, margin: '4px 0 14px' },
  field: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#9a9aa2', flex: 1 },
  input: { background: '#0d0e13', border: '1px solid #2c2d38', borderRadius: 8, color: '#e8e8ea', padding: '7px 8px', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  btn: { marginTop: 14, padding: '8px 14px', borderRadius: 10, border: '1px solid #34384a', background: '#1d1f29', color: '#e8e8ea', cursor: 'pointer', fontSize: 13 },
  signal: { fontSize: 13, color: '#c8c8d0', marginTop: 14 },
  note: { fontSize: 11, color: '#6a6a74', lineHeight: 1.5, marginTop: 10 },
  debug: { marginTop: 16, borderTop: '1px dashed #2c2d38', paddingTop: 12 },
  debugTitle: { fontSize: 11, color: '#7a7a84', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' },
  pre: { margin: '0 0 8px', padding: 10, background: '#0d0e13', borderRadius: 8, fontSize: 11.5, color: '#9aa0b4', overflowX: 'auto' },
};
