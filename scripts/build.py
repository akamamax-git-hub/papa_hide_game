"""Build a small cached web entry and a separate self-contained offline edition."""
import base64,hashlib,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'src';DIST=ROOT/'dist';WEB=ROOT/'web-assets'
WEB.mkdir(exist_ok=True);(DIST/'web').mkdir(parents=True,exist_ok=True);(DIST/'offline').mkdir(parents=True,exist_ok=True)
version=json.loads((ROOT/'package.json').read_text())['version']
old=json.loads((src/'a.json').read_text());catalog=json.loads((ROOT/'scenario/sprite-catalog.json').read_text())
optimized_path=ROOT/'assets/web/manifest.json';optimized=json.loads(optimized_path.read_text()) if optimized_path.exists() else {}
web_assets={};offline_assets={};published=set();web_catalog=json.loads(json.dumps(catalog));source_hashes={}
def write_asset(name,raw,extension):
    filename=f'{name}.{hashlib.sha256(raw).hexdigest()[:16]}.{extension}'
    (WEB/filename).write_bytes(raw);published.add(filename);return 'web-assets/'+filename
def add_image(key,path):
    original=(ROOT/path).read_bytes();entry=optimized.get(path);chosen=original;extension='png'
    if entry and entry['source_sha256']==hashlib.sha256(original).hexdigest():
        candidate=(ROOT/entry['file']).read_bytes()
        if hashlib.sha256(candidate).hexdigest()!=entry['sha256']:raise ValueError('Web asset integrity: '+path)
        chosen=candidate;extension='webp'
    web_assets[key]=write_asset(key,chosen,extension)
    offline_assets[key]='data:image/png;base64,'+base64.b64encode(original).decode()
for key in ['bgm','ui','use','clear','fail','found']:
    mime,encoded=old[key].split(',',1);extension='m4a' if 'mp4' in mime else 'mp3'
    web_assets[key]=write_asset(key,base64.b64decode(encoded),extension);offline_assets[key]=old[key]
sprite_path=ROOT/'assets/web/sprite-manifest.json';sprite_entries=json.loads(sprite_path.read_text()) if sprite_path.exists() else {}
for name,m in catalog['sprites'].items():
    source=catalog['sheets'][m['sheet']];entry=sprite_entries.get(name)
    if not entry or entry['source']!=source or entry['rect']!=m['rect']:continue
    if source not in source_hashes:source_hashes[source]=hashlib.sha256((ROOT/source).read_bytes()).hexdigest()
    if source_hashes[source]!=entry['source_sha256']:continue
    raw=(ROOT/entry['file']).read_bytes();sha=hashlib.sha256(raw).hexdigest()
    if sha!=entry['sha256']:raise ValueError('Sprite integrity: '+name)
    x,y,w,h=m['rect'];rx,ry,rw,rh=entry['region']
    if not (rx<=x and ry<=y and x+w<=rx+rw and y+h<=ry+rh):raise ValueError('Sprite region: '+name)
    sheet='draw_'+sha[:16];web_assets[sheet]=write_asset('sprite',raw,'webp')
    web_catalog['sprites'][name]={**m,'sheet':sheet,'size':[rw,rh],'rect':[x-rx,y-ry,w,h]}
    web_catalog['sheets'][sheet]=entry['file']
used_sheets={m['sheet'] for m in web_catalog['sprites'].values()};web_catalog['sheets']={k:v for k,v in web_catalog['sheets'].items() if k in used_sheets}
for key,path in catalog['sheets'].items():
    if path.startswith('embedded:'):
        value=old[path.split(':',1)[1]];web_assets[key]=write_asset(key,base64.b64decode(value.split(',',1)[1]),'png');offline_assets[key]=value
    elif key in used_sheets:add_image(key,path)
    else:offline_assets[key]='data:image/png;base64,'+base64.b64encode((ROOT/path).read_bytes()).decode()
for path in sorted((ROOT/'assets/world').glob('room_*.png')):add_image(path.stem,str(path.relative_to(ROOT)))
stages=json.loads((ROOT/'scenario/Stage01-50_シナリオ企画表.json').read_text());boards=json.loads((ROOT/'scenario/storyboards.json').read_text())
def data(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
def constants(assets,selected):return ';'.join('const '+key+'='+data(value) for key,value in [('A',assets),('STAGES',stages),('BOARDS',boards),('CATALOG',selected['sprites']),('SHEETS',selected['sheets'])])+';'
script='\n'.join((src/name).read_text() for name in ['scene.js','world.js','assets.js','contacts.js','game.js']);style=(src/'style.css').read_text()
css_url=write_asset('game',style.encode(),'css');js_url=write_asset('game',(constants(web_assets,web_catalog)+'\n'+script).encode(),'js')
head=f'<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>パパにゲーム隠された Ver.{version}</title><link rel="icon" href="data:,">'
boot='''<style>body{margin:0;background:#eaf1f5;color:#24324a;font-family:system-ui,sans-serif}.boot{max-width:480px;margin:18vh auto;padding:32px;background:white;border-radius:20px;text-align:center}.boot p{line-height:1.8}.boot button{padding:12px 24px;border:0;border-radius:10px;background:#196fa8;color:white}</style>'''
body='<div id="app"><main id="screen" class="screen"><section class="boot" id="bootStatus" role="status"><h1>パパにゲーム隠された</h1><p id="bootMessage">ゲームを準備しています…</p><button id="bootRetry" hidden onclick="location.reload()">再読み込み</button></section></main></div><div id="debug" class="hidden"></div>'
recovery="""<script>function bootFailure(){if(!document.getElementById('bootStatus'))return;document.getElementById('bootMessage').textContent='読み込みに失敗しました。再読み込みしてください。';document.getElementById('bootRetry').hidden=false;}window.addEventListener('error',bootFailure,true);</script>"""
html=head+boot+f'<link rel="stylesheet" href="{css_url}"><script defer src="{js_url}"></script></head><body>'+body+recovery+'<noscript>ゲームを遊ぶにはJavaScriptを有効にしてください。</noscript></body></html>'
(ROOT/'index.html').write_text(html);(DIST/'web/index.html').write_text(html)
# Publish only the content-addressed resources referenced by this build.
public_assets=DIST/'web/web-assets'
if public_assets.exists():shutil.rmtree(public_assets)
public_assets.mkdir()
for filename in sorted(published):shutil.copyfile(WEB/filename,public_assets/filename)
offline=head+f'<style>{style}</style></head><body>'+body+'<script>'+constants(offline_assets,catalog)+'\n'+script+'</script></body></html>'
(DIST/'offline/papa-hide-game.html').write_text(offline)
report=dict(version=version,html_bytes=len(html.encode()),javascript_bytes=(ROOT/js_url).stat().st_size,css_bytes=len(style.encode()),offline_bytes=len(offline.encode()),image_count=len(web_catalog['sheets'])+len(list((ROOT/'assets/world').glob('room_*.png'))),media_files=len(published)-2)
(DIST/'build-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
