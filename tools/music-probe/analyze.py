#!/usr/bin/env python3
"""Local technical probe, not automatic dance/downbeat approval.

Requires a separate Python environment with librosa, scipy, numpy, matplotlib.
Writes measurements only; does not modify or upload the input.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import librosa
import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.optimize import minimize
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--output', type=Path, default=Path('output/music-probe'))
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
sr, hop = 22050, 220
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(args.source),
    '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'])
y = np.frombuffer(raw, dtype='<f4')
onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr,
    hop_length=hop, start_bpm=104, tightness=100, trim=True)
beats = librosa.frames_to_time(frames, sr=sr, hop_length=hop)
indexes = np.arange(len(beats))
slope, intercept = np.polyfit(indexes, beats, 1)
residual = beats - (intercept + slope * indexes)
times = librosa.frames_to_time(np.arange(len(onset)), sr=sr, hop_length=hop)
ac = librosa.autocorrelate(onset[(times >= 20) & (times < 50)], max_size=200)
ac_candidates = sorted([(float(ac[i]), 60*sr/hop/i) for i in range(35,100)
    if ac[i] > ac[i-1] and ac[i] > ac[i+1]], reverse=True)[:8]
# Refine a constant grid against onset energy independently of the DP tracker.
# This detects whether a rigid click track is credible; it does not find bar 1.
smooth = gaussian_filter1d(onset, 1.5)
def score(params):
    period, origin = params
    grid = origin + period * indexes
    return -np.mean(np.interp(grid[8:-8], times, smooth))
fit = minimize(score, [slope, intercept], method='Nelder-Mead',
    options={'xatol': 1e-8, 'maxiter': 1500})
period, origin = [float(v) for v in fit.x]
if abs(period / slope - 1) > .01:
    period, origin = float(slope), float(intercept)
windows = []
for begin in range(0, int(len(y)/sr), 30):
    mask = (beats >= begin) & (beats < begin + 30)
    if mask.sum() < 8:
        continue
    p, o = np.polyfit(indexes[mask], beats[mask], 1)
    windows.append({'startSeconds': begin, 'endSeconds': min(begin+30, len(y)/sr),
        'bpm': float(60/p), 'beatCount': int(mask.sum()),
        'constantGridMedianResidualMs': float(np.median((beats-(origin+period*indexes))[mask])*1000)})
meta = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries',
    'format=duration:stream=sample_rate,channels,codec_name,bits_per_sample',
    '-of','json', str(args.source)]))
report = {
    'schemaVersion': 1, 'sourceName': args.source.name,
    'sourceSha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
    'source': meta, 'durationSeconds': len(y)/sr,
    'method': 'librosa spectral-flux + DP beat tracker; least-squares and onset-comb constant-grid diagnostics',
    'versions': {'librosa': librosa.__version__, 'numpy': np.__version__},
    'trackerBpm': float(np.asarray(tempo).ravel()[0]),
    'fittedBpm': float(60/slope), 'constantBpm': 60/period,
    'constantFirstBeatSeconds': origin,
    'firstTrackedBeatSeconds': float(beats[0]),
    'trackedBeatCount': len(beats), 'trackedBeatsSeconds': beats.tolist(),
    'trackedCoverageSeconds': [float(beats[0]), float(beats[-1])],
    'untrackedTailSeconds': float(len(y)/sr-beats[-1]),
    'onsetAutocorrelation20to50Seconds': [{'score': score, 'bpm': bpm} for score,bpm in ac_candidates],
    'constantGridResidualMs': {
        'medianAbsolute': float(np.median(np.abs(beats-(origin+period*indexes)))*1000),
        'p95Absolute': float(np.percentile(np.abs(beats-(origin+period*indexes)),95)*1000),
        'maxAbsolute': float(np.max(np.abs(beats-(origin+period*indexes)))*1000)},
    'windows': windows,
    'review': {'dance': 'rumba candidate requested by user; not musically certified',
        'beatsPerBar': 4, 'downbeat': 'UNREVIEWED: first tracked beat is not necessarily bar beat 1',
        'rights': 'UNVERIFIED: local technical test only; do not publish source or derivatives',
        'trackerLimit': 'Tracked beats are model estimates, not measured ground-truth musical onsets.'}}
(args.output/'analysis.json').write_text(json.dumps(report, indent=2)+'\n')
fig, axes = plt.subplots(3,1,figsize=(13,8),layout='constrained')
axes[0].plot(np.arange(0,len(y),2205)/sr,y[::2205],lw=.4)
axes[0].set(title='Paper Umbrella — waveform (local analysis)',ylabel='Amplitude')
axes[1].plot(beats,residual*1000,lw=.7)
axes[1].set(title=f'Beat tracker vs fitted constant grid: {60/slope:.3f} BPM',ylabel='Residual (ms)')
axes[2].plot(times,onset,lw=.7)
for b in beats[(beats>=25)&(beats<35)]:
    axes[2].axvline(b,color='orange',alpha=.6)
axes[2].set(xlim=(25,35),title='Spectral onsets and estimated beats — bar phase unreviewed',xlabel='Seconds',ylabel='Onset strength')
fig.savefig(args.output/'analysis.png',dpi=130)
print(json.dumps({k:v for k,v in report.items() if k not in ['trackedBeatsSeconds','source','versions']},indent=2))
