/* Physical coordinate system shared by backgrounds, furniture, items and actors.
   1200 x 800; all sprites use their painted alpha bounds from sprite-catalog.json. */
const World = (() => {
 const W=1200,H=800;
 const slots={left:[235,590],middle:[570,620],shelf:[800,565],sofa:[720,615],table:[565,705],tableRight:[825,710],spare:[650,745],tableSurface:[565,595],sofaSeat:[720,655],wallSupport:[765,615],wallLow:[330,465],wall:[435,350],floorLeft:[340,735],leftFloor:[180,730],underWall:[260,640],door:[1090,590],npcHands:[950,435]};
 const names={boy:'息子',papa:'パパ',cat:'猫',mama:'ママ',sister:'妹',grandma:'おばあちゃん',grandpa:'おじいちゃん',courier:'宅配員',postman:'郵便屋さん',repair:'修理屋さん',neighbor:'となりの子',crow:'カラス',dog:'犬',robot:'宅配ロボット',vacuum:'ロボット掃除機'};
 const ids=Object.fromEntries(Object.entries(names).map(([a,b])=>[b,a]));
 const baseHeight={boy:226,papa:315,mama:290,sister:194,grandma:270,grandpa:286,courier:310,postman:310,repair:310,neighbor:220,cat:66,dog:95,crow:62,robot:150,vacuum:38};
 const human=new Set(['boy','papa','mama','sister','grandma','grandpa','courier','postman','repair','neighbor']);
 function geometry(asset){const meta=CATALOG[asset];if(!meta)throw Error('Missing sprite '+asset);return asset==='boxes'?{h:100,w:380}:{h:meta.worldHeight,w:meta.worldHeight*meta.rect[2]/meta.rect[3]};}
 function sprite(asset,extra=''){
  const m=CATALOG[asset];if(!m)throw Error('Missing sprite '+asset);
  const [x,y,w,h]=m.rect,[iw,ih]=m.size;
  return `<span class="sprite sheet-${m.sheet} ${extra}" data-sprite="${asset}" style="background-size:${iw/w*100}% ${ih/h*100}%;background-position:${iw===w?0:x/(iw-w)*100}% ${ih===h?0:y/(ih-h)*100}%;aspect-ratio:${w}/${h}"></span>`;
 }
 function install(){if(document.getElementById('worldAssets'))return;const el=document.createElement('style');el.id='worldAssets';el.textContent=Object.entries(SHEETS).map(([id])=>`.sheet-${id}{background-image:url("${A[id]}")}`).join('');document.head.append(el);}
 function anchor(slot){return [...(slots[slot]||slots.middle)];}
 function init(board){
  install();state.board=board;state.room=board.room;state.entities={};state.actors={};state.knowledge={};state.audit=[];state.light=!board.dark;
  for(const def of board.entities){const [x,y]=def.position||anchor(def.slot);const g=geometry(def.asset);if(def.asset==='window'){g.w=400;g.h=220;}if(def.worldHeight){g.w*=def.worldHeight/g.h;g.h=def.worldHeight;}if(def.parts){g.w=def.groupWidth;g.h=def.groupHeight;}state.entities[def.id]={...def,room:def.room||board.room,x,y,...g,place:'room',visible:!(board.hidden||[]).includes(def.id),mode:'normal',opened:false};}
  for(const [id,mode] of Object.entries(board.initialModes||{}))if(state.entities[id])state.entities[id].mode=mode;
  for(const [id,clue] of Object.entries(board.initialClues||{}))state.knowledge[id]=clue;
  // Resolve parent rooms/anchors in dependency order, including nested containers.
  for(const e of Object.values(state.entities)){if(e.asset==='window'){e.x=450;e.y=390;}if(e.asset==='panel'&&e.slot==='left'){e.x=330;e.y=465;}}
  for(let pass=0;pass<5;pass++)for(const e of Object.values(state.entities))if(e.parent){
   const p=state.entities[e.parent];if(!p)throw Error(`Stage ${board.stage}: missing parent ${e.parent}`);
   e.room=p.room;e.x=p.x;e.y=p.y-p.h+e.h*.8;
   if(e.slot==='side'){e.x=p.x-p.w/2-35;e.y=p.y;}
   if(e.slot==='under'){e.y=p.y-6;e.x=p.x-p.w*.25;}
   if(e.slot==='top'){e.y=p.y-p.h-8;}
   if((e.slot==='behind'||e.slot==='inside')&&!e.exposed){e.y=p.y-p.h*.38;e.visible=false;}
  }
  for(const label of state.data.characters){const id=ids[label];if(!id)throw Error('Unknown actor '+label);const index=Object.keys(state.actors).length;
   state.actors[id]={id,label,room:board.actorRooms?.[id]||board.room,x:id==='boy'?430:id==='papa'?950:720+(index-2)*105,y:id==='boy'?745:id==='papa'?(board.room==='entrance'?610:650):690,pose:'idle',visible:!(board.hiddenActors||[]).includes(id),mode:'normal',elevation:0};
   state.actors[id].x=Math.min(1000,state.actors[id].x);
  }
  for(const [id,slot] of Object.entries(board.actorSlots||{})){const a=state.actors[id];if(a){[a.x,a.y]=anchor(slot);}}
  for(const [id,pose] of Object.entries(board.initialPoses||{}))if(state.actors[id]){state.actors[id].mode=pose;state.actors[id].pose=pose;}
  for(const [id,holder] of Object.entries(board.initialHolders||{}))if(state.entities[id])state.entities[id].holder=holder;
  if(state.actors.papa&&(board.steps.some(s=>['read','drink'].includes(s.change.papa))||['read','drink'].includes(board.initialPoses?.papa))){const a=state.actors.papa,g=geometry('chair');state.entities.papaChair={id:'papaChair',label:'パパの椅子',asset:'chair',x:a.x,y:a.y,...g,room:a.room,place:'room',visible:true,mode:'normal'};}
  resolveChildren();
  if(state.actors.crow){state.actors.crow.x=820;state.actors.crow.y=350;}
  if(state.actors.vacuum){state.actors.vacuum.x=780;state.actors.vacuum.y=715;}
  for(const a of Object.values(state.actors))if(['sit','sleep'].includes(a.mode)&&!Object.values(state.entities).some(e=>['chair','bench'].includes(e.asset)&&e.room===a.room&&Math.abs(e.x-a.x)<5&&Math.abs(e.y-a.y)<5)){const g=geometry('chair');state.entities[a.id+'Chair']={id:a.id+'Chair',label:'椅子',asset:'chair',x:a.x,y:a.y,...g,room:a.room,place:'room',visible:true,mode:'normal'};}
  for(const step of board.steps)for(const [id,slot] of Object.entries(step.move))if(['table','tableRight'].includes(slot)&&human.has(id)&&state.actors[id]){const g=geometry('chair'),[x,y]=anchor(slot);state.entities[id+'TableChair']={id:id+'TableChair',label:'食卓の椅子',asset:'chair',x,y,...g,room:step.room||state.actors[id].room,place:'room',visible:true,mode:'normal'};}
  for(const e of Object.values(state.entities))if(e.holder&&state.actors[e.holder]){if(e.id==='pudding')e.handSide='left';const a=state.actors[e.holder];e.room=a.room;e.place='hand';e.visible=true;e.x=a.x;e.y=a.y-actorHeight(a)*.45;}
  for(const e of [...Object.values(state.entities)])if(e.control){const g=geometry(e.control);const id=e.id+'__control';e.controlId=id;state.entities[id]={id,label:e.label+'の操作部',asset:e.control,controlOf:e.id,mount:e.contact||[.5,.5],parent:e.id,...g,x:e.x,y:e.y,room:e.room,visible:e.visible,place:'room',mode:'normal',contact:[.5,.5]};}
  state.entities.console={id:'console',label:'ゲーム機',asset:'console',w:48,h:28,place:'room',visible:false,concealed:true,container:board.console.container,holder:null,mode:'normal',birth:'stage-init',room:board.room};
  state.entities.door={id:'door',label:'部屋の出口',asset:null,x:1080,y:570,w:145,h:350,room:board.room,visible:true,place:'room',mode:'normal'};
  for(const [id,perch] of Object.entries(board.actorPerches||{}))if(state.actors[id])state.actors[id].perch=perch;
  sync();state.consoleIdentity=state.entities.console;
 }
 function actorAsset(a,pose=a.pose){const key=CATALOG[`${a.id}_${pose}`]?`${a.id}_${pose}`:`${a.id}_idle`,wear=SceneGeometry.footwear(a.room,a.y);return CATALOG[key+'_'+wear]?key+'_'+wear:key;}
 function actorHeight(a){const m=CATALOG[actorAsset(a)];return baseHeight[a.id]*SceneGeometry.scale(a.y)*(m.bodyScale||1);}
 function actorHTML(a){const h=actorHeight(a),asset=actorAsset(a),m=CATALOG[asset],w=h*m.rect[2]/m.rect[3];return `<button class="world-actor ${a.facing===-1?'facing-left':''}" data-actor="${a.id}" data-node="${a.id}" aria-label="${a.label}" style="left:${a.x/W*100}%;top:${(a.y-a.elevation)/H*100}%;height:${h/H*100}%;width:${w/W*100}%;z-index:${Math.round(a.y+30)}">${sprite(asset)}<span class="actor-name">${a.label}</span></button>`;}

 function visual(e){return e.opened&&e.asset!=='cushion'&&CATALOG[e.asset+'_open']?e.asset+'_open':e.mode==='empty'&&e.asset==='ice'?'plate':e.mode==='dry'&&e.asset==='note'?'note_dry':e.mode==='dug'&&CATALOG[e.asset+'_open']?e.asset+'_open':e.mode==='melted'&&CATALOG[e.asset+'_melted']?e.asset+'_melted':e.mode==='filled'&&CATALOG[e.asset+'_full']?e.asset+'_full':e.mode==='on'&&CATALOG[e.asset+'_on']?e.asset+'_on':e.mode==='filled'&&e.asset==='mug'?'coffee':e.asset;}
 function screenHTML(e){if(e.asset!=='tv'||e.mode!=='on')return '';const p=CATALOG[visual(e)].screenQuad||[[.12,.16],[.84,.02],[.84,.47],[.12,.61]];return `<svg class="tv-display" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><polygon data-tv-screen points="${p.map(([x,y])=>[x*1000,y*1000].join(',')).join(' ')}" fill="#3187b4"/></svg>`;}
 function depthZ(e){let r=e.id==='console'&&e.place==='room'?node(e.container):e,depth=e.id==='console'?4:0;while(r.parent&&state.entities[r.parent]&&depth<8){r=state.entities[r.parent];depth++;}if(r.place==='hand')return (state.actors[r.holder]?.y||700)+42+depth;return (state.actors[r.id]?r.y+35:r.y)+depth*5;}
 function isHere(e){let p=e;for(let i=0;p?.parent&&i<8;i++){p=node(p.parent);if(p&&(!p.visible||!['room','hand','transit'].includes(p.place)))return false;}return e.visible&&['room','hand','transit'].includes(e.place)&&(e.id==='door'||e.room===state.room);}
 function render(){
  const world=document.getElementById('world');if(!world)return;
  const bgRoom=state.room==='outside'?'garden':state.room==='hall'?'entrance':state.room==='laundry'?'bath':state.room;
  world.style.backgroundImage=`url("${A['room_'+bgRoom]}")`;world.classList.toggle('dark-room',!state.light);world.classList.toggle('rain-room',state.board.weather==='rain'&&state.room==='outside');
  sync();const objects=Object.values(state.entities).filter(isHere);
  world.innerHTML=`<div class="world-objects">${objects.map(e=>{
   const asset=visual(e),assetAnchor=CATALOG[asset]?.anchor||[.5,1];
   const z=depthZ(e);
   return `<button class="world-object ${e.id==='door'?'exit-target':''} ${e.opened?'opened':''} mode-${e.mode} asset-${e.asset} ${e.place==='hand'?'carried':''}" data-entity="${e.id}" data-node="${e.id}" aria-label="${esc(e.label)}" style="transform:translate(${-assetAnchor[0]*100}%,${-assetAnchor[1]*100}%);left:${e.x/W*100}%;top:${e.y/H*100}%;width:${e.w/W*100}%;height:${e.h/H*100}%;z-index:${Math.round(z)}">${asset&&e.asset!=='window'?e.asset==='boxes'||e.parts?'':sprite(asset):''}${state.assist&&state.knowledge[e.id]?`<span class="world-clue">${esc(state.knowledge[e.id])}</span>`:''}${screenHTML(e)}<span class="object-label">${esc(e.label)}</span>${e.mode==='filled'?'<span class="water-fx"></span>':''}</button>`;
  }).join('')}</div><div class="world-actors">${Object.values(state.actors).filter(a=>a.room===state.room&&a.visible).map(actorHTML).join('')}</div><div id="worldEffect" aria-hidden="true"></div>`;
  renderEffects();document.getElementById('roomName').textContent=roomName(state.room);
  world.querySelectorAll('[data-node]').forEach(b=>{
   b.onclick=null;
   b.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';};
   b.ondrop=null;
  });
  world.onclick=async event=>{const token=state.token,id=await pick(event.clientX,event.clientY);if(state?.token===token){if(id)InteractionManager.target(id);else{const r=world.getBoundingClientRect();InteractionManager.walk({x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H});}}};
  world.ondragover=event=>{event.preventDefault();const item=state.dragItem,e=state.entities[item];if(!e||e.asset!=='stool')return;const r=world.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*W,y=(event.clientY-r.top)/r.height*H,k=SceneGeometry.scale(y);let ghost=world.querySelector('#placementPreview');if(!ghost){ghost=document.createElement('div');ghost.id='placementPreview';ghost.innerHTML=sprite(e.asset);world.append(ghost);}Object.assign(ghost.style,{left:x/W*100+'%',top:y/H*100+'%',width:e.baseW*k/W*100+'%',height:e.baseH*k/H*100+'%'});};world.ondragleave=e=>{if(!world.contains(e.relatedTarget))world.querySelector('#placementPreview')?.remove();};world.ondrop=async event=>{event.preventDefault();world.querySelector('#placementPreview')?.remove();const token=state.token,item=event.dataTransfer.getData('text/plain'),id=await pick(event.clientX,event.clientY);if(state?.token===token&&state.inventory.includes(item)){state.selected=item;renderInventory();const r=world.getBoundingClientRect(),p={x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H};if(state.board.steps.some((s,i)=>InteractionManager.ready(i)&&s.dropZone&&s.use.includes(item)))InteractionManager.floor(p,item);else if(id)InteractionManager.target(id,{item});}};
 }
 function node(id){return state.entities[id]||state.actors[id];}
 function parentTarget(id){const e=state.entities[id];if(e?.place==='bag')return 'boy';return e&&!e.visible&&e.parent?parentTarget(e.parent):id;}
 function actionTarget(step){if(step.kind==='collect'&&state.entities.console.visible)return 'console';if(step.room&&['travel','carry','event','chase'].includes(step.kind))return 'door';const e=state.entities[step.target];return e?.asset==='boxes'?'boxes__blue':e?.parts&&e.place==='room'?e.parts[0]:parentTarget(step.target);}
 function resolveChildren(){for(let pass=0;pass<5;pass++)for(const e of Object.values(state.entities))if(e.parent&&e.place==='room'&&!e.detached){const p=state.entities[e.parent];e.room=p.room;e.x=p.x;e.y=p.y-p.h*.4;if(e.slot==='top')e.y=p.y-p.h+2;if(e.slot==='standing'){e.y=p.y-20;}if(e.slot==='surface'){e.y=p.asset==='window'?p.y-10:p.y-p.h+e.h*.8;const siblings=Object.values(state.entities).filter(other=>other.parent===e.parent&&other.slot==='surface');e.x=p.x+(siblings.indexOf(e)-(siblings.length-1)/2)*Math.min(105,(p.w-20)/siblings.length);}if(e.slot==='under')e.y=p.y-6;if(e.slot==='side'){e.x=p.x-p.w/2-35;e.y=p.y;}if(e.mount){const f=frame(p);e.x=f.left+f.w*e.mount[0];e.y=f.top+f.h*e.mount[1]+e.h/2;}}}
 function roomName(room){return {living:'リビング',hall:'廊下',entrance:'玄関',outside:'玄関の外',bath:'お風呂場',laundry:'洗面・洗濯室',garden:'庭',child:'子ども部屋',kitchen:'キッチン・ダイニング'}[room]||room;}
 function pose(id,pose){const a=state.actors[id];if(!a)return;a.pose=pose;const el=document.querySelector(`[data-actor="${id}"] .sprite`);if(el){el.outerHTML=sprite(actorAsset(a));const box=document.querySelector(`[data-actor="${id}"]`),m=CATALOG[actorAsset(a)],h=actorHeight(a);box.style.height=h/H*100+'%';box.style.width=h*m.rect[2]/m.rect[3]/W*100+'%';}}
 function frame(e){
  if(!e)throw Error('Missing physical frame');
  const actor=state.actors[e.id];
  if(actor){const h=actorHeight(actor),m=CATALOG[actorAsset(actor)],w=h*m.rect[2]/m.rect[3];return {left:actor.x-w/2,top:actor.y-actor.elevation-h,w,h,bottom:actor.y-actor.elevation};}
  const uv=CATALOG[visual(e)]?.anchor||[.5,1];return {left:e.x-e.w*uv[0],top:e.y-e.h*uv[1],w:e.w,h:e.h,bottom:e.y};
 }
 function hand(id,side){const a=state.actors[id],f=frame(a),m=CATALOG[actorAsset(a)],uv=side==='left'?(a.id==='sister'&&a.pose==='eat'?[.62,.55]:a.id==='boy'&&a.pose==='hold'?[.70,.53]:a.id==='boy'&&a.pose==='read'?[.11,.46]:[.12,.60]):m.hand||state.board.handAnchors[a.pose]||[.8,.5];const u=a.facing===-1?1-uv[0]:uv[0];return {x:f.left+f.w*u,y:f.top+f.h*uv[1]};}
 function point(id,kind='touch'){
  const e=node(id);if(!e)throw Error('No contact entity '+id);
  if(state.actors[id])return hand(id);
  if(e.place==='bag')return hand('boy');
  if(kind==='touch'&&e.controlId&&state.entities[e.controlId]?.visible)return point(e.controlId,'item');
  const f=frame(e),uv=kind==='grip'?(e.grip||CATALOG[e.asset].grip||[.5,.5]):kind==='item'?[.5,.5]:e.contact||[.5,.5];return {x:f.left+f.w*uv[0],y:f.top+f.h*uv[1]};
 }
 function tip(e){const f=frame(e),m=CATALOG[e.asset],grip=e.grip||m.grip||[.5,.5],uv=m.tip||[.5,.1],r=(e.angle||0)*Math.PI/180,dx=f.w*(uv[0]-grip[0]),dy=f.h*(uv[1]-grip[1]);return {x:f.left+f.w*grip[0]+dx*Math.cos(r)-dy*Math.sin(r),y:f.top+f.h*grip[1]+dx*Math.sin(r)+dy*Math.cos(r)};}
 function region(){const c=state.board.console,p=node(c.container),f=frame(p),r=c.region;return c.fixed&&state.consoleRegion?state.consoleRegion:{left:f.left+f.w*r[0],top:f.top+f.h*r[1],w:f.w*r[2],h:f.h*r[3]};}
 function sync(){
  SceneGeometry.sizeObjects();resolveChildren();for(const a of Object.values(state.actors))if(a.perch){const p=node(a.perch.parent),f=frame(p),uv=a.perch.mount;a.x=f.left+f.w*uv[0];a.y=SceneGeometry.floorOf(p);a.elevation=a.y-(f.top+f.h*uv[1]);}
  for(const e of Object.values(state.entities)){
   if(e.place==='hand'&&e.holder){const a=state.actors[e.holder];if(a){if(e.toolOwner){const tool=state.entities[e.toolOwner],f=frame(tool),uv=CATALOG[tool.asset].tip||[.3,.1];e.x=f.left+f.w*uv[0];e.y=f.top+f.h*uv[1]+e.h/2;}else{const h=hand(a.id,e.handSide),grip=e.grip||CATALOG[e.asset].grip||[.5,.5];e.x=h.x+e.w*(.5-grip[0]);e.y=h.y+e.h*(1-grip[1]);}e.room=a.room;e.visible=a.visible;}}
   if(e.controlOf){const p=node(e.controlOf),f=frame(p),uv=e.mount;e.x=f.left+f.w*uv[0];e.y=f.top+f.h*uv[1]+e.h/2;e.room=p.room;e.visible=p.visible&&p.place==='room';}
  }
  resolveChildren();const c=state.entities.console,config=state.board.console;
  if(c&&c.place==='room'){
   const p=node(config.container),f=frame(p);c.room=p.room;
   const r=region();if(!state.consoleRegion)state.consoleRegion={...r};
   const k=SceneGeometry.scale(SceneGeometry.floorOf(c));c.h=Math.min(28*k,r.h*.8);c.w=Math.min(c.h*CATALOG.console.rect[2]/CATALOG.console.rect[3],r.w*.8);c.baseH=c.h/k;c.baseW=c.w/k;
   if(!config.fixed||!Number.isFinite(c.x)){c.x=f.left+f.w*config.uv[0];c.y=f.top+f.h*config.uv[1]+c.h/2;}
  }
 }
 function reveal(){
  const cfg=state.board.console,c=state.entities.console,p=node(cfg.container),cover=cfg.cover&&node(cfg.cover);
  const canReveal=cfg.reveal==='cover'?!!cover?.lifted:cfg.reveal==='moved'?!!p.exposed:cfg.reveal==='inspected'?!!(p.inspected||p.exposed||p.opened):!!(p.opened||p.mode==='open');
  if(c.place==='room'&&canReveal){sync();c.concealed=false;c.visible=true;c.revealedFrom=cfg.container;}
  return c.visible;
 }
 function attach(id,holder){const e=state.entities[id];if(!e)throw Error('Missing physical prop '+id);e.place='hand';e.parent=null;e.detached=true;e.toolOwner=null;e.holder=holder;e.visible=true;state.inventory=state.inventory.filter(x=>x!==id);sync();}
 function refresh(){
  sync();const world=document.getElementById('world');if(!world)return;
  for(const e of Object.values(state.entities)){
   const el=world.querySelector(`[data-entity="${e.id}"]`);
   if(isHere(e)!==!!el){render();return;}
   if(!el)continue;el.style.left=e.x/W*100+'%';el.style.top=e.y/H*100+'%';el.style.width=e.w/W*100+'%';el.style.height=e.h/H*100+'%';el.style.zIndex=Math.round(depthZ(e));el.classList.toggle('carried',e.place==='hand');
   const an=CATALOG[visual(e)]?.anchor||[.5,1];el.style.transform=`translate(${-an[0]*100}%,${-an[1]*100}%)`;const im=el.querySelector('.sprite');if(im&&im.dataset.sprite!==visual(e))im.outerHTML=sprite(visual(e));
   const draw=el.querySelector('.sprite');if(draw&&e.angle!==undefined){const grip=e.grip||CATALOG[e.asset].grip||[.5,.5];draw.style.transformOrigin=`${grip[0]*100}% ${grip[1]*100}%`;draw.style.transform=`rotate(${e.angle}deg)`;}
   el.querySelector('.tv-display')?.remove();if(e.asset==='tv'&&e.mode==='on')el.insertAdjacentHTML('beforeend',screenHTML(e));el.classList.toggle('opened',!!e.opened);el.classList.toggle('lifted',!!e.lifted);
  }
  for(const a of Object.values(state.actors)){const el=world.querySelector(`[data-actor="${a.id}"]`);if(!el)continue;const f=frame(a);el.style.left=a.x/W*100+'%';el.style.top=(a.y-a.elevation)/H*100+'%';el.style.width=f.w/W*100+'%';el.style.height=f.h/H*100+'%';el.classList.toggle('facing-left',a.facing===-1);el.style.zIndex=Math.round(a.y+30);}
  renderEffects();
 }

 const alphaCache=new Map();
 function alphaFor(sheet){if(!alphaCache.has(sheet))alphaCache.set(sheet,(async()=>{const img=new Image();img.src=A[sheet];await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);return {data:ctx.getImageData(0,0,canvas.width,canvas.height).data,w:canvas.width,h:canvas.height};})());return alphaCache.get(sheet);}
 async function pick(clientX,clientY){
  const candidates=document.elementsFromPoint(clientX,clientY).filter(e=>e.matches('#world [data-node]'));
  for(const el of candidates){const id=el.dataset.node,e=node(id);if(!e)continue;
   if(id==='door'||e.asset==='window')return id;
   const spriteEl=el.querySelector(':scope > .sprite');if(!spriteEl)continue;
   const key=spriteEl.dataset.sprite,m=CATALOG[key],bounds=el.getBoundingClientRect();
   let u=(clientX-bounds.x)/bounds.width,v=(clientY-bounds.y)/bounds.height;
   if(state.actors[id]?.facing===-1)u=1-u;
   if(u<0||u>=1||v<0||v>=1)continue;
   const alpha=await alphaFor(m.sheet),x=Math.floor(m.rect[0]+u*m.rect[2]),y=Math.floor(m.rect[1]+v*m.rect[3]);
   if(alpha.data[(y*alpha.w+x)*4+3]>100)return id;
  }
  return null;
 }

 function renderEffects(){const world=document.getElementById('world');if(!world)return;world.querySelector('#contactFX')?.remove();if(!state.beam&&!debug)return;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='contactFX';svg.classList.add('contact-line');svg.setAttribute('viewBox','0 0 1200 800');let html='';if(state.beam){const b=state.beam,tool=node(b.tool),f=tool&&frame(tool),tip=tool&&(CATALOG[tool.asset].tip||[.5,.1]),h=f?World.tip(tool):hand(b.actor),tf=frame(node(b.target)),t=b.uv?{x:tf.left+tf.w*b.uv[0],y:tf.top+tf.h*b.uv[1]}:point(b.target,'item');html+=`<path d="M ${h.x} ${h.y} L ${t.x} ${t.y}" stroke="${b.kind==='rope'?'#9d7849':b.kind==='infrared'?'#ff7979':b.kind==='coffee'?'#6c3820':b.kind==='water'?'#55bae3':'#fff3a5'}" stroke-width="${b.kind==='rope'?4:b.kind==='infrared'?2:['coffee','water'].includes(b.kind)?4:10}" opacity=".8"/>`;}if(debug&&state.contactProbe){const {hand:h,point:p}=state.contactProbe;html+=`<circle cx="${h.x}" cy="${h.y}" r="5" fill="#ff5353"/><circle cx="${p.x}" cy="${p.y}" r="9" stroke="#14b886" fill="none"/>`;}svg.innerHTML=html;world.append(svg);}
 function snapshot(){return JSON.parse(JSON.stringify({room:state.room,entities:state.entities,actors:state.actors,inventory:state.inventory,step:state.step,status:state.status,busy:state.busy,audit:state.audit.map(({before,...a})=>a),knowledge:state.knowledge}));}
 return {tip,pick,frame,hand,point,sync,refresh,reveal,attach,region,visual,resolveChildren,install,W,H,names,ids,human,baseHeight,slots,init,render,node,isHere,sprite,actorAsset,actorHeight,actorHTML,pose,geometry,anchor,parentTarget,actionTarget,roomName,snapshot};
})();

