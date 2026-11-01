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
 if any(sheet.startswith(n) for n in ['atlas_boy','atlas_papa','atlas_npc1','atlas_npc2','atlas_seated']):
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
  if sheet=='atlas_fixtures':
   edges=[[0,302,625,852,1086],[0,313,615,852,1086],[0,302,625,855,1086],[0,302,625,860,1086]][idx%4];y0=edges[idx//4];y1=edges[idx//4+1]
  if sheet=='atlas_orderedprops':y0,y1=([0,508] if idx//cols==0 else [508,ih])
  if sheet=='atlas_coloredboxes':y0,y1=([0,460] if idx//cols==0 else [460,ih])
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
register('atlas_controls',4,2,['switch13','switch13_on','starButton','starButton_on','combinationLock','combinationLock_on','keyhole13','intercom13'],dict(switch13=38,switch13_on=38,starButton=25,starButton_on=25,combinationLock=38,combinationLock_on=38,keyhole13=23,intercom13=60))
register('atlas_reach',4,2,['boy_'+n for n in ['reachLow','kneel','reachWaist','reachChest','reachUp','reachOver','hold','climbReach']],{})
register('atlas_uppercab',2,1,['upperCab','upperCab_open'],dict(upperCab=345,upperCab_open=345))
register('atlas_robot',2,1,['robot_idle','robot_open'],{})
register('atlas_orderedprops',4,2,['umbrella_blue','umbrella_yellow','umbrella_folded','book1','book2','book3','book4','book_plain'],dict(umbrella_blue=160,umbrella_yellow=160,umbrella_folded=90,book1=60,book2=60,book3=60,book4=60))
register('atlas_fixtures',4,4,['tv','tv_open','desk','desk_open','vanity','vanity_open','shelf','shelf_open','basket','basket_open','breadbox','breadbox_open','flowerbed','flowerbed_open','ice','ice_melted'],dict(tv=245,tv_open=245,desk=190,desk_open=190,vanity=300,vanity_open=300,shelf=345,shelf_open=345,basket=110,basket_open=110,breadbox=90,breadbox_open=90,flowerbed=100,flowerbed_open=100,ice=65,ice_melted=65))
for name in ['tv','desk','vanity','shelf','basket','breadbox','flowerbed']:
 catalog[name+'_open']['worldHeight']=catalog[name]['worldHeight']*catalog[name+'_open']['rect'][3]/catalog[name]['rect'][3]
register('atlas_clock',2,1,['clock','clock_open'],dict(clock=80,clock_open=80))
register('atlas_vanity',2,1,['vanity','vanity_open'],dict(vanity=300,vanity_open=300))
register('atlas_coloredboxes',3,2,['box_red','box_blue','box_green','box_red_open','box_blue_open','box_green_open'],dict(box_red=100,box_blue=100,box_green=100,box_red_open=128,box_blue_open=128,box_green_open=128))
catalog['vanity_open']['anchor']=[.45,1]
catalog['vanity_open']['worldHeight']=300*catalog['vanity_open']['rect'][3]/catalog['vanity']['rect'][3]
for name in ['umbrella_blue','umbrella_yellow','umbrella_folded']:catalog[name]['grip']=[.5,.1]
# Four real magnets use four non-overlapping atlas regions; source pixels stay intact.
mag=catalog['magnets'];x,y,w,h=mag['rect']
for color,u,v in [('red',0,0),('yellow',1,0),('blue',0,1),('green',1,1)]:
 catalog['magnet_'+color]={**mag,'rect':[x+round(u*w/2),y+round(v*h/2),round(w/2),round(h/2)],'worldHeight':24}
catalog['upperCab_open']['anchor']=[.55,1]
from contact_profiles import HANDS
scales={'pickup':.65,'push':.85,'high':1.14,'dig':.68,'open':.72,'climb':1.03,'reachLow':.7,'kneel':.7,'reachUp':1.03,'reachOver':1.12,'climbReach':1.02}
newHands={'reachLow':[.965,.965],'kneel':[.96,.80],'reachWaist':[.96,.50],'reachChest':[.96,.185],'reachUp':[.97,.03],'reachOver':[.90,.03],'hold':[.94,.50],'climbReach':[.96,.035]}
for name,m in catalog.items():
 if name.startswith(('boy_','papa_','mama_','sister_','grandma_','grandpa_','courier_','postman_','repair_','neighbor_','cat_','dog_','crow_','robot_','vacuum_')):
  m=dict(m);catalog[name]=m
  actor,pose=name.split('_',1);m['hand']=newHands.get(pose,HANDS.get(pose,[.8,.5]));m['bodyScale']=scales.get(pose,1) if actor=='boy' else .7 if pose in ['sit','sleep','eat'] or actor=='papa' and pose in ['read','drink'] else 1
  if actor in ['mama','sister','grandma','grandpa'] and pose in ['receive','offer','reach','open','push','happy','surprise']:m['hand']=[.08,.43]
  if actor in ['courier','postman','repair','neighbor'] and pose in ['receive','offer','reach','open','push']:m['hand']=[.12,.50]
  if actor in ['cat','dog']:m['hand']=[.5,.30]
  if actor=='crow':m['hand']=[.25,.42]
  if actor in ['vacuum','robot']:m['hand']=[.95,.65] if actor=='vacuum' else [.5,.65]
# Explicit actual machine states: opening is not a walking frame.
catalog['robot_scan']=dict(catalog['robot_receive']);catalog['robot_walk1']=dict(catalog['robot_walk2'])
catalog['switch']=dict(catalog['switch13']);catalog['umbrellaStand']=dict(catalog['basket']);catalog['intercom']=dict(catalog['intercom13'])
for name,grip,tip in [('net',[.80,.92],[.28,.18]),('tongs',[.78,.82],[.20,.10]),('torch',[.72,.62],[.12,.40]),('dryer',[.75,.80],[.12,.25]),('rope',[.5,.8],[.5,.1])]:catalog[name]['grip']=grip;catalog[name]['tip']=tip

catalog['papa_drink']['hand']=[.27,.20];catalog['papa_read']['hand']=[.82,.42];catalog['grandma_sit']['hand']=[.55,.36];catalog['sister_eat']['hand']=[.46,.35]
catalog['papa_watch']=dict(catalog['papa_read'])
catalog['robot_idle']['hand']=[.67,.42]
for name,uv in {'cat_idle':[.50,.47],'cat_receive':[.06,.50],'cat_walk1':[.94,.46],'cat_walk2':[.15,.80],'crow_idle':[.04,.28],'dog_idle':[.5,.43],'dog_receive':[.08,.51]}.items():catalog[name]['hand']=uv
for name,uv in {'mama_idle':[.40,.60],'sister_idle':[.50,.60],'grandma_idle':[.52,.58]}.items():catalog[name]['hand']=uv
for actor in ['cat','dog']:catalog[actor+'_eat']={**catalog[actor+'_walk2'],'bodyScale':.75}
for name,grip,tip in [('shovel',[.85,.20],[.15,.90]),('wateringCan',[.60,.18],[.10,.35]),('mug',[.85,.5],[.2,.1]),('coffee',[.85,.5],[.2,.1]),('spoon',[.2,.8],[.8,.2])]:catalog[name]['grip']=grip;catalog[name]['tip']=tip
catalog['pot']['grip']=[.86,.52];catalog['pot']['tip']=[.08,.18]
for name,x in [('fridge_open',.32),('locker_open',.65),('shelf_open',.43)]:catalog[name]['anchor']=[x,1]
# Room-specific footwear is authored art. Preserve each pose's contact metadata.
for name,m in catalog.items():
 if name.split('_')[0] in ['boy','papa','mama','sister','grandma','grandpa','courier','postman','repair','neighbor']:m['footwear']='barefoot' if name.startswith('papa_') else 'outdoor'
canonical={k:dict(v) for k,v in catalog.items()}
for sheet,cols,rows,names,wear in [
 ('atlas_boy_indoor',4,4,['boy_'+n for n in ['idle','walk1','walk2','pickup','reach','high','carry','push','climb','light','pour','dig','offer','read','open','happy']],'indoor'),
 ('atlas_reach_indoor',4,2,['boy_'+n for n in ['reachLow','kneel','reachWaist','reachChest','reachUp','reachOver','hold','climbReach']],'indoor'),
 ('atlas_papa_indoor',4,2,['papa_'+n for n in ['idle','walk1','walk2','read','drink','surprise','angry','think']],'indoor'),
 ('atlas_papa_outdoor',4,2,['papa_'+n for n in ['idle','walk1','walk2','read','drink','surprise','angry','think']],'outdoor'),
 ('atlas_npc1_indoor',4,4,[a+'_'+p for a in ['mama','sister','grandma','grandpa'] for p in ['idle','receive','walk1','walk2']],'indoor'),
 ('atlas_npc2_indoor',4,4,[a+'_'+p for a in ['courier','postman','repair','neighbor'] for p in ['idle','receive','walk1','walk2']],'indoor'),
 ('atlas_seated_indoor',4,2,['grandma_sit','grandpa_sleep','sister_eat','grandma_cook','mama_sit','grandpa_wake','sister_cry','grandma_sneeze'],'indoor')]:
 register(sheet,cols,rows,[n+'_'+wear for n in names],{})
 for n in names:
  new=catalog[n+'_'+wear];catalog[n+'_'+wear]={**canonical[n],**new,'footwear':wear}
 # Aliases use the same edited frame as their explicitly selected original.
 for name,original in canonical.items():
  if name+'_'+wear in catalog:continue
  base=next((n for n in names if canonical[n]['sheet']==original['sheet'] and canonical[n]['rect']==original['rect']),None)
  if base:catalog[name+'_'+wear]={**catalog[base+'_'+wear],**{k:v for k,v in original.items() if k not in ['sheet','size','rect','footwear']}}
register('atlas_interaction14',3,1,['papa_receive_indoor','papa_receive_outdoor','stool'],dict(stool=140))
for wear in ['indoor','outdoor']:catalog['papa_receive_'+wear].update(hand=[.06,.405],bodyScale=1,footwear=wear)
catalog['papa_receive']=dict(catalog['papa_receive_indoor'])
catalog['ladder']['worldHeight']=400
catalog['stool']['supportPlane']=[[.19,.14],[.47,.01],[.95,.15],[.71,.32]]
catalog['tv']['screenQuad']=[[.106,.166],[.843,.035],[.843,.468],[.106,.605]]
catalog['tv_open']['screenQuad']=[[.109,.153],[.838,.033],[.838,.457],[.109,.580]]
catalog['ladder']['supportPlanes']=[[[.25,.23],[.56,.26],[.55,.29],[.24,.26]],[[.17,.49],[.49,.52],[.47,.56],[.16,.52]],[[.08,.72],[.39,.77],[.37,.80],[.07,.75]]]
from feet_profiles import annotate as painted_feet
painted_feet(catalog,sheets,ROOT)
used={v['sheet'] for v in catalog.values()};sheets={k:v for k,v in sheets.items() if k in used}
(ROOT/'scenario/sprite-catalog.json').write_text(json.dumps({'sheets':sheets,'sprites':catalog},ensure_ascii=False,indent=2))
print('Catalog:',len(catalog),'sprites in',len(sheets),'sheets')
