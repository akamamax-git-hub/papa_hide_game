/* Physical coordinate system shared by backgrounds, furniture, items and actors.
   1200 x 800; all sprites use their painted alpha bounds from sprite-catalog.json. */
const World = (() => {
 const W=1200,H=800;
 const slots={left:[235,590],middle:[570,620],shelf:[800,565],sofa:[720,615],table:[565,705],tableRight:[825,710],spare:[650,745],tableSurface:[565,595],wallLow:[330,465],wall:[245,210],floorLeft:[340,735],leftFloor:[180,730],underWall:[260,640],door:[1090,590],npcHands:[950,435]};
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
  for(const def of board.entities){const [x,y]=anchor(def.slot);const g=geometry(def.asset);if(def.asset==='window'){g.w=400;g.h=220;}state.entities[def.id]={...def,room:def.room||board.room,x,y,...g,place:'room',visible:!(board.hidden||[]).includes(def.id),mode:'normal',opened:false};}
  for(const [id,mode] of Object.entries(board.initialModes||{}))if(state.entities[id])state.entities[id].mode=mode;
  for(const [id,clue] of Object.entries(board.initialClues||{}))state.knowledge[id]=clue;
  // Resolve parent rooms/anchors in dependency order, including nested containers.
  for(const e of Object.values(state.entities)){if(e.asset==='window'){e.x=450;e.y=350;}if(e.asset==='panel'&&e.slot==='left'){e.x=330;e.y=465;}}
  for(let pass=0;pass<5;pass++)for(const e of Object.values(state.entities))if(e.parent){
   const p=state.entities[e.parent];if(!p)throw Error(`Stage ${board.stage}: missing parent ${e.parent}`);
   e.room=p.room;e.x=p.x;e.y=p.y-p.h+e.h*.8;
   if(e.slot==='side'){e.x=p.x-p.w/2-35;e.y=p.y;}
   if(e.slot==='under'){e.y=p.y-6;e.x=p.x-p.w*.25;}
   if(e.slot==='top'){e.y=p.y-p.h-8;}
   if(e.slot==='behind'||e.slot==='inside'){e.y=p.y-p.h*.38;e.visible=false;}
  }
  for(const label of state.data.characters){const id=ids[label];if(!id)throw Error('Unknown actor '+label);const index=Object.keys(state.actors).length;
   state.actors[id]={id,label,room:board.actorRooms?.[id]||board.room,x:id==='boy'?430:id==='papa'?950:720+(index-2)*105,y:id==='boy'?745:id==='papa'?650:690,pose:'idle',visible:!(board.hiddenActors||[]).includes(id),mode:'normal',elevation:0};
   state.actors[id].x=Math.min(1000,state.actors[id].x);
  }
  for(const [id,slot] of Object.entries(board.actorSlots||{})){const a=state.actors[id];if(a){[a.x,a.y]=anchor(slot);}}
  for(const [id,pose] of Object.entries(board.initialPoses||{}))if(state.actors[id]){state.actors[id].mode=pose;state.actors[id].pose=pose;}
  for(const [id,holder] of Object.entries(board.initialHolders||{}))if(state.entities[id])state.entities[id].holder=holder;
  if(state.actors.papa&&board.steps.some(s=>['read','drink'].includes(s.change.papa))){const a=state.actors.papa,g=geometry('chair');state.entities.papaChair={id:'papaChair',label:'パパの椅子',asset:'chair',x:a.x,y:a.y,...g,room:a.room,place:'room',visible:true,mode:'normal'};}
  resolveChildren();
  if(state.actors.crow){state.actors.crow.x=820;state.actors.crow.y=350;}
  if(state.actors.vacuum){state.actors.vacuum.x=780;state.actors.vacuum.y=715;}
  for(const a of Object.values(state.actors))if(['sit','sleep'].includes(a.mode)&&!Object.values(state.entities).some(e=>['chair','bench'].includes(e.asset)&&e.room===a.room&&Math.abs(e.x-a.x)<5&&Math.abs(e.y-a.y)<5)){const g=geometry('chair');state.entities[a.id+'Chair']={id:a.id+'Chair',label:'椅子',asset:'chair',x:a.x,y:a.y,...g,room:a.room,place:'room',visible:true,mode:'normal'};}
  for(const step of board.steps)for(const [id,slot] of Object.entries(step.move))if(['table','tableRight'].includes(slot)&&human.has(id)&&state.actors[id]){const g=geometry('chair'),[x,y]=anchor(slot);state.entities[id+'TableChair']={id:id+'TableChair',label:'食卓の椅子',asset:'chair',x,y,...g,room:step.room||state.actors[id].room,place:'room',visible:true,mode:'normal'};}
  for(const e of Object.values(state.entities))if(e.holder&&state.actors[e.holder]){const a=state.actors[e.holder];e.room=a.room;e.x=a.x;e.y=a.y-actorHeight(a)*.45;}
  state.entities.door={id:'door',label:'部屋の出口',asset:null,x:1080,y:570,w:145,h:350,room:board.room,visible:true,place:'room',mode:'normal'};
 }
 function actorAsset(a,pose=a.pose){const key=`${a.id}_${pose}`;return CATALOG[key]?key:`${a.id}_idle`;}
 function actorHeight(a){const ratio=a.id==='boy'?({pickup:.65,push:.85,high:1.14,dig:.68,open:.72,climb:1.03}[a.pose]||1):(['sit','sleep','eat'].includes(a.pose)||(a.id==='papa'&&['read','drink'].includes(a.pose)))?.7:1;return baseHeight[a.id]*(.84+(a.y-500)/600)*ratio;}
 function actorHTML(a){const h=actorHeight(a),asset=actorAsset(a),m=CATALOG[asset],w=h*m.rect[2]/m.rect[3];return `<button class="world-actor" data-actor="${a.id}" data-node="${a.id}" aria-label="${a.label}" style="left:${a.x/W*100}%;top:${(a.y-a.elevation)/H*100}%;height:${h/H*100}%;width:${w/W*100}%;z-index:${Math.round(a.y+30)}">${sprite(asset)}${Object.values(state.entities).filter(e=>e.holder===a.id&&e.place==='room'&&!['sit','eat'].includes(a.pose)&&!(a.id==='papa'&&['read','drink'].includes(a.pose))).map(e=>`<span class="held-item">${sprite(visual(e))}</span>`).join('')}<span class="actor-name">${a.label}</span></button>`;}
 function visual(e){return e.opened&&CATALOG[e.asset+'_open']?e.asset+'_open':e.mode==='empty'&&e.asset==='ice'?'plate':e.mode==='dry'&&e.asset==='note'?'note_dry':e.mode==='dug'&&CATALOG[e.asset+'_open']?e.asset+'_open':e.mode==='melted'&&CATALOG[e.asset+'_melted']?e.asset+'_melted':e.mode==='filled'&&CATALOG[e.asset+'_full']?e.asset+'_full':e.mode==='on'&&CATALOG[e.asset+'_on']?e.asset+'_on':e.mode==='filled'&&e.asset==='mug'?'coffee':e.asset;}
 function isHere(e){return e.visible&&!e.holder&&e.place==='room'&&(e.id==='door'||e.room===state.room);}
 function render(){
  const world=document.getElementById('world');if(!world)return;
  const bgRoom=state.room==='outside'?'garden':state.room==='hall'?'entrance':state.room==='laundry'?'bath':state.room;
  world.style.backgroundImage=`url("${A['room_'+bgRoom]}")`;world.classList.toggle('dark-room',!state.light);world.classList.toggle('rain-room',state.board.weather==='rain'&&state.room==='outside');
  const objects=Object.values(state.entities).filter(isHere);
  world.innerHTML=`<div class="world-objects">${objects.map(e=>{
   const asset=visual(e);
   let root=e,depth=0;while(root.parent&&state.entities[root.parent]&&depth<6){root=state.entities[root.parent];depth++;}const z=root.y+depth*5;
   return `<button class="world-object ${e.id==='door'?'exit-target':''} ${e.opened?'opened':''} mode-${e.mode} asset-${e.asset}" data-entity="${e.id}" data-node="${e.id}" aria-label="${esc(e.label)}" style="left:${e.x/W*100}%;top:${e.y/H*100}%;width:${e.w/W*100}%;height:${e.h/H*100}%;z-index:${Math.round(z)}">${asset&&e.asset!=='window'?e.asset==='boxes'?['red','blue','green'].map(color=>`<span class="box-part" data-color="${color}">${sprite(e.opened&&color==='blue'?'parcel_open':'box_'+color)}</span>`).join(''):sprite(asset):''}${state.knowledge[e.id]?`<span class="world-clue">${esc(state.knowledge[e.id])}</span>`:''}<span class="object-label">${esc(e.label)}</span>${e.mode==='filled'?'<span class="water-fx"></span>':''}</button>`;
  }).join('')}</div><div class="world-actors">${Object.values(state.actors).filter(a=>a.room===state.room&&a.visible).map(actorHTML).join('')}</div><div id="worldEffect" aria-hidden="true"></div>`;
  document.getElementById('roomName').textContent=roomName(state.room);
  world.querySelectorAll('[data-node]').forEach(b=>{
   b.onclick=()=>InteractionManager.target(b.dataset.node);
   b.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';};
   b.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(state.inventory.includes(id)){state.selected=id;renderInventory();InteractionManager.target(b.dataset.node);}};
  });
 }
 function node(id){return state.entities[id]||state.actors[id];}
 function parentTarget(id){const e=state.entities[id];if(e?.place==='bag')return 'boy';return e&&!e.visible&&e.parent?parentTarget(e.parent):id;}
 function actionTarget(step){if(step.room&&['travel','carry','event','chase'].includes(step.kind))return 'door';return parentTarget(step.target);}
 function resolveChildren(){for(let pass=0;pass<5;pass++)for(const e of Object.values(state.entities))if(e.parent&&e.place==='room'){const p=state.entities[e.parent];e.room=p.room;e.x=p.x;e.y=p.y-p.h*.4;if(e.slot==='top')e.y=p.y-p.h-8;if(e.slot==='surface'){e.y=p.asset==='window'?p.y-10:p.y-p.h+e.h*.8;const siblings=Object.values(state.entities).filter(other=>other.parent===e.parent&&other.slot==='surface');e.x=p.x+(siblings.indexOf(e)-(siblings.length-1)/2)*Math.min(105,(p.w-20)/siblings.length);}if(e.slot==='under')e.y=p.y-6;if(e.slot==='side'){e.x=p.x-p.w/2-35;e.y=p.y;}}}
 function roomName(room){return {living:'リビング',hall:'廊下',entrance:'玄関',outside:'玄関の外',bath:'お風呂場',laundry:'洗面・洗濯室',garden:'庭',child:'子ども部屋',kitchen:'キッチン・ダイニング'}[room]||room;}
 function pose(id,pose){const a=state.actors[id];if(!a)return;a.pose=pose;const el=document.querySelector(`[data-actor="${id}"] .sprite`);if(el){el.outerHTML=sprite(actorAsset(a));const box=document.querySelector(`[data-actor="${id}"]`),m=CATALOG[actorAsset(a)],h=actorHeight(a);box.style.height=h/H*100+'%';box.style.width=h*m.rect[2]/m.rect[3]/W*100+'%';}}
 function snapshot(){return JSON.parse(JSON.stringify({room:state.room,entities:state.entities,actors:state.actors,inventory:state.inventory,step:state.step,status:state.status,busy:state.busy,audit:state.audit.map(({before,...a})=>a),knowledge:state.knowledge}));}
 return {visual,resolveChildren,install,W,H,names,ids,human,baseHeight,slots,init,render,node,isHere,sprite,actorAsset,actorHeight,actorHTML,pose,geometry,anchor,parentTarget,actionTarget,roomName,snapshot};
})();

