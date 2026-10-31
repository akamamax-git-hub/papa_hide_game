"""Build the offline single-file game; source images and audio stay verified."""
import base64,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'src'
old=json.loads((src/'a.json').read_text())
assets={k:old[k] for k in ['bgm','ui','use','clear','fail','found']}
catalog=json.loads((ROOT/'scenario/sprite-catalog.json').read_text())
for key,path in catalog['sheets'].items():
 assets[key]=old[path.split(':',1)[1]] if path.startswith('embedded:') else 'data:image/png;base64,'+base64.b64encode((ROOT/path).read_bytes()).decode()
for path in sorted((ROOT/'assets/world').glob('room_*.png')):
 assets[path.stem]='data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()
stages=json.loads((ROOT/'scenario/Stage01-50_シナリオ企画表.json').read_text());boards=json.loads((ROOT/'scenario/storyboards.json').read_text())
data=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
constants=';'.join('const '+k+'='+data(v) for k,v in [('A',assets),('STAGES',stages),('BOARDS',boards),('CATALOG',catalog['sprites']),('SHEETS',catalog['sheets'])])+';'
script=(src/'world.js').read_text()+'\n'+(src/'game.js').read_text();style=(src/'style.css').read_text()
html=f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>パパにゲーム隠された Ver.0.12</title><link rel="icon" href="data:,"><style>{style}</style></head><body><div id="app"><main id="screen" class="screen"></main></div><div id="debug" class="hidden"></div><script>{constants}\n{script}</script></body></html>'''
(ROOT/'index.html').write_text(html)
print(f'Built standalone index.html: {len(html.encode()):,} bytes; 50 physical scenes, {sum(len(b["steps"]) for b in boards)} actions.')