const PuzzleRuleEngine=(()=>{
 function required(step){return step.use.filter(id=>{
  const e=state.entities[id];return e&&e.place!=='bag'&&!['stool','chair','ladder','scale'].includes(e.asset);
 });}
 function apply(step){
  const target=World.node(step.target);
  if(step.gain){const e=state.entities[step.gain];if(!e||e.place!=='hand'||e.holder!=='boy')throw Error('Acquisition without physical hand contact '+step.gain);e.place='bag';e.visible=false;e.holder=null;if(!state.inventory.includes(e.id))state.inventory.push(e.id);state.selected=null;}
  if(step.kind==='combine')for(const id of step.use.slice(1)){const e=state.entities[id];e.place='installed';e.visible=false;state.inventory=state.inventory.filter(i=>i!==id);}
  if(step.clue)state.knowledge[step.gain||step.target]=step.clue;
  if(['open','collect','code','lift'].includes(step.kind)&&target)target.opened=true;
  if(['inspect','read','talk','wait'].includes(step.kind)&&target){state.knowledge[step.target]=step.clue||'確認した';}
  for(const [id,parent] of Object.entries(step.reparent||{})){const e=state.entities[id];if(e){e.parent=parent;e.slot='inside';}}
  for(const id of step.reveal){const e=World.node(id);if(e)e.visible=true;}
  for(const [id,mode] of Object.entries(step.change)){if(id==='world'){state.light=true;continue;}const e=World.node(id);if(e)e.mode=mode;}
  if(state.actors.papa){if(step.change.papa==='read')state.actors.papa.pose='read';else if(step.change.papa==='drink')state.actors.papa.pose='drink';}
  state.found=state.entities.console.place==='hand'&&state.entities.console.holder==='boy';
  World.resolveChildren();World.reveal();


  if(!state.inventory.includes(state.selected))state.selected=state.inventory.at(-1)||null;
 }
 return {required,apply};
})();

