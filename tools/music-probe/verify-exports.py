#!/usr/bin/env python3
"""Read the actual downloaded production WAVs and match spoken waveforms.

This checks the export's words against scheduled targets, not the correctness of
the inferred musical beat map. Requires the local smoke:music evidence first.
"""
from pathlib import Path
import json,wave
import numpy as np
from scipy.signal import correlate

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/music-probe'
evidence=json.loads((OUT/'app-browser-evidence.json').read_text())
pack=ROOT/'public/audio/default-en-female-v1'
manifest=json.loads((pack/'manifest.json').read_text())
def load(file):
    with wave.open(str(file),'rb') as f:
        assert f.getsampwidth()==2
        rate=f.getframerate();channels=f.getnchannels()
        data=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,channels)/32768
        return data,rate
words={}
for key,item in manifest['words'].items():
    data,rate=load(pack/item['file']);assert rate==48000
    # Use a short voiced section, away from both the silence and next word fade.
    begin=round((item['onsetMs']/1000+.04)*rate)
    words[key]=(data.mean(axis=1)[begin:begin+round(.12*rate)],begin)
results=[]
for item in evidence['exports']:
    audio,rate=load(item['file']);assert rate==48000 and audio.shape[1]==2
    duration=len(audio)/rate
    assert abs(duration-item['schedule']['end'])<=1/rate+1e-9
    assert np.max(np.abs(audio))<=1
    mono=audio.mean(axis=1);errors=[];scores=[]
    for job in item['schedule']['jobs']:
        if job['kind']!='voice':continue
        key=job['event']['voiceKey'];reference,reference_start=words[key]
        onset=manifest['words'][key]['onsetMs']/1000
        expected=(job['at']-onset)*rate+reference_start
        start=round(expected)-1920
        window=mono[start:start+len(reference)+3840]
        if len(window)<len(reference):raise AssertionError('word beyond output')
        correlation=correlate(window,reference,mode='valid',method='fft')
        offset=int(np.argmax(correlation))
        actual=start+offset
        quality=correlation[offset]/(np.linalg.norm(window[offset:offset+len(reference)])*np.linalg.norm(reference))
        errors.append((actual-expected)/rate*1000);scores.append(float(quality))
    result={'file':Path(item['file']).name,'seconds':duration,'words':len(errors),
        'maxAbsoluteWordAlignmentErrorMs':float(np.max(np.abs(errors))),
        'p95AbsoluteWordAlignmentErrorMs':float(np.percentile(np.abs(errors),95)),
        'minimumWaveformCorrelation':min(scores)}
    results.append(result)
    assert result['maxAbsoluteWordAlignmentErrorMs']<=2, result
    assert result['minimumWaveformCorrelation']>=.65,result
report={'method':'matched real spoken waveform in downloaded PCM16 WAV; +/-40ms search; no music-beat correctness claim',
    'files':results,'totalWords':sum(r['words'] for r in results)}
(OUT/'export-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
