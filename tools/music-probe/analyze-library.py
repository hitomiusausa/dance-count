#!/usr/bin/env python3
"""Prepare explicitly named local Waltz/Rumba/Cha-cha samples for experiments."""
import argparse
from datetime import datetime, timezone
import hashlib,json
from pathlib import Path
import subprocess,sys

DANCES={'waltz':('waltz',3,'ワルツ'),'rumba':('rumba',4,'ルンバ'),'chacha':('chacha',4,'チャチャチャ'),'tango':('tango',4,'タンゴ')}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory',type=Path)
    parser.add_argument('--output',type=Path,default=Path('output/music-probe'))
    args=parser.parse_args();out=args.output.resolve();inputs=out/'local-inputs';inputs.mkdir(parents=True,exist_ok=True)
    queue=[];counts={}
    for path in sorted(args.directory.iterdir(),key=lambda p:p.name.casefold()):
        if path.suffix.lower() not in ['.mp3','.wav','.flac','.ogg']:continue
        kind=path.name.split('_')[0].casefold()
        if kind not in DANCES:continue
        dance,meter,japanese=DANCES[kind]
        try:data=path.read_bytes()
        except FileNotFoundError:continue # A producer may still be renaming inputs.
        digest=hashlib.sha256(data).hexdigest();snapshot=inputs/f'{digest}{path.suffix.lower()}'
        if not snapshot.exists():snapshot.write_bytes(data)
        counts[dance]=counts.get(dance,0)+1
        parts=path.stem.split('_');title=' '.join(parts[2:]) if len(parts)>2 else path.stem
        queue.append({'id':f'{dance}-{digest[:12]}','title':title,'label':f'{japanese}{counts[dance]}',
          'danceId':dance,'expectedBeatsPerBar':meter,'sourceSha256':digest,
          'filenameAtSnapshot':path.name,'sourcePath':str(snapshot.relative_to(out)),
          'analysisPath':f'library/{digest[:16]}/bar-analysis.json'})
    if not queue:raise SystemExit('No explicitly named sample files found')
    for item in queue:
        print('Analyzing',item['label'],item['filenameAtSnapshot'],flush=True)
        subprocess.run([sys.executable,str(Path(__file__).with_name('analyze-bars.py')),str(out/item['sourcePath']),
          '--output',str((out/item['analysisPath']).parent),'--checkpoint',str(out/'models/final0.ckpt'),
          '--beats-per-bar',str(item['expectedBeatsPerBar'])],check=True)
    index={'schemaVersion':1,'createdAt':datetime.now(timezone.utc).isoformat(),'tracks':queue}
    destination=out/'library-index.json'
    if destination.exists():
        previous=destination.read_bytes();history=out/'library-index-history';history.mkdir(exist_ok=True)
        backup=history/f'{hashlib.sha256(previous).hexdigest()}.json'
        if not backup.exists():backup.write_bytes(previous)
    temporary=destination.with_suffix('.tmp');temporary.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n');temporary.replace(destination)
    print('Prepared',len(queue),'local experiments. Audio was not uploaded.',flush=True)

if __name__=='__main__':main()