const InteractionManager=(()=>{
 function ready(index){const s=state.board.steps[index];return !state.done.includes(index)&&(s.requires||[]).every(i=>state.done.includes(i))&&PuzzleRuleEngine.required(s).length===0;}
 function matches(s,id){return id===World.actionTarget(s)||id===s.target||World.node(id)?.controlOf===s.target||World.node(id)?.parent===s.target||World.node(id)?.holder===s.target;}
 function target(id,options={}){if(!state||state.busy||state.status!=='PLAYING')return;const item=options.item??state.selected;if(options.bag&&item===id){setCaption('別の道具と組み合わせてみよう。');return;}
  const candidates=state.board.steps.map((s,i)=>({s,i})).filter(({s,i})=>ready(i)&&(matches(s,id)||options.bag&&['combine','dry'].includes(s.kind)&&s.use.includes(id)));
  const selected=candidates.find(({s})=>item?(s.inputItems||s.use).includes(item)&&(!s.inputTarget||options.bag)&&(!options.bag||s.kind==='combine'||s.kind==='dry'):!s.use.some(k=>state.inventory.includes(k)));
  if(selected){const {s,i}=selected;
   if(s.dropZone&&!options.assist){setCaption('踏み台は壁ではなく、足元の床へドラッグして置こう。');return;}
   if(state.board.puzzle?.mode==='boxColor'&&i===state.board.puzzle.step&&id.startsWith('boxes__')&&id!==state.board.console.container)return triggerFail(state.data.fail[0],id);
   if(item)state.selected=item;return handleAction('correct',s.text,i);
  }
  const e=World.node(id);if(item){setCaption('ここではその道具は使えそうにない。別の場所や、BAGの道具と組み合わせてみよう。');return;}
  if(e)setCaption(`${e.label}を調べた。${state.knowledge[id]&&state.knowledge[id]!=='確認した'?state.knowledge[id]:'形や周りの物もよく見てみよう。'}`);
 }
 function floor(point,item){if(!state||state.busy||state.status!=='PLAYING')return;
  const index=state.board.steps.findIndex((s,i)=>ready(i)&&s.dropZone&&s.use.includes(item));if(index<0){setCaption('ここに置いても役に立ちそうにない。');return;}
  const step=state.board.steps[index],z=step.dropZone,ok=((point.x-z.center[0])/z.radius[0])**2+((point.y-z.center[1])/z.radius[1])**2<=1;
  if(!ok||!SceneGeometry.walkable(point)){setCaption('そこでは足元が安定しない。届かせたい場所の下の床を選ぼう。');return;}
  const support=state.entities[item],a=state.actors.boy,saved={...support},old=a.support;
  try{support.x=point.x;support.y=point.y;support.place='room';support.holder=null;support.parent=null;support.detached=true;a.support=item;World.sync();const high=state.board.steps.slice(index+1).find(s=>s.kind==='pickup'||s.kind==='climb'&&s.gain);const t=high&&World.node(high.target);if(t)AnimationController.plan('boy',World.point(t.id),t);}
  catch{setCaption('ここからは届かない。踏み台を少し横か奥へずらしてみよう。');return;}
  finally{Object.assign(support,saved);a.support=old;World.sync();}
  state.selected=item;return handleAction('correct',step.text,index,{dropPoint:[point.x,point.y]});
 }
 async function walk(p){if(!state||state.busy||state.status!=='PLAYING'||!SceneGeometry.walkable(p))return;const a=state.actors.boy,token=state.token,record={frames:[]};state.busy=true;state.selected=null;renderInventory();if(a.support){const old=a.elevation;a.support=null;if(!await AnimationController.tween(300,token,t=>a.elevation=old*(1-t)))return;}if(!await AnimationController.move('boy',p.x,p.y,token,record))return;World.pose('boy','idle');state.busy=false;World.refresh();}
 return {target,ready,floor,walk};
})();
