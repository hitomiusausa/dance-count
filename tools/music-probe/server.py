#!/usr/bin/env python3
"""Loopback-only lab. Audio is generated on request, never placed in public/."""
import argparse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import json
import mimetypes
from pathlib import Path
import subprocess
from urllib.parse import urlsplit, parse_qs, unquote

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--port', type=int, default=5194)
args = parser.parse_args()
SOURCE = args.source.resolve(strict=True)
REPORT = ROOT/'output/music-probe/analysis.json'
report = json.loads(REPORT.read_text())
# Prevent accidentally playing a different WAV with a stale map.
import hashlib
if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != report['sourceSha256']:
    raise SystemExit('Source hash does not match analysis.json. Run analyze.py first.')

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        route = urlsplit(self.path)
        if route.path == '/clip.wav':
            try:
                query = parse_qs(route.query)
                start, duration = float(query.get('start', ['20'])[0]), float(query.get('duration', ['32'])[0])
                if not (0 <= start < report['durationSeconds'] and 0 < duration <= 40 and start + duration <= report['durationSeconds']):
                    raise ValueError('Range outside source or greater than 40 seconds')
                data = subprocess.check_output(['ffmpeg','-v','error','-i',str(SOURCE),'-ss',str(start),
                    '-t',str(duration),'-ar','48000','-c:a','pcm_s16le','-f','wav','-'])
                return self.send_bytes(data, 'audio/wav')
            except (ValueError, subprocess.CalledProcessError):
                return self.send_error(400, 'Invalid audio range')
        requested = '/tools/music-probe/index.html' if route.path == '/' else unquote(route.path)
        path = (ROOT/requested.lstrip('/')).resolve()
        allowed = [ROOT/'tools/music-probe', ROOT/'src/engine', ROOT/'public/audio', ROOT/'output/music-probe']
        if not any(path.is_relative_to(folder) for folder in allowed) or not path.is_file():
            return self.send_error(404)
        self.send_bytes(path.read_bytes(), mimetypes.guess_type(path.name)[0] or 'application/octet-stream')

    def send_bytes(self, data, kind):
        self.send_response(200)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(data)

print(f'Local music lab: http://127.0.0.1:{args.port}/', flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
