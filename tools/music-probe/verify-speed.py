#!/usr/bin/env python3
"""Measure local pitch-preserving variants; never certifies dance beat identity."""
from pathlib import Path
import io, json, subprocess, urllib.request, wave
import numpy as np
from scipy.signal import correlate, correlation_lags

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/music-probe'
BASE='http://127.0.0.1:5195'
catalog=json.load(urllib.request.urlopen(BASE+'/__music/catalog'))
track=catalog[0]
def read(data):
    with wave.open(io.BytesIO(data),'rb') as f:
        assert f.getsampwidth()==2
        sr=f.getframerate();ch=f.getnchannels()
        return np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,ch).mean(axis=1)/32768,sr
def rms(y,sr):
    size=round(sr*.002)
    y=y[:len(y)//size*size].reshape(-1,size)
    return np.sqrt(np.mean(y*y,axis=1))
results=[]
for section in track['sections']:
    decoded={}
    for rate in track['rates']:
        data=urllib.request.urlopen(f"{BASE}/__music/audio/{track['id']}/{section['id']}/{rate}").read()
        decoded[rate]=read(data)
    original,sr=decoded[1]
    expected_source_duration=(track['beatsMs'][section['endTick']//960]-track['beatsMs'][section['startTick']//960])/1000
    for rate,(audio,sr) in decoded.items():
        actual=len(audio)/sr;expected=expected_source_duration/rate
        feature=rms(audio,sr);source_feature=rms(original,sr)
        t=np.arange(len(feature))*.002
        reference=np.interp(t*rate,np.arange(len(source_feature))*.002,source_feature)
        shifts=[];qualities=[]
        for center in np.arange(.6,min(actual,expected)-.6,.5):
            lo,hi=round((center-.3)/.002),round((center+.3)/.002)
            a=feature[lo:hi];b=reference[lo:hi]
            a=a-a.mean();b=b-b.mean()
            if np.linalg.norm(a)*np.linalg.norm(b)<1e-8:continue
            corr=correlate(a,b,mode='full');lags=correlation_lags(len(a),len(b),mode='full')
            keep=np.abs(lags)<=30
            winner=np.argmax(corr[keep]);lag=lags[keep][winner]
            quality=corr[keep][winner]/(np.linalg.norm(a)*np.linalg.norm(b))
            if quality>=.6:
                shifts.append(float(lag*.002*1000));qualities.append(float(quality))
        results.append({'section':section['id'],'rate':rate,'expectedSeconds':expected,'decodedSeconds':actual,
            'durationErrorMs':(actual-expected)*1000,'matchedWindows':len(shifts),
            'medianEnvelopeShiftMs':float(np.median(shifts)) if shifts else None,
            'p95AbsoluteEnvelopeShiftMs':float(np.percentile(np.abs(shifts),95)) if shifts else None,
            'maxAbsoluteEnvelopeShiftMs':float(np.max(np.abs(shifts))) if shifts else None})

sr=48000;t=np.arange(sr*8)/sr;tone=.3*np.sin(2*np.pi*440*t)
buf=io.BytesIO()
with wave.open(buf,'wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((tone*32767).astype('<i2').tobytes())
tones=[]
for rate in track['rates']:
    data=subprocess.check_output(['ffmpeg','-v','error','-i','pipe:0','-af',f'atempo={rate}','-c:a','pcm_s16le','-f','wav','pipe:1'],input=buf.getvalue())
    audio,sr=read(data);segment=audio[2*sr:4*sr]
    spectrum=np.abs(np.fft.rfft(segment*np.hanning(len(segment))))
    peak=int(np.argmax(spectrum));hz=peak*sr/len(segment)
    tones.append({'rate':rate,'inputHz':440,'measuredOutputHz':hz})
    assert abs(hz-440)<=.5
report={'method':'2ms RMS envelope local alignment, >=0.6 correlation, +/-60ms search; not musical beat annotation',
    'variants':results,'pitchReference':tones}
(OUT/'speed-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
for item in results:
    assert abs(item['durationErrorMs']) <= 1000/48000 + .0001, item
    # At least eight informative windows per segment. Strong-window coverage is
    # reported explicitly; this is a sampled transient check, not full beat QA.
    assert item['matchedWindows'] >= 8, item
    assert item['p95AbsoluteEnvelopeShiftMs'] <= 40, item
