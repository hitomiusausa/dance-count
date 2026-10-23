#!/usr/bin/env python3
"""Analyze local audio into measured beat/downbeat candidates and waveform data.

Downloads a pinned model if needed. Audio stays local. Nothing goes into public/.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import urllib.request

os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK', '1')
import numpy as np
import torch
from beat_this.inference import Audio2Frames
from beat_this.model.postprocessor import Postprocessor
from bar_analysis import ALGORITHM_VERSION, SCHEMA_VERSION, inspect_bars, waveform_envelope

MODEL_SHA256 = '8c328b45f59d8dd3dff219253ff6a8d6482be57d0133a29140e2febbf8eb8331'
MODEL_URLS = [
    'https://cloud.cp.jku.at/public.php/dav/files/7ik4RrBKTS273gp/final0.ckpt',
    # Byte-identical redistribution; always verify the pinned upstream weight hash.
    'https://huggingface.co/rtikw/localmusic-assets/resolve/main/analysis/beat_this-final0.ckpt'
]

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def checkpoint(path):
    if path.exists():
        if sha(path) != MODEL_SHA256:
            raise ValueError('Model hash mismatch; keep the file for investigation')
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.download')
    for url in MODEL_URLS:
        try:
            print('Downloading model (audio is not uploaded):', url, flush=True)
            with urllib.request.urlopen(url, timeout=20) as response, temporary.open('wb') as stream:
                size = 0
                while chunk := response.read(1024*1024):
                    size += len(chunk)
                    if size > 100*1024*1024:
                        raise ValueError('Model download exceeds size limit')
                    stream.write(chunk)
            if sha(temporary) != MODEL_SHA256:
                raise ValueError('Downloaded model hash mismatch')
            temporary.replace(path)
            return
        except Exception as error:
            print('Model source unavailable:', type(error).__name__, flush=True)
            temporary.unlink(missing_ok=True)
    raise RuntimeError('No verified checkpoint could be downloaded')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=Path('output/music-probe'))
    parser.add_argument('--beats-per-bar',type=int,choices=[3,4],default=4)
    parser.add_argument('--checkpoint', type=Path, help='Reuse an already verified final0 model file')
    parser.add_argument('--device', choices=['auto','cpu','mps'], default='auto')
    args = parser.parse_args()
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    source_hash = sha(args.source)
    model_path = args.checkpoint or out/'models/final0.ckpt'
    checkpoint(model_path)
    metadata=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0',
        '-show_entries','stream=sample_rate','-of','json',str(args.source)]))
    sr=int(metadata['streams'][0]['sample_rate'])
    decoded=subprocess.check_output(['ffmpeg','-nostdin','-v','error','-i',str(args.source),
        '-map','0:a:0','-ac','1','-f','f32le','-'])
    mono=np.frombuffer(decoded,dtype='<f4')
    duration = len(mono)/sr
    if not np.isfinite(duration) or duration <= 0 or not np.all(np.isfinite(mono)):
        raise ValueError('Invalid source waveform')
    device = args.device if args.device != 'auto' else 'mps' if torch.backends.mps.is_available() else 'cpu'
    cache = out/'frames'/f'{source_hash}-{MODEL_SHA256}-ffmpeg-zero-v1.npz'
    began = time.monotonic()
    if cache.exists():
        with np.load(cache, allow_pickle=False) as frames:
            if str(frames['sourceSha256']) != source_hash or str(frames['modelSha256']) != MODEL_SHA256:
                raise ValueError('Frame-cache identity mismatch')
            beat_logits, down_logits = frames['beatLogits'], frames['downbeatLogits']
        print('Using verified local activation cache', flush=True)
    else:
        print('Analyzing waveform and log-mel spectrogram locally on', device, flush=True)
        torch.set_num_threads(4)
        model = Audio2Frames(checkpoint_path=str(model_path), device=device, float16=False)
        chunks = [0]
        def progress(*_):
            chunks[0] += 1
            print('Audio chunk', chunks[0], 'analyzed', flush=True)
        model.model.register_forward_hook(progress)
        beat_logits, down_logits = model(mono, sr)
        beat_logits, down_logits = beat_logits.cpu().numpy(), down_logits.cpu().numpy()
        cache.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(cache, sourceSha256=source_hash, modelSha256=MODEL_SHA256,
                            beatLogits=beat_logits, downbeatLogits=down_logits)
    beats, downbeats = Postprocessor()(torch.from_numpy(beat_logits), torch.from_numpy(down_logits))
    pb, pd = torch.from_numpy(beat_logits).sigmoid().numpy(), torch.from_numpy(down_logits).sigmoid().numpy()
    bars = inspect_bars(beats, downbeats, pb, pd, duration, expected_beats_per_bar=args.beats_per_bar)
    histogram = {str(n): sum(bar['beatsPerBar']==n for bar in bars) for n in sorted({b['beatsPerBar'] for b in bars})}
    if sha(args.source) != source_hash:
        raise ValueError('Source changed during analysis')
    data = {'schemaVersion': SCHEMA_VERSION, 'algorithmVersion': ALGORITHM_VERSION,
            'sourceSha256': source_hash, 'durationSeconds': duration, 'expectedBeatsPerBar':args.beats_per_bar,
            'method': {'name': 'Beat This! final0', 'checkpointSha256': MODEL_SHA256,
                       'frameRate': 50, 'device': device, 'postprocessing': 'minimal + structural bar checks',
                       'reference': 'https://github.com/CPJKU/beat_this',
                       'decoder': 'ffmpeg mono float32; original sample rate; decoded first sample = time zero',
                       'versions': {key: importlib.metadata.version(key) for key in ['beat-this','torch','torchaudio','numpy','soundfile']}},
            'beatsMs': np.round(beats*1000,3).tolist(), 'downbeatsMs': np.round(downbeats*1000,3).tolist(),
            'bars': bars, 'waveform': waveform_envelope(mono, sr),
            'activations': {'hopSeconds': .02, 'beat': np.round(pb,4).tolist(), 'downbeat': np.round(pd,4).tolist()},
            'summary': {'beatCount': len(beats), 'downbeatCount': len(downbeats), 'beatsPerBarHistogram': histogram,
                        'candidateBars': sum(b['status']=='candidate' for b in bars),
                        'uncertainBars': sum(b['status']=='uncertain' for b in bars),
                        'medianBpm': float(60/np.median(np.diff(beats))),
                        'untrackedTailSeconds': float(duration-beats[-1])},
            'review': {'status': 'machine-candidate', 'humanReviewed': False,
                       'note': 'Activation strength is not a calibrated correctness probability. No genre or rights approval.'}}
    canonical = json.dumps(data, sort_keys=True, separators=(',',':'), allow_nan=False)
    data['analysisId'] = hashlib.sha256(canonical.encode()).hexdigest()
    data['createdAt'] = datetime.now(timezone.utc).isoformat()
    destination = out/'bar-analysis.json'
    if destination.exists():
        previous = destination.read_bytes()
        history = out/'bar-analysis-history'
        history.mkdir(exist_ok=True)
        backup = history/f'{hashlib.sha256(previous).hexdigest()}.json'
        if not backup.exists():
            shutil.copy2(destination, backup)
    temporary = destination.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, allow_nan=False)+'\n')
    temporary.replace(destination)
    print(json.dumps({'analysisId': data['analysisId'], 'elapsedSeconds':time.monotonic()-began, **data['summary']},indent=2),flush=True)

if __name__ == '__main__':
    main()
