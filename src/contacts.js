/* Interaction coordinates are painted-object points. Never use a parent's edge
   as an acquisition position, and never create a reward inside an action. */
const AnimationController=(()=>{
 const delay=(ms,token)=>new Promise(resolve=>setTimeout(()=>resolve(state?.token===token),ms));
 const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const alive=t=>state?.token===t;
 async function tween(ms,token,fn){const begin=performance.now();return new Promise(resolve=>{function frame(now){if(!alive(token)){resolve(false);return;}const t=clamp((now-begin)/ms,0,1),s=t*t*(3-2*t);fn(s,t);World.refresh();if(t<1)requestAnimationFrame(frame);else resolve(true);}requestAnimationFrame(frame);});}
 function root(e){let p=e?.id==='console'?World.node(state.board.console.container):e;for(let i=0;p?.parent&&i<8;i++)p=World.node(p.parent);return p;}
 function bodyScale(a,pose){const m=CATALOG[World.actorAsset(a,pose)];return m.bodyScale??(a.id==='boy'?({pickup:.65,push:.85,high:1.14,dig:.68,open:.72,climb:1.03}[pose]||1):['sit','sleep','eat','read','drink'].includes(pose)?.7:1);}
 function handUV(a,pose){return CATALOG[World.actorAsset(a,pose)].hand||[.8,.5];}
 function held(id){return Object.values(state.entities).filter(e=>e.place==='hand'&&e.holder===id);}
 function supportElevation(e){return e.h*({stool:.93,chair:.50,ladder:.85}[e.asset]||.5);}
 function plan(id,p,target,preferred=[]){
  const a=state.actors[id],r=root(target),wall=r?.slot==='wall'||r?.slot==='wallLow'||r?.asset==='window';
  const floor=wall?600:r?.y||a.y;
  let lo=clamp(floor-65,550,715),hi=clamp(floor+150,640,755);
  const support=a.support&&state.entities[a.support];
  if(support){lo=support.y-16;hi=support.y+16;}
  const only=preferred[0]?.startsWith('!')?preferred[0].slice(1):null;
  const poses=(only?[only]:[...new Set([...preferred,'reachWaist','reachChest','reachUp','reachOver','reachLow','kneel','reach','high','pickup','offer','open','idle'])]).filter(p=>CATALOG[id+'_'+p]);
  const candidates=[];
  for(const pose of poses){const m=CATALOG[id+'_'+pose],uv=m.hand||handUV(a,pose),B=World.baseHeight[id]*bodyScale(a,pose),d=B*(1-uv[1]);
   const elevations=[support?supportElevation(support):0];
   for(const elevation of elevations){const y=(p.y+elevation+d*(.84-500/600))/(1-d/600);if(y<lo||y>hi)continue;
    const h=B*(.84+(y-500)/600),w=h*m.rect[2]/m.rect[3];
    for(const facing of [1,-1]){const u=facing===1?uv[0]:1-uv[0],x=p.x-(u-.5)*w;
     if(x-w/2<8||x+w/2>1192||y-elevation-h<8)continue;
     if(support&&Math.abs(x-support.x)>support.w*.55)continue;
     candidates.push({x,y,pose,facing,elevation,score:Math.abs(y-clamp(floor+45,lo,hi))*.3+Math.abs(x-a.x)*.05+poses.indexOf(pose)*6+Math.abs(elevation-a.elevation)*.08});
    }
   }
  }
  candidates.sort((a,b)=>a.score-b.score);
  if(!candidates.length)throw Error(`Unreachable painted contact: Stage ${state.stage} ${id} -> ${target?.id} (${p.x.toFixed(1)},${p.y.toFixed(1)})`);
  return candidates[0];
 }
 async function move(id,x,y,token,record){const a=state.actors[id];if(!a)return true;
  const start={x:a.x,y:a.y},distance=dist(start,{x,y});a.facing=x>=a.x?1:-1;
  // A held object follows the same hand through the actual walk frames.
  if(!await tween(clamp(distance*1.1,220,700),token,(t,raw)=>{a.x=start.x+(x-start.x)*t;a.y=start.y+(y-start.y)*t;World.pose(id,Math.floor(raw*6)%2?'walk1':'walk2');}))return false;
  record.path??=[];record.path.push({actor:id,from:start,to:{x,y}});record.frames.push(id+'_walk1',id+'_walk2');return true;
 }
 async function aim(id,p,target,token,record,preferred=[]){
  const a=state.actors[id],dest=plan(id,p,target,preferred),oldElevation=a.elevation;
  if(a.room!==state.room){a.room=state.room;a.x=1030;a.y=690;World.render();}
  if(!await move(id,dest.x,dest.y,token,record))return false;
  a.facing=dest.facing;World.pose(id,dest.pose);record.frames.push(World.actorAsset(a));
  if(!await tween(180,token,t=>{a.elevation=oldElevation+(dest.elevation-oldElevation)*t;}))return false;
  const hand=World.hand(id);if(dist(hand,p)>1)throw Error('Hand missed painted contact '+dist(hand,p));
  record.contacts??=[];record.contacts.push({actor:id,target:target.id,hand:{...hand},point:{...p},error:dist(hand,p),pose:World.actorAsset(a)});
  state.contactProbe={hand,point:p,target:target.id};World.refresh();window.dispatchEvent(new CustomEvent('physical-contact',{detail:{actor:id,target:target.id,point:p,hand,pose:World.actorAsset(a)}}));return delay(320,token);
 }
 async function moveProp(e,x,y,token,ms=350,arc=0){const start={x:e.x,y:e.y};e.parent=null;e.holder=null;e.detached=true;e.place='transit';e.visible=true;
  const ok=await tween(ms,token,t=>{e.x=start.x+(x-start.x)*t;e.y=start.y+(y-start.y)*t-Math.sin(Math.PI*t)*arc;});
  if(ok)e.place='room';return ok;
 }
 async function expose(e,token,record){
  if(e.visible||!e.parent)return true;const parent=World.node(e.parent);if(!parent)throw Error('Concealment has no real parent');
  if(e.slot==='under'){e.visible=true;World.render();return true;}
  const original={x:e.x,y:e.y};if(parent.asset!=='clock'&&(e.slot==='behind'||!CATALOG[parent.asset+'_open']))e.detached=true;
  if(!await open(parent,token,record))return false;if(e.detached){e.x=original.x;e.y=original.y;}e.visible=true;World.render();return delay(140,token);
 }
 async function open(e,token,record,actor='boy'){
  if(state.actors[e.id]){e.opened=true;e.mode='open';World.pose(e.id,'open');World.render();World.reveal();return true;}
  if(e.opened)return true;
  if(e.place==='bag'||e.place==='hand'){
   World.attach(e.id,'boy');World.render();const a=state.actors.boy;
   if(!await put(e,{x:clamp(a.x+100,100,970),y:Math.min(745,a.y+10)-e.h/2},{...e,y:Math.min(745,a.y+10),slot:'floor'},token,record))return false;
  }
  const control=e.controlId?World.node(e.controlId):e,p=World.point(control.id);
  if(!await aim(actor,p,control,token,record,['reachWaist','reachChest','reachUp']))return false;
  if((!CATALOG[e.asset+'_open']&&!e.controlId)||e.asset==='clock'){
   const host=root(e),f=World.frame(host),surface=host.slot==='wall'?{...host,y:640,slot:'floor'}:host;
   const p={x:e.x+(e.asset==='clock'?0:70),y:host.slot==='wall'?640-e.h/2:host===e?e.y-e.h/2:f.top+f.h*.5-e.h/2};
   if(!await pickup(e,actor,token,record)||!await put(e,p,surface,token,record,actor))return false;e.lifted=true;
  }
  e.opened=true;
  if(e.controlId)state.entities[e.controlId].mode='on';
  const image=CATALOG[e.asset+'_open'];if(image&&e.asset!=='cushion'){const ratio=image.worldHeight/CATALOG[e.asset].worldHeight;e.h*=ratio;e.w=e.h*image.rect[2]/image.rect[3];}
  World.render();World.reveal();return delay(200,token);
 }
 async function pickup(e,actor,token,record){
  if(!e.visible&&!await expose(e,token,record))return false;
  if(e.place==='hand'&&e.holder===actor)return true;
  const origin={id:e.id,room:e.room,place:e.place,holder:e.holder,parent:e.parent,x:e.x,y:e.y,visible:e.visible};
  const p=World.point(e.id,'grip');if(!await aim(actor,p,e,token,record,['reachLow','pickup','reachWaist','reachUp']))return false;
  if(!e.visible)throw Error('Invisible pickup '+e.id);
  const error=dist(World.hand(actor),World.point(e.id,'grip'));if(error>1)throw Error('Pickup at empty air '+e.id);
  record.transfers??=[];record.transfers.push({id:e.id,origin,at:{...p},to:actor,error});
  World.attach(e.id,actor);World.render();return delay(150,token);
 }
 async function bagToHand(id,actor,token){const e=state.entities[id];if(!e)throw Error('Unknown inventory item');if(e.place==='bag'){World.attach(id,actor);World.render();return delay(100,token);}return true;}
 function targetPoint(step){let t=World.node(step.contactObject||step.target);if(!t)throw Error('Missing physical action target');if(t.parts)t=World.node(t.parts[0]);const f=World.frame(t);return {t,p:step.contactUV?{x:f.left+f.w*step.contactUV[0],y:f.top+f.h*step.contactUV[1]}:World.point(t.id,step.kind==='pickup'?'item':'touch')};}
 async function supportFor(step,token,record){
  if(step.kind!=='climb')return true;
  let support=step.use.map(id=>state.entities[id]).find(e=>['stool','ladder','chair'].includes(e?.asset));
  if(!support&&['chair','stool','ladder'].includes(World.node(step.target)?.asset))support=World.node(step.target);
  if(!support)throw Error('Climb without an actual support');
  state.actors.boy.support=support.id;
  // The next high operation uses the same placed support, not arbitrary levitation.
  if(step.target===support.id){const a=state.actors.boy;const old=a.elevation;
   if(!await move('boy',support.x,support.y,token,record))return false;
   World.pose('boy','climb');return tween(330,token,t=>{a.elevation=old+(supportElevation(support)-old)*t;});
  }
  return true;
 }
 async function toolContact(step,target,token,record){
  const id=step.use.find(id=>['net','tongs','rope','torch','dryer','catToy','wateringCan','shovel'].includes(state.entities[id]?.asset));
  if(!id)return false;const e=state.entities[id],a=state.actors[step.actor],p=targetPoint({...step,contactObject:target.id}).p;
  const meta=CATALOG[e.asset],grip=meta.grip||[.8,.9],tip=meta.tip||[.3,.12];
  // Long tools reach with their painted tip. Light and rope are visible beams/cords.
  const beam=['torch','dryer','rope'].includes(e.asset),vector=beam?{x:70,y:p.y-clamp(a.y-150,430,590)}:{x:e.w*(tip[0]-grip[0]),y:e.h*(tip[1]-grip[1])};
  const handPoint={x:p.x-vector.x,y:p.y-vector.y};e.grip=grip;e.tool=true;
  if(!await aim(step.actor,handPoint,target,token,record,['reachChest','reachUp','reachOver','reachWaist']))return false;
  World.attach(id,step.actor);World.render();
  if(beam&&e.asset!=='rope'){const h=World.hand(step.actor);e.angle=(Math.atan2(p.y-h.y,p.x-h.x)-Math.atan2(e.h*(tip[1]-grip[1]),e.w*(tip[0]-grip[0])))*180/Math.PI;World.refresh();}
  const h=World.hand(step.actor),f=World.frame(e),actualTip={x:f.left+f.w*tip[0],y:f.top+f.h*tip[1]},error=beam?0:dist(actualTip,p);if(error>1)throw Error('Tool tip missed its target '+id);
  record.contacts.push({actor:step.actor,target:target.id,tool:id,hand:h,point:p,tip:actualTip,error,effector:beam?'beam':'painted-tip'});
  if(beam)state.beam={actor:step.actor,tool:id,target:target.id,uv:step.contactUV,kind:e.asset};World.refresh();
  return delay(260,token);
 }
 async function put(e,p,surface,token,record,actor='boy'){
  if(e.place==='bag')World.attach(e.id,actor);
  const grip=e.grip||CATALOG[e.asset].grip||[.5,.5],hp={x:p.x+e.w*(grip[0]-.5),y:p.y+e.h*(grip[1]-.5)};
  if(!await aim(actor,hp,surface,token,record,['hold','kneel','reachWaist','reachChest','reachLow','read']))return false;
  const f=World.frame(e),at={x:f.left+f.w/2,y:f.top+f.h/2};if(dist(at,p)>1)throw Error('Placement missed its real surface '+e.id);
  record.transfers.push({id:e.id,origin:{place:'hand',holder:actor},to:surface.id,at:p,error:dist(at,p),placement:true});
  e.x=p.x;e.y=p.y+e.h/2;e.place='room';e.holder=null;e.parent=null;e.detached=true;e.visible=true;
  if(state.entities[surface.id]===surface&&surface!==e){const f=World.frame(surface);e.parent=surface.id;e.mount=[(p.x-f.left)/f.w,(p.y-f.top)/f.h];e.detached=false;}
  World.refresh();return delay(100,token);
 }
 async function performMoves(step,token,record){
  for(const [id,slot] of Object.entries(step.move)){
   if(step.kind==='event'&&step.room&&id===step.target)continue;
   const e=World.node(id),[x,y]=World.anchor(slot);if(!e)throw Error('Missing moved entity');
   if(state.actors[id]){if(e.room===state.room&&!await move(id,x,y,token,record))return false;e.x=x;e.y=y;if(step.room)e.room=step.room;}
   else{
    if(e.place==='hand'&&e.holder){if(!await put(e,{x,y:y-e.h/2},{id:e.id,x,y,slot:'floor'},token,record,e.holder))return false;continue;}
    const rope=step.use.some(id=>state.entities[id]?.asset==='rope');
    if(step.kind==='pull'&&!rope){if(!await pickup(e,step.actor,token,record)||!await put(e,{x,y:y-e.h/2},{id:e.id,x,y,slot:'floor'},token,record))return false;e.exposed=true;continue;}
    e.detached=true;e.parent=null;const start={x:e.x,y:e.y};
    const actor=state.actors[step.actor];
    let pose=null;
    if(step.kind==='push'&&!rope){const old={x:e.x,y:e.y};e.x=x;e.y=y;const q=plan(step.actor,World.point(e.id),e,['kneel','reachWaist','reachLow']);e.x=old.x;e.y=old.y;pose=q.pose;if(!await aim(step.actor,World.point(e.id),e,token,record,['!'+pose]))return false;}
    if(!await tween(500,token,t=>{e.x=start.x+(x-start.x)*t;e.y=start.y+(y-start.y)*t;if(pose){const q=plan(step.actor,World.point(e.id),e,['!'+pose]);actor.x=q.x;actor.y=q.y;actor.facing=q.facing;World.pose(step.actor,q.pose);}}))return false;
    e.exposed=true;e.holder=null;e.place='room';

   }
  }
  return true;
 }
 async function pourCup(cup,pot,token,record){
  const original={x:pot.x,y:pot.y},surface=root(pot),f=World.frame(surface);
  if(!await put(cup,{x:pot.x-90,y:f.top+f.h*.25-cup.h/2},surface,token,record)||!await pickup(pot,'boy',token,record))return false;
  const m=CATALOG[pot.asset],g=m.grip,t=m.tip,r=-25*Math.PI/180,dx=pot.w*(t[0]-g[0]),dy=pot.h*(t[1]-g[1]);
  const p={x:cup.x-dx*Math.cos(r)+dy*Math.sin(r),y:cup.y-cup.h*.85-32-dx*Math.sin(r)-dy*Math.cos(r)};
  if(!await aim('boy',p,surface,token,record,['reachWaist','hold','kneel']))return false;
  if(!await tween(250,token,t=>pot.angle=-25*t))return false;
  state.beam={actor:'boy',tool:pot.id,target:cup.id,uv:[.35,.15],kind:'coffee'};World.refresh();if(!await delay(650,token))return false;
  cup.mode='filled';state.beam=null;if(!await tween(250,token,t=>pot.angle=-25*(1-t)))return false;
  if(!await put(pot,{x:original.x,y:original.y-pot.h/2},surface,token,record)||!await pickup(cup,'boy',token,record))return false;return true;
 }
 async function sortGroup(group,token,record){
  async function placePart(e,mount){const f=World.frame(group),p={x:f.left+f.w*mount[0],y:f.top+f.h*mount[1]};
   if(!await pickup(e,'boy',token,record)||!await put(e,p,root(group),token,record))return false;e.parent=group.id;e.mount=[...mount];e.detached=false;World.refresh();return true;}
  for(const [i,id] of group.parts.entries()){
   const part=state.entities[id],dest=[(i+.5)/group.parts.length,part.mount[1]];
   if(Math.abs(part.mount[0]-dest[0])<.01)continue;
   const original=[...part.mount],occupied=group.parts.map(id=>state.entities[id]).find(e=>e!==part&&Math.abs(e.mount[0]-dest[0])<.01);
   if(occupied&&!await placePart(occupied,[-.20,occupied.mount[1]]))return false;
   if(!await placePart(part,dest))return false;
   if(occupied&&!await placePart(occupied,[original[0],occupied.mount[1]]))return false;
  }return true;
 }
 async function act(step,record,token){
  const a=state.actors[step.actor],target=World.node(step.target);if(!a||!target)throw Error('Action without a physical actor/target');
  const returnToBag=new Set(step.use);if(target.place==='bag')returnToBag.add(target.id);
  record.phases.push('approach');record.contacts=[];record.transfers=[];
  if(step.actor==='vacuum'&&step.kind==='push'){target.detached=true;target.parent=null;target.visible=true;World.render();}
  for(const id of step.use)if(state.entities[id]?.place==='bag'&&!await bagToHand(id,step.actor,token))return false;
  if(step.kind==='dry'){
   const note=step.use.map(id=>state.entities[id]).find(e=>e.asset==='note');note.handSide='left';World.sync();
  }
  if(!await supportFor(step,token,record))return false;
  const isTravel=step.room&&['travel','carry','event','chase'].includes(step.kind);
  if(isTravel){if(!await aim(step.actor,World.point('door'),state.entities.door,token,record,['reachWaist']))return false;}
  else if(step.kind==='collect'){
   if(!state.entities.console.visible){if(!await open(World.node(state.board.console.container),token,record))return false;World.reveal();}
   if(!state.entities.console.visible)throw Error('No game in the opened hiding place');
  }else if(step.kind==='receive'&&step.gain){
   const e=state.entities[step.gain];if(['cat','crow'].includes(step.target)){
    const f=World.frame(target);if(!await moveProp(e,clamp(target.x-60,80,980),Math.max(650,f.bottom+20),token))return false;
   }
   if(!await pickup(e,step.actor,token,record))return false;
  }else if(step.kind==='pickup'){
   if(step.use.some(id=>['net','tongs'].includes(state.entities[id]?.asset))){if(!await expose(target,token,record)||!await toolContact(step,target,token,record))return false;const origin={place:'room',x:target.x,y:target.y};target.place='hand';target.holder=step.actor;target.toolOwner=step.use.find(id=>['net','tongs'].includes(state.entities[id]?.asset));target.parent=null;target.detached=true;World.refresh();record.transfers.push({id:target.id,origin,tool:true,to:step.actor});}
   else if(!await pickup(state.entities[step.gain]||target,step.actor,token,record))return false;
  }else if(['open','code'].includes(step.kind)){
   if(!await open(target,token,record,step.actor))return false;
   if(step.gain&&!await pickup(state.entities[step.gain],step.actor,token,record))return false;
  }else if(step.kind==='pour'&&target.asset==='pot'){/* The pot and cup each move through a real hand below. */}
  else if(state.actors[target.id]&&['wait','talk','inspect','event'].includes(step.kind)){
   if(!await move(step.actor,clamp(target.x+(a.x<target.x?-170:170),90,1010),Math.min(745,Math.max(a.y,target.y+35)),token,record))return false;World.pose(step.actor,'idle');a.facing=a.x<target.x?1:-1;World.refresh();record.frames.push(World.actorAsset(a));
  }else if(step.kind==='walk'){
   if(!await move(step.actor,clamp(target.x+(a.x<target.x?-1:1)*(target.w/2+70),90,1010),Math.min(745,target.y+35),token,record))return false;
  }
  else if(step.kind==='climb'&&step.target===a.support&&!step.gain){record.frames.push(World.actorAsset(a));}
  else if(step.ranged){World.pose(step.actor,'hold');World.refresh();state.beam={actor:step.actor,tool:step.use[0],target:step.target,kind:'infrared'};record.frames.push(World.actorAsset(a));}
  else if(step.kind==='dry'){
   if(!await aim(step.actor,World.point(target.id),target,token,record,['reachWaist','reachChest']))return false;
   World.pose(step.actor,'hold');World.refresh();const note=step.use.map(id=>state.entities[id]).find(e=>e.asset==='note');state.beam={actor:step.actor,tool:step.use.find(id=>state.entities[id].asset==='dryer'),target:note.id,kind:'dryer'};
  }else if(['place','order','assemble','carry'].includes(step.kind)&&step.use.length){/* Placement aims at the real supporting surface below. */}
  else if(target.place==='bag'||target.place==='hand'&&target.holder===step.actor){
   await bagToHand(target.id,step.actor,token);World.pose(step.actor,'read');World.refresh();record.frames.push(World.actorAsset(a));
  }else if(['light','pull','dig','pour'].includes(step.kind)&&step.use.some(id=>['net','tongs','rope','torch','dryer','catToy','wateringCan','shovel'].includes(state.entities[id]?.asset))){if(!await toolContact(step,target,token,record))return false;}
  else if(!isTravel){
   const {t,p}=targetPoint(step);if(!await expose(t,token,record))return false;
   if(!await aim(step.actor,p,t,token,record,['reachWaist','reachChest','reachUp','reachLow']))return false;
  }
  record.phases.push('anticipation');if(!await delay(100,token))return false;
  record.phases.push('action');
  if(step.kind==='pour'&&target.asset==='pot')if(!await pourCup(state.entities[step.use[0]],target,token,record))return false;
  if(step.kind==='give'){
   const receiver=state.actors[step.target];World.pose(receiver.id,'receive');World.refresh();
   for(const id of step.use){const e=state.entities[id],p=World.hand(receiver.id);if(!await aim(step.actor,p,receiver,token,record,['reachWaist','reachChest','reachUp']))return false;World.attach(id,receiver.id);record.transfers.push({id,origin:{place:'hand',holder:step.actor},to:receiver.id,at:p,error:0});
    if(['cat','dog'].includes(receiver.id)&&['catTreat','dogTreat'].includes(e.asset)){const w=e.w,h=e.h;if(!await tween(320,token,t=>{e.w=w*(1-t*.7);e.h=h*(1-t*.7);}))return false;e.place='consumed';e.visible=false;receiver.mode='eat';World.pose(receiver.id,'eat');World.render();}
   }
  }
  if(step.kind==='place'&&target.asset==='ladder'){
   const future=state.board.steps.slice(state.step+1).find(s=>['climb','pull'].includes(s.kind)),t=World.node(future?.target),host=t?.parent?World.node(t.parent):t;
   if(host){if(!await pickup(target,'boy',token,record))return false;World.render();if(!await put(target,{x:host.x,y:host.y+65-target.h/2},{...host,y:host.y+65},token,record))return false;}
  }
  if(['place','throw','order','assemble','carry'].includes(step.kind))for(const id of step.use){
   const e=state.entities[id];if(!e||!['hand','bag'].includes(e.place))continue;
   const f=World.frame(target),moveSlot=step.move[id],slot=moveSlot&&World.anchor(moveSlot);
   const surface=slot?{id:target.id,x:slot[0],y:slot[1],slot:'floor'}:target;
   const p=slot?{x:slot[0],y:slot[1]-e.h/2}:e.orderMount?{x:f.left+f.w*e.orderMount[0],y:f.top+f.h*e.orderMount[1]}:state.actors[target.id]?{x:target.x+45,y:target.y+5-e.h/2}:target.asset==='plate'?{x:target.x,y:target.y-4-e.h/2}:target.asset==='tub'?{x:target.x,y:f.top+f.h*.72-e.h/2}:{x:target.x,y:f.top+f.h*.45};
   if(!isTravel){if(step.kind==='throw'){const catcher=World.human.has(target.id);if(catcher){World.pose(target.id,'receive');World.refresh();}const q=catcher?World.hand(target.id):p;if(!await moveProp(e,q.x,q.y+e.h/2,token,450,80))return false;if(catcher)World.attach(e.id,target.id);}else if(!await put(e,p,surface,token,record))return false;}
   if(step.kind==='assemble'){e.place='installed';e.visible=false;}
   if(step.kind==='order'){e.parent=target.id;e.slot='inside';e.mount=e.orderMount||[.5,.5];e.detached=false;}
   if(target.asset==='tub'){e.parent=target.id;e.mount=[.5,.72-e.h/(2*f.h)];e.detached=false;}
  }
  if(step.kind==='order'){const group=target.parts?target:step.use.map(id=>state.entities[id]).find(e=>e.parts);if(group&&!await sortGroup(group,token,record))return false;}
  if(step.change.tub==='filled'){
   const tub=state.entities.tub,duck=state.entities.duck,from=duck.mount[1];tub.mode='filled';
   if(!await tween(650,token,t=>{duck.mount=[.5,from+(.35-from)*t];}))return false;
  }
  if(step.kind==='pull'&&!Object.keys(step.move).length&&!step.use.length){const host=root(target),floor=Math.min(730,(host?.y||600)+80),x=target.x;if(!await pickup(target,step.actor,token,record))return false;const p={x,y:floor-target.h/2};if(!await put(target,p,{...target,y:floor},token,record))return false;}
  if(step.kind==='combine')for(const id of step.use.slice(1)){state.entities[id].place='installed';state.entities[id].visible=false;}
  if(step.kind==='lift'){
   const host=root(target),f=World.frame(host);if(!await pickup(target,step.actor,token,record)||!await put(target,{x:f.left+f.w*.22,y:f.top+f.h*.66},host,token,record))return false;target.lifted=true;target.opened=true;
  }
  if(['inspect','read','light'].includes(step.kind))target.inspected=true;
  if(!await performMoves(step,token,record))return false;
  for(const id of step.reveal){const e=World.node(id);if(e)e.visible=true;}
  World.reveal();World.refresh();
  if(isTravel){
   // Exit before changing scenes. Enter through the destination doorway visibly.
   state.room=step.room;a.room=step.room;a.x=1080;a.y=600;a.elevation=0;a.support=null;
   if(step.kind==='event'){target.room=step.room;const host=state.entities.tree;if(host){target.parent=null;target.detached=true;target.x=90;target.y=230;}}
   if(step.kind==='chase')target.room=step.room;
   if(step.kind==='carry')for(const id of step.use){const e=state.entities[id];e.room=step.room;e.place='hand';e.holder=step.actor;}
   World.render();if(!await move(step.actor,925,700,token,record))return false;
   if(step.kind==='event'&&state.entities.tree){const host=state.entities.tree,f=World.frame(host);if(!await moveProp(target,f.left+f.w*.65,f.top+f.h*.43+target.h/2,token,500,35))return false;target.parent='tree';target.mount=[.65,.43];target.detached=false;World.render();}
   if(step.kind==='carry')for(const id of step.use){const e=state.entities[id];if(!await put(e,{x:target.x,y:target.y-target.h+e.h/2},target,token,record))return false;}
  }
  if(step.kind==='weigh'){
   const scale=state.entities[step.use[0]];
   for(const [i,color] of ['red','blue','green'].entries()){
    const box=state.entities['boxes__'+color],original={x:box.x,y:box.y,parent:box.parent,mount:box.mount};
    if(!await pickup(box,'boy',token,record))return false;
    if(!await put(box,{x:scale.x,y:scale.y-scale.h*.25-box.h/2},scale,token,record))return false;
    state.knowledge.scale=['赤 1kg','青 2kg','緑 3kg'][i];World.render();if(!await delay(220,token))return false;
    if(!await pickup(box,'boy',token,record)||!await put(box,{x:original.x,y:original.y-box.h/2},{...target,y:original.y},token,record))return false;
    box.parent=original.parent;box.mount=original.mount;box.detached=false;
   }
  }
  if(step.kind==='collect'){
   const game=state.entities.console;if(game!==state.consoleIdentity||game.birth!=='stage-init')throw Error('Reward was spawned during an action');
   record.phases.push('collection');if(!await delay(200,token)||!await pickup(game,'boy',token,record))return false;
  }
  if(step.gain&&!record.transfers.some(t=>t.id===step.gain))if(!await pickup(state.entities[step.gain],step.actor,token,record))return false;
  if(step.kind==='climb'&&step.gain){a.support=null;const from=a.elevation;if(!await tween(300,token,t=>a.elevation=from*(1-t)))return false;}
  state.beam=null;for(const id of returnToBag){const e=state.entities[id];if(e?.place==='hand'&&e.holder===step.actor){e.place='bag';e.visible=false;e.holder=null;if(!state.inventory.includes(id))state.inventory.push(id);}}
  record.phases.push('recovery');
  // Leave the next clue visible. Standing up at the pickup point can otherwise
  // cover the just-opened compartment, and a low pickup pose cannot become an
  // upright actor with its feet inside the cabinet.
  if(step.actor==='boy'&&!a.support){const f=World.frame(target),side=a.x<target.x?-1:1;
   if(!await move('boy',clamp(target.x+side*(Math.min(f.w,210)/2+95),90,1010),Math.max(a.y,Math.min(745,(root(target)?.y||640)+45)),token,record))return false;
   const next=state.board.steps[state.step+1],e=next&&World.node(World.actionTarget(next));
   if(e?.visible&&e.room===state.room&&!state.actors[e.id]&&Math.abs(a.x-e.x)<100)if(!await move('boy',clamp(e.x+(e.x>600?-150:150),90,1010),a.y,token,record))return false;
  }
  if(step.actor==='vacuum'&&step.kind==='push')if(!await move('vacuum',a.x+(a.x<target.x?-60:60),a.y,token,record))return false;
  if(!await delay(100,token))return false;
  return true;
 }
 return {act,move,delay,plan,tween};
})();
