"""Prepare transport assets from the exact atlas regions the renderer already uses.
Original art is untouched; dimensions, alpha and every visible RGB pixel are verified.
Pillow is an authoring dependency only, not a dependency of normal web/offline builds.
"""
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
import hashlib,json,io
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/web'
def encode_image(im):
    original=im.convert('RGBA');raw=io.BytesIO();original.save(raw,format='WEBP',lossless=True,method=4)
    encoded=raw.getvalue();decoded=Image.open(io.BytesIO(encoded)).convert('RGBA')
    assert original.size==decoded.size
    a=original.tobytes();b=decoded.tobytes();assert a[3::4]==b[3::4]
    assert all(a[i:i+3]==b[i:i+3] for i in range(0,len(a),4) if a[i+3])
    return encoded

def encode_full(relative):
    source=ROOT/relative;encoded=encode_image(Image.open(source));target=OUT/(source.stem+'.webp');target.write_bytes(encoded)
    return relative,dict(file=str(target.relative_to(ROOT)),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),sha256=hashlib.sha256(encoded).hexdigest(),source_bytes=source.stat().st_size,bytes=len(encoded),visible_pixels_identical=True)

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'sprites').mkdir(exist_ok=True)
    catalog=json.loads((ROOT/'scenario/sprite-catalog.json').read_text());sheets=catalog['sheets']
    full_sources=sorted(str(p.relative_to(ROOT)) for p in (ROOT/'assets/world').glob('room_*.png'))
    with ProcessPoolExecutor(max_workers=4) as pool:entries=dict(pool.map(encode_full,full_sources))
    (OUT/'manifest.json').write_text(json.dumps(entries,indent=2)+'\n')
    # Keep related animation frames together; deliver static objects individually.
    groups={}
    for name,m in catalog['sprites'].items():
        source=sheets[m['sheet']]
        if source.startswith('embedded:'):continue
        key=('actor',name.split('_',1)[0],source) if 'hand' in m else ('object',source,tuple(m['rect']))
        groups.setdefault(key,[]).append((name,m))
    source_images={};source_hashes={};sprites={};files={}
    for group in groups.values():
        source=sheets[group[0][1]['sheet']]
        if source not in source_images:
            source_images[source]=Image.open(ROOT/source).convert('RGBA');source_hashes[source]=hashlib.sha256((ROOT/source).read_bytes()).hexdigest()
        x=min(m['rect'][0] for _,m in group);y=min(m['rect'][1] for _,m in group)
        right=max(m['rect'][0]+m['rect'][2] for _,m in group);bottom=max(m['rect'][1]+m['rect'][3] for _,m in group)
        encoded=encode_image(source_images[source].crop((x,y,right,bottom)));sha=hashlib.sha256(encoded).hexdigest();target=OUT/'sprites'/(sha[:20]+'.webp');target.write_bytes(encoded)
        files[str(target.relative_to(ROOT))]=len(encoded)
        for name,m in group:
            sprites[name]=dict(file=str(target.relative_to(ROOT)),source=source,rect=m['rect'],region=[x,y,right-x,bottom-y],source_sha256=source_hashes[source],sha256=sha,bytes=len(encoded),visible_pixels_identical=True)
    (OUT/'sprite-manifest.json').write_text(json.dumps(sprites,indent=2)+'\n')
    # Remove only superseded authoring outputs, preserving all original source art.
    wanted={v['file'] for v in entries.values()}|set(files)
    for file in OUT.rglob('*.webp'):
        if str(file.relative_to(ROOT)) not in wanted:file.unlink()
    print('Verified backgrounds:',len(entries),'; atlas region groups:',len(groups),'; sprite names:',len(sprites),'; transport bytes:',sum((ROOT/file).stat().st_size for file in wanted))
