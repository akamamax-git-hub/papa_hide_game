"""Record sprite-sheet alpha bounds without modifying user or generated images.
Pillow is an authoring dependency only; normal builds read the committed catalog.
"""
from pathlib import Path
from PIL import Image
import base64,io,json
ROOT=Path(__file__).resolve().parents[1]
catalog={};sheets={}
def register(sheet,cols,rows,names,heights):
 path=ROOT/'assets/world'/f'{sheet}.png'
 if not path.exists():path=ROOT/'assets/chapter3'/f'{sheet}.png'
 im=Image.open(path).convert('RGBA');iw,ih=im.size;sheets[sheet]=str(path.relative_to(ROOT))
 cuts=None
 if sheet in ['atlas_boy','atlas_papa','atlas_npc1','atlas_npc2','atlas_seated']:
  raw=im.getchannel('A').point(lambda x:255 if x>190 else 0).tobytes();projection=[raw[y*iw:(y+1)*iw].count(255) for y in range(ih)];cuts=[0]
  for row in range(1,rows):
   expected=row*ih/rows;radius=int(ih/rows*.16);lo=max(1,int(expected)-radius);hi=min(ih-1,int(expected)+radius)
   candidates=[y for y in range(lo,hi) if projection[y]<=max(2,iw*.003)]
   cuts.append(min(candidates,key=lambda y:abs(y-expected)) if candidates else min(range(lo,hi),key=lambda y:(projection[y],abs(y-expected))))
  cuts.append(ih)
 for idx,name in enumerate(names):
  pad=10 if sheet=='atlas_interactions' else 2
  x0=round(idx%cols*iw/cols)+pad;y0=round(idx//cols*ih/rows)+pad
  x1=round((idx%cols+1)*iw/cols)-pad;y1=round((idx//cols+1)*ih/rows)-pad
  if cuts:y0=cuts[idx//cols];y1=cuts[idx//cols+1]
  if sheet=='atlas_utility':
   ranges=[(0,390),(0,380),(0,430),(0,430),(410,755),(380,755),(440,755),(440,755),(760,1086),(760,1086),(760,1086),(760,1086)];y0,y1=ranges[idx]
  if sheet=='extras_atlas':
   cuts=[0,485,815,1086];y0=cuts[idx//cols]+pad;y1=cuts[idx//cols+1]-pad
  alpha=im.getchannel('A').crop((x0,y0,x1,y1)).point(lambda x:255 if x>190 else 0)
  bbox=alpha.getbbox()
  if not bbox:raise ValueError((sheet,name))
  l,t,r,b=bbox
  # Preserve antialiased silhouette edges with a two pixel safety margin.
  l=max(0,l-2);t=max(0,t-2);r=min(x1-x0,r+2);b=min(y1-y0,b+2)
  catalog[name]={'sheet':sheet,'size':[iw,ih],'rect':[x0+l,y0+t,r-l,b-t],'worldHeight':heights.get(name,45)}
register('atlas_furniture',4,4,['cabinet','cabinet_open','sofa','table','tv','shelf','desk','bed','tub','vanity','washer','basket','bench','shed','locker','ladder'],dict(cabinet=190,cabinet_open=190,sofa=170,table=125,tv=245,shelf=345,desk=190,bed=300,tub=145,vanity=300,washer=190,basket=110,bench=160,shed=355,locker=325,ladder=265))
register('atlas_items1',5,4,['newspaper','remote','battery','catToy','stool','gloves','umbrellas','stamp','cutter','slippers','tongs','note','sponge','coin','rope','chime','cloth','spice','wrench','envelope'],dict(newspaper=35,remote=35,battery=25,catToy=95,stool=100,gloves=55,umbrellas=160,stamp=30,cutter=36,slippers=50,tongs=65,note=38,sponge=35,coin=20,rope=50,chime=95,cloth=45,spice=42,wrench=62,envelope=42))
register('atlas_items2',5,4,['ice','laundry','plane','net','dogTreat','magnets','papers','lamp','grocery','receipt','qr','catTreat','boxes','switch','drain','tap','pail','planter','scale','breadbox'],dict(ice=65,laundry=70,plane=38,net=170,dogTreat=45,magnets=42,papers=42,lamp=105,grocery=75,receipt=42,qr=30,catTreat=45,boxes=125,switch=40,drain=30,tap=75,pail=95,planter=110,scale=45,breadbox=90))
register('atlas_states',4,4,['fridge','fridge_open','wardrobe','wardrobe_open','locker','locker_open','shed','shed_open','washer','washer_open','bench','bench_open','parcel','parcel_open','panel','panel_open'],dict(fridge=325,fridge_open=325,wardrobe=340,wardrobe_open=340,locker=325,locker_open=325,shed=355,shed_open=355,washer=190,washer_open=190,bench=160,bench_open=160,parcel=90,parcel_open=90,panel=100,panel_open=100))
register('atlas_utility',4,3,['clock','window','tree','mat','plate','chair','breaker','breaker_on','microwave','microwave_on','towel','sensor'],dict(clock=80,window=150,tree=350,mat=40,plate=25,chair=165,breaker=85,breaker_on=85,microwave=95,microwave_on=95,towel=45,sensor=65))
register('props_atlas',6,4,['spoon','pudding','unusedFridge','unusedFridgeOpen','unusedMicro','unusedClock','unusedBreaker','unusedBreakerOn','unusedChair','tea','mug','coffee','pot','drawer','drawer_open','vacuum_idle','robotRemote','unusedPantry','books','unusedCloset','unusedClosetOpen','torch','torch_on','fort'],dict(spoon=30,pudding=35,tea=35,mug=36,coffee=36,pot=65,drawer=190,drawer_open=190,vacuum_idle=38,robotRemote=35,books=60,torch=45,torch_on=45,fort=210))
register('extras_atlas',4,3,['unusedGrandma','unusedGrandmaReceive','unusedGrandmaWalk','unusedGrandmaSit','blanket','pins','stickers','calendar','dial','dial_open','unusedPanel','unusedPanelOpen'],dict(blanket=60,pins=25,stickers=40,calendar=110,dial=160,dial_open=160))
register('atlas_boy',4,4,['boy_'+n for n in ['idle','walk1','walk2','pickup','reach','high','carry','push','climb','light','pour','dig','offer','read','open','happy']],{})
register('atlas_papa',4,2,['papa_'+n for n in ['idle','walk1','walk2','read','drink','surprise','angry','think']],{})
for sheet,actors in [('atlas_npc1',['mama','sister','grandma','grandpa']),('atlas_npc2',['courier','postman','repair','neighbor']),('atlas_pets',['cat','dog','crow','robot'])]:
 register(sheet,4,4,[a+'_'+p for a in actors for p in ['idle','receive','walk1','walk2']],{})
register('atlas_seated',4,2,['grandma_sit','grandpa_sleep','sister_eat','grandma_cook','mama_sit','grandpa_wake','sister_cry','grandma_sneeze'],{})
register('atlas_interactions',4,3,['tv_open','desk_open','vanity_open','shelf_open','boxes_open','breadbox_open','basket_open','cushion_open','flowerbed','flowerbed_open','wateringCan_full','ice_melted'],dict(flowerbed=100,flowerbed_open=100))
# Aliases refer to a real, explicitly selected drawing, never a substring match.
for a in ['mama','sister','grandma','grandpa','courier','postman','repair','neighbor','cat','dog','crow','robot']:
 for pose,base in [('offer','receive'),('reach','receive'),('read','idle'),('open','receive'),('push','receive'),('happy','receive'),('surprise','receive')]:catalog[a+'_'+pose]=catalog[a+'_'+base]
for pose in ['walk1','walk2','push','open','reach','read']:catalog['vacuum_'+pose]=catalog['vacuum_idle']
catalog['boy_surprise']=catalog['boy_high']
catalog['card']=catalog['qr']
# Original small item art is retained where no new drawing is necessary.
old=json.loads((ROOT/'src/a.json').read_text())
for name,key,height in [('key','item_鍵',26),('ball','item_ボール',45),('duck','item_アヒルおもちゃ',40),('dryer','item_ドライヤー',55),('shovel','item_スコップ',100),('wateringCan','item_じょうろ',70),('cushion','item_クッション',60),('console','console',65)]:
 raw=base64.b64decode(old[key].split(',')[1]);im=Image.open(io.BytesIO(raw)).convert('RGBA');b=im.getchannel('A').getbbox();l,t,r,bottom=b
 sheet='legacy_'+name;sheets[sheet]='embedded:'+key
 catalog[name]={'sheet':sheet,'size':list(im.size),'rect':[l,t,r-l,bottom-t],'worldHeight':height}
register('atlas_cleanitems',4,4,['key','ball','duck','dryer','shovel','wateringCan','cushion','console','box_red','box_blue','box_green','curryPot','scale','note_dry','calendar','lamp'],dict(key=26,ball=45,duck=40,dryer=55,shovel=100,wateringCan=70,cushion=60,console=65,box_red=100,box_blue=100,box_green=100,curryPot=65,scale=45,note_dry=38,calendar=110,lamp=105))
used={v['sheet'] for v in catalog.values()};sheets={k:v for k,v in sheets.items() if k in used}
(ROOT/'scenario/sprite-catalog.json').write_text(json.dumps({'sheets':sheets,'sprites':catalog},ensure_ascii=False,indent=2))
print('Catalog:',len(catalog),'sprites in',len(sheets),'sheets')