const AnimationController = (()=>{
 const delay=(ms,token)=>new Promise(resolve=>setTimeout(()=>resolve(state?.token===token),ms));
 const actionPose={pickup:'pickup',receive:'offer',give:'offer',use:'reach',open:'open',collect:'open',inspect:'read',read:'read',code:'reach',combine:'reach',place:'carry',push:'push',pull:'push',climb:'climb',pour:'pour',fill:'pour',dry:'light',wipe:'reach',dig:'dig',throw:'offer',light:'light',assemble:'reach',order:'reach',weigh:'carry',talk:'offer',wait:'read',event:'read',walk:'walk1',travel:'walk1',carry:'carry',chase:'walk1',lift:'pickup'};
 async function move(id,x,y,token,record){
  const a=state.actors[id];if(!a)return true;
  const el=document.querySelector(`[data-actor="${id}"]`);if(!el)return true;
  el.classList.toggle('facing-left',x<a.x);const from={x:a.x,y:a.y};const w=World.W,h=World.H;
  // Walk along the clear strip in front of furniture, then approach the target.
  const path=[from,{x:from.x,y:750},{x,y:750},{x,y}];record.path=path;
  const frames=path.map(p=>({left:p.x/w*100+'%',top:(p.y-a.elevation)/h*100+'%'}));
  const animation=el.animate(frames,{duration:600,easing:'ease-in-out',fill:'forwards'});
  for(let i=0;i<4;i++){World.pose(id,i%2?'walk2':'walk1');record.frames.push(World.actorAsset(a));if(!await delay(150,token)){animation.cancel();return false;}}
  a.x=x;a.y=y;animation.cancel();el.style.left=x/w*100+'%';el.style.top=(y-a.elevation)/h*100+'%';return true;
 }
 async function act(step,record,token){
  let target=World.node(step.target),a=state.actors[step.actor];if(target?.place==='bag')target=a;
  if(step.room&&['travel','carry','event','chase'].includes(step.kind))target=state.entities.door;
  if(!a)throw Error('Missing action actor '+step.actor);
  if(a.room!==state.room){a.room=state.room;a.x=1010;a.y=620;World.render();}
  // Reveal a hidden item by opening its actual container before acquisition.
  if(target?.parent&&!target.visible&&['inside','behind'].includes(target.slot)){const parent=state.entities[target.parent];if(parent){parent.opened=true;target.visible=true;World.render();}}
  const ground=target?.parent?state.entities[target.parent]:target;
  const actorTarget=target&&state.actors[target.id];const actorGap=actorTarget?(World.actorHeight(actorTarget)*(CATALOG[World.actorAsset(actorTarget)].rect[2]/CATALOG[World.actorAsset(actorTarget)].rect[3])/2+World.actorHeight(a)*.22+30):0;
  const x=Math.max(100,Math.min(980,actorTarget?target.x+(target.x>750?-1:1)*actorGap:(ground?.x||600)+((ground?.w||80)/2)+60));
  const y=Math.max(620,Math.min(745,(ground?.y||650)+60));
  record.phases.push('approach');if(!await move(step.actor,x,y,token,record))return false;
  record.phases.push('anticipation');World.pose(step.actor,'reach');if(!await delay(130,token))return false;
  record.phases.push('action');const pose=target?.compartment==='top'?'high':actionPose[step.kind];World.pose(step.actor,pose);record.frames.push(World.actorAsset(a));
  const el=document.querySelector(`[data-actor="${step.actor}"]`);
  const held=step.use[0]||step.gain;
  if(step.kind==='pour'&&target?.asset==='pot')el?.insertAdjacentHTML('beforeend',`<span class="held-item pour-source">${World.sprite('pot')}</span>`);
  if(held&&state.entities[held])el?.insertAdjacentHTML('beforeend',`<span class="held-item">${World.sprite(World.visual(state.entities[held]))}</span>`);
  if(step.kind==='climb'){a.elevation=Math.min(250,Math.max(90,a.y-((target?.y||600)+World.actorHeight(a)*.85)));el?.animate([{transform:'translate(-50%,-100%)'},{transform:`translate(-50%,calc(-100% - ${a.elevation}px))`}],{duration:450,fill:'forwards'});}
  if(['open','collect','lift','push','pull','dig','wipe','order','assemble'].includes(step.kind)){
   const item=document.querySelector(`[data-entity="${target?.id}"]`);item?.animate([{filter:'brightness(1)'},{filter:'brightness(1.2)',transform:'translate(-50%,calc(-100% - 8px))'},{filter:'brightness(1)'}],{duration:420});
  }
  if(['light','dry','pour','fill','throw'].includes(step.kind)){
   const fx=document.getElementById('worldEffect');fx.className='effect-'+step.kind;fx.style.left=(target?.x||600)/12+'%';fx.style.top=(target?.y||600)/8+'%';
  }
  if(state.actors[step.target]&&['give','receive','talk','use','throw'].includes(step.kind)){World.pose(step.target,'receive');record.frames.push(World.actorAsset(state.actors[step.target]));}
  if(['open','collect','code'].includes(step.kind)&&target){target.opened=true;const spr=document.querySelector(`[data-entity="${target.id}"] .sprite`);if(spr&&CATALOG[target.asset+'_open'])spr.outerHTML=World.sprite(target.asset+'_open');}
  if(!await delay(480,token))return false;
  for(const [id,slot] of Object.entries(step.move)){
   const e=World.node(id),[mx,my]=World.anchor(slot);if(!e)continue;
   if(state.actors[id]&&e.room===state.room){if(!await move(id,mx,my,token,record))return false;}
   else {const item=document.querySelector(`[data-entity="${id}"]`);if(item){const anim=item.animate([{left:e.x/12+'%',top:e.y/8+'%'},{left:mx/12+'%',top:my/8+'%'}],{duration:450,fill:'forwards'});if(!await delay(450,token)){anim.cancel();return false;}}}
  }
  if(step.kind==='event'&&target){const item=document.querySelector(`[data-entity="${target.id}"]`);item?.animate([{transform:'translate(-50%,-100%)'},{transform:'translate(250px,-200px) rotate(-15deg)'}],{duration:450});if(!await delay(450,token))return false;}

  if(step.kind==='weigh'){
   const scale=state.entities[step.use[0]],parts=[...document.querySelectorAll('[data-entity="boxes"] .box-part')];
   for(let i=0;i<parts.length;i++){const r=parts[i].getBoundingClientRect(),wr=document.getElementById('world').getBoundingClientRect(),dx=scale.x/1200*wr.width-(r.x-wr.x+r.width/2),dy=(scale.y-scale.h)/800*wr.height-(r.y-wr.y+r.height);const anim=parts[i].animate([{transform:'translate(0,0)'},{transform:`translate(${dx}px,${dy}px)`},{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:650});state.knowledge.scale=['赤 1kg','青 2kg','緑 3kg'][i];const box=document.querySelector('[data-entity="scale"]');box?.insertAdjacentHTML('beforeend',`<span class="world-clue">${i+1}kg</span>`);if(!await delay(650,token)){anim.cancel();return false;}}
  }
  if(!step.failure&&state.step===state.board.steps.length-1){
   const t=World.node(step.target)||target,yy=t.compartment==='top'?t.y-t.h*.8:(t.y||620)-50;
   state.entities.console={id:'console',label:'ゲーム機',asset:'console',x:t.x||600,y:yy,w:85,h:50,room:state.room,place:'room',visible:true,mode:'found'};
   World.render();World.pose('boy',yy<350?'high':'pickup');record.phases.push('collection');record.frames.push(World.actorAsset(state.actors.boy));
   const c=document.querySelector('[data-entity="console"]'),boy=state.actors.boy;
   c?.animate([{left:(t.x||600)/12+'%',top:yy/8+'%'},{left:boy.x/12+'%',top:(boy.y-boy.elevation-World.actorHeight(boy)*.5)/8+'%'}],{duration:480,fill:'forwards'});
   if(!await delay(480,token))return false;
  }
  if(step.kind==='climb'&&step.gain){World.pose('boy','high');record.frames.push(World.actorAsset(state.actors.boy));if(!await delay(250,token))return false;const boy=state.actors.boy,el=document.querySelector('[data-actor="boy"]');el?.animate([{top:(boy.y-boy.elevation)/8+'%'},{top:boy.y/8+'%'}],{duration:350,fill:'forwards'});if(!await delay(350,token))return false;boy.elevation=0;}
  record.phases.push('recovery');if(!await delay(100,token))return false;
  return true;
 }
 return {act,move,delay};
})();

const PuzzleRuleEngine=(()=>{
 function required(step){return step.use.filter(id=>{
  const e=state.entities[id];return e&&e.place!=='bag'&&!['stool','chair','ladder','scale'].includes(e.asset);
 });}
 function apply(step){
  const target=World.node(step.target);
  if(step.gain){const e=state.entities[step.gain];if(!e)throw Error('Missing acquisition '+step.gain);e.place='bag';e.visible=false;e.holder=null;if(!state.inventory.includes(e.id))state.inventory.push(e.id);state.selected=e.id;}
  if(['give','place','throw','order','assemble'].includes(step.kind))for(const id of step.use){const e=state.entities[id];if(!e)continue;e.place='room';e.visible=true;e.room=state.room;e.parent=null;e.holder=step.kind==='give'&&state.actors[step.target]?step.target:null;e.x=target?.x||600;e.y=(target?.y||620)-(state.actors[step.target]?World.actorHeight(state.actors[step.target])*.45:target?.asset==='plate'?4:target?.asset==='tub'?target.h*.65:40);if(step.kind==='order'){e.parent=step.target;e.slot='inside';e.place='room';e.visible=true;}if(step.kind==='assemble'){e.visible=false;e.place='installed';}state.inventory=state.inventory.filter(x=>x!==id);}
  if(step.kind==='combine')for(const id of step.use.slice(1)){const e=state.entities[id];e.place='installed';e.visible=false;state.inventory=state.inventory.filter(i=>i!==id);}
  if(['open','collect','code','lift'].includes(step.kind)&&target)target.opened=true;
  if(['inspect','read','talk','wait'].includes(step.kind)&&target){state.knowledge[step.target]=state.board.puzzle?.clue||'確認した';}
  for(const [id,parent] of Object.entries(step.reparent||{})){const e=state.entities[id];if(e){e.parent=parent;e.slot='inside';}}
  for(const id of step.reveal){const e=World.node(id);if(e)e.visible=true;}
  for(const [id,mode] of Object.entries(step.change)){if(id==='world'){state.light=true;continue;}const e=World.node(id);if(e)e.mode=mode;}
  for(const [id,slot] of Object.entries(step.move)){
   const e=World.node(id);if(!e)throw Error('Missing moved entity '+id);const [x,y]=World.anchor(slot);e.x=x;e.y=y;e.room=step.room||state.room;e.visible=true;if(e.place==='bag'){e.place='room';state.inventory=state.inventory.filter(i=>i!==id);}e.parent=null;e.holder=null;if(!step.change[id]&&state.actors[id]&&['sit','sleep'].includes(e.mode))e.mode='idle';
  }
  if(step.kind==='place'&&target?.asset==='ladder'){const future=state.board.steps.slice(state.step+1).find(s=>['climb','pull'].includes(s.kind));const t=future&&World.node(future.target),host=t?.parent?state.entities[t.parent]:t;if(host){target.x=host.x;target.y=host.y+65;}}
  if(step.kind==='travel'||step.kind==='carry'||(step.room&&['event','chase'].includes(step.kind))){
   state.room=step.room;state.actors.boy.room=step.room;state.actors.boy.x=980;state.actors.boy.y=710;
   if(step.kind==='event'&&target){target.room=step.room;const host=state.entities.tree;if(host){target.parent='tree';target.x=host.x;target.y=host.y-host.h*.7;}}
   if(step.kind==='chase'&&target)target.room=step.room;
  }
  if(step.kind==='carry'&&target){target.opened=true;for(const id of step.use){const e=state.entities[id];e.place='room';e.room=step.room;e.x=target.x;e.y=target.y-target.h;state.inventory=state.inventory.filter(i=>i!==id);}}
  if(state.actors.papa){if(step.change.papa==='read')state.actors.papa.pose='read';else if(step.change.papa==='drink')state.actors.papa.pose='drink';}
  // The console is physically revealed at the final container before CLEAR.
  if(!step.failure&&state.step===state.board.steps.length-1){
   const t=target||state.entities.door;state.entities.console={id:'console',label:'見つかったゲーム機',asset:'console',x:t.x||600,y:(t.y||620)-50,w:100,h:55,room:state.room,place:'room',holder:'boy',visible:true,mode:'found',opened:true};state.found=true;
  }
  World.resolveChildren();


  if(!state.inventory.includes(state.selected))state.selected=state.inventory.at(-1)||null;
 }
 return {required,apply};
})();

const InteractionManager=(()=>{
 function target(id){if(!state||state.busy||state.status!=='PLAYING')return;const step=state.board.steps[state.step];
  if(id===World.actionTarget(step)||id===step.target)return handleAction('correct',step.text);
  const e=World.node(id);if(e){setCaption(`${e.label}を調べた。${state.knowledge[id]||'今はほかの手掛かりを探そう。'}`);}
 }
 return {target};
})();
