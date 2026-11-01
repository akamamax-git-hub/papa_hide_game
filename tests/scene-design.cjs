const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8000');
 const audits=[];
 for(let n=1;n<=50;n++){
  await p.evaluate(n=>GameTest.loadStage(n),n);assert.equal(await p.locator('[data-role]').count(),0,'Default UI exposes solution');
  const data=await p.evaluate(()=>{
   const footwear=Object.values(state.actors).filter(a=>World.human.has(a.id)).map(a=>({actor:a.id,key:World.actorAsset(a),wear:CATALOG[World.actorAsset(a)].footwear,expected:SceneGeometry.footwear(a.room,a.y)}));
   const a=state.actors.boy,e=Object.values(state.entities).find(e=>e.asset&&e.place==='room'&&World.isHere(e)&&!e.parent&&!e.parts&&e.id!=='console'&&e.asset!=='window'&&!['wall','wallLow'].includes(e.slot))||Object.values(state.actors).find(e=>e.id!=='boy'&&e.visible&&e.room===state.room&&World.human.has(e.id)),samples=[];
   if(e)for(const y of [550,650,745]){a.x=100;a.y=y;a.elevation=0;a.pose='idle';e.y=y;e.parent=null;World.render();const ar=document.querySelector('[data-actor="boy"]').getBoundingClientRect(),er=document.querySelector(`[${state.actors[e.id]?'data-actor':'data-entity'}="${e.id}"]`).getBoundingClientRect();samples.push({y,ratio:ar.height/er.height,person:ar.height,object:er.height});}
   return {footwear,samples};
  });
  for(const a of data.footwear)assert.ok(a.wear===a.expected,`Stage ${n} ${a.actor} footwear ${a.key}`);
  if(data.samples.length){assert.ok(data.samples[0].person<data.samples[1].person&&data.samples[1].person<data.samples[2].person);for(const s of data.samples)assert.ok(Math.abs(s.ratio/data.samples[0].ratio-1)<.006,`Stage ${n}: actor/furniture relative scale changes`);}
  audits.push({stage:n,...data});
 }
 async function load(n){await p.evaluate(n=>GameTest.loadStage(n),n);}
 async function point(id){const hit=await p.evaluate(async id=>{const r=document.querySelector(`#world [data-node="${id}"]`).getBoundingClientRect();for(const fy of [.5,.3,.7,.15,.85,.05,.95])for(const fx of [.5,.3,.7,.15,.85,.05,.95]){const x=r.x+r.width*fx,y=r.y+r.height*fy;if(await World.pick(x,y)===id)return{x,y};}},id);assert.ok(hit,'No painted target '+id);return hit;}
 async function click(id,index){const h=await point(id);await p.mouse.click(h.x,h.y);await p.waitForFunction(i=>state.done.includes(i)&&!state.busy,index,{timeout:45000});}
 async function dropFloor(item,x,y){const r=await p.locator('#world').boundingBox();await p.locator(`[data-item="${item}"]`).dragTo(p.locator('#world'),{targetPosition:{x:x/1200*r.width,y:y/800*r.height}});}
 // Three independent observations: each reveals its own fact, with no full answer.
 await load(41);await click('cat',1);assert.deepEqual(await p.evaluate(()=>Object.keys(state.knowledge)),['cat']);assert.equal(await p.locator('#notebook').textContent().then(t=>t.includes('3時')),false);await click('tv',2);await click('clock',0);
 const polygon=await p.locator('[data-tv-screen]').getAttribute('points');const points=polygon.split(' ').map(s=>s.split(',').map(Number));assert.notEqual(points[0][1],points[1][1]);assert.notEqual(points[2][1],points[3][1]);assert.ok(points.every(p=>p.every(v=>v>=0&&v<=1000)));
 await p.locator('#world').screenshot({path:'test-results/v0142/tv-and-clock.png'});
 const red=await point('boxes__red');await p.mouse.click(red.x,red.y);await p.locator('.result-card.fail').waitFor({timeout:45000});assert.ok(await p.evaluate(()=>state.entities.boxes__red.opened&&!state.entities.console.visible));
 await load(41);await click('clock',0);await click('tv',2);await click('cat',1);await click('boxes__blue',3);await p.locator('.result-card h2').filter({hasText:'CLEAR!'}).waitFor();
 // Floor placement uses actual drag coordinates. A bad drop cannot lose the stool.
 await load(4);await click('stool',0);await dropFloor('stool',95,740);assert.deepEqual(await p.evaluate(()=>({step:state.step,bag:state.inventory})),{step:1,bag:['stool']});await dropFloor('stool',765,615);await p.waitForFunction(()=>state.done.includes(1)&&!state.busy);assert.ok(await p.evaluate(()=>Math.abs(state.entities.stool.y-615)<1));await click('key',2);
 // Choose the independent item first, then combine two BAG objects directly.
 await load(2);await click('stool',1);assert.equal(await p.evaluate(()=>state.step),0);await dropFloor('stool',755,605);await p.waitForFunction(()=>state.done.includes(2)&&!state.busy);await click('stool',3);await click('clock',4);await click('remote',0);const boyHit=await point('boy'),wr=await p.locator('#world').boundingBox();await p.locator('[data-item="remote"]').dragTo(p.locator('#world'),{targetPosition:{x:boyHit.x-wr.x,y:boyHit.y-wr.y}});assert.equal(await p.evaluate(()=>state.done.includes(5)),false);assert.ok(await p.evaluate(()=>state.inventory.includes('battery')&&state.inventory.includes('remote')));await p.locator('[data-item="battery"]').dragTo(p.locator('[data-item="remote"]'));await p.waitForFunction(()=>state.done.includes(5)&&!state.busy);assert.equal(await p.evaluate(()=>state.entities.remote.mode),'powered');
 // A wet note dropped on a socket must not silently use the owned dryer.
 await load(14);await click('note',0);await click('dryer',1);const socketHit=await point('socket'),sw=await p.locator('#world').boundingBox();await p.locator('[data-item="note"]').dragTo(p.locator('#world'),{targetPosition:{x:socketHit.x-sw.x,y:socketHit.y-sw.y}});assert.equal(await p.evaluate(()=>state.done.includes(2)),false);await p.locator('[data-item="dryer"]').dragTo(p.locator('#world'),{targetPosition:{x:socketHit.x-sw.x,y:socketHit.y-sw.y}});await p.waitForFunction(()=>state.done.includes(2)&&!state.busy);assert.equal(await p.evaluate(()=>state.entities.note.mode),'dry');
 // A selected unrelated item cannot execute a no-tool action.
 await load(1);await click('paper',0);await p.locator('[data-item="paper"]').click();const cab=await point('cab');await p.mouse.click(cab.x,cab.y);assert.equal(await p.evaluate(()=>state.done.length),1);assert.equal(await p.evaluate(()=>state.entities.cab.opened),false);
 // Entering the outdoor part of the entrance changes actual walking art.
 await load(6);await p.evaluate(async()=>{await InteractionManager.walk({x:950,y:610});});assert.ok(await p.evaluate(()=>World.actorAsset(state.actors.boy).endsWith('_indoor')));await p.evaluate(async()=>{await InteractionManager.walk({x:950,y:710});});assert.equal(await p.evaluate(()=>World.actorAsset(state.actors.boy)),'boy_idle');
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/v0142/scene-design.json',JSON.stringify({audits,defaultSolutionHidden:50,observationOrder:'PASS',isolatedClues:'PASS',tvPerspective:'PASS',wrongPhysicalBox:'PASS',rightPhysicalBox:'PASS',wrongFloorDropPreservesItem:'PASS',stoolPlacement:'PASS',independentPickup:'PASS',bagCombination:'PASS',recipeInputTarget:'PASS',dryerInputItem:'PASS',wrongToolGuard:'PASS',entranceFootwearTransition:'PASS',errors},null,2));console.log('50 depth/footwear/UI audits, free observations, physical box choice, floor placement, BAG combination and wrong-tool guard: PASS');await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
