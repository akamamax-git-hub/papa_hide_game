"""Build the offline, single-file game from readable sources and embedded assets."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / 'src'
assets = json.loads((src / 'a.json').read_text())
for path in sorted((ROOT / 'assets' / 'chapter3').glob('*.png')):
    import base64
    assets[path.stem] = 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()
stages = json.loads((ROOT / 'scenario' / 'Stage01-50_シナリオ企画表.json').read_text())
chapter = (src / 'chapter3.js').read_text()
game = (src / 'game.js').read_text()
style = (src / 'style.css').read_text() + '\n' + (src / 'chapter3.css').read_text()
data = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
html = f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>パパにゲーム隠された Ver.0.11</title><link rel="icon" href="data:,">
<style>{style}</style></head><body><div id="app"><main class="screen" id="screen"></main></div><div id="debug" class="hidden"></div>
<script>const A={data(assets)};const STAGES={data(stages)};\n{chapter}\n{game}</script></body></html>'''
(ROOT / 'index.html').write_text(html)
print(f'Built index.html ({len(html.encode()):,} bytes), no network dependencies.')
