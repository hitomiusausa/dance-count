"""Numerical checks for a waveform-derived beat/downbeat candidate.

No beat interpolation, tempo forcing, or automatic human-review approval.
"""
import numpy as np

SCHEMA_VERSION = 1
ALGORITHM_VERSION = 'waveform-bars-v2'


def checked_times(values, duration, name):
    a = np.asarray(values, dtype=float)
    if a.ndim != 1 or len(a) < 2 or not np.all(np.isfinite(a)):
        raise ValueError(f'{name} needs at least two finite times')
    if a[0] < 0 or a[-1] > duration or np.any(np.diff(a) <= 0):
        raise ValueError(f'{name} is outside coverage or not strictly increasing')
    return a


def inspect_bars(beats, downbeats, beat_activation, downbeat_activation, duration, fps=50, expected_beats_per_bar=4):
    if expected_beats_per_bar not in [3,4]:
        raise ValueError('Expected meter must have three or four beats')
    beats = checked_times(beats, duration, 'beats')
    downbeats = checked_times(downbeats, duration, 'downbeats')
    if any(len(a) <= round(beats[-1]*fps) for a in [beat_activation, downbeat_activation]):
        raise ValueError('Activation coverage is shorter than the beat map')
    indices = np.array([np.argmin(abs(beats-d)) for d in downbeats], dtype=int)
    if np.any(np.diff(indices) <= 0):
        raise ValueError('Downbeats must refer to distinct increasing beats')
    bars = []
    for start, end, time in zip(indices[:-1], indices[1:], downbeats[:-1]):
        gaps = np.diff(beats[start:end+1])
        activations = np.asarray(beat_activation)[np.rint(beats[start:end]*fps).astype(int)]
        first_activation = float(downbeat_activation[round(time*fps)])
        issues = []
        if end-start != expected_beats_per_bar:
            issues.append('meter-mismatch')
        if max(gaps)/min(gaps) > 1.4 or min(gaps) < .25 or max(gaps) > 1.8:
            issues.append('irregular-beat-spacing')
        if abs(beats[start]-time) > .08:
            issues.append('downbeat-not-near-beat')
        if np.min(activations) < .55 or np.mean(activations) < .65 or first_activation < .6:
            issues.append('weak-model-evidence')
        bars.append({'startBeat': int(start), 'endBeat': int(end), 'beatsPerBar': int(end-start),
                     'meanBeatActivation': round(float(np.mean(activations)), 5),
                     'downbeatActivation': round(first_activation, 5),
                     'status': 'uncertain' if issues else 'candidate', 'issues': issues})
    return bars


def waveform_envelope(signal, sample_rate, fps=100):
    signal = np.asarray(signal)
    if signal.ndim != 1 or not len(signal) or not np.all(np.isfinite(signal)):
        raise ValueError('Waveform must be finite mono audio')
    hop = round(sample_rate/fps)
    if hop < 1:
        raise ValueError('Invalid waveform sample rate')
    size = (len(signal)+hop-1)//hop
    padded = np.pad(signal, (0,size*hop-len(signal)))
    chunks = padded.reshape(-1,hop)
    return {'hopSeconds': hop/sample_rate, 'min': np.round(chunks.min(axis=1),4).tolist(),
            'max': np.round(chunks.max(axis=1),4).tolist()}
