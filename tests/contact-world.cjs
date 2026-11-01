// Browser regression for painted hit tests, continuous ownership, real hiding
// compartments and measured hand contacts. A CLEAR label alone is insufficient.
const {chromium}=require('playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const boards=JSON.parse(fs.readFileSync('scenario/storyboards.json'));
const selected=process.env.STAGES?process.env.STAGES.split(',').map(Number):boards.map(b=>b.stage);
const out=process.env.OUT||'test-results/v014';fs.mkdirSync(out,{recursive:true});let browser;
async function paintedClick(page,id){
 const hit=await page.evaluate(async id=>{
  const el=document.querySelector(`#world [data-node="${id}"]`);if(!el)return null;
  const r=el.getBoundingClientRect();
  for(const fy of [.5,.3,.7,.15,.85,.05,.95])for(const fx of [.5,.3,.7,.15,.85,.05,.95]){
   const x=r.x+r.width*fx,y=r.y+r.height*fy;if(await World.pick(x,y)===id)return {x,y};
  }return null;
 },id);
 assert.ok(hit,`No exposed painted click for ${id}`);await page.mouse.click(hit.x,hit.y);return hit;
}
async function runStage(page,n){
 const board=boards[n-1],result={stage:n,steps:[]};await page.evaluate(n=>{GameTest.loadStage(n);window.__errors=[];window.__contacts=[];window.__game=state.entities.console;window.__geometry=[];window.__capturedFrames=new Set();},n);
 await page.locator('#world').screenshot({path:`${out}/s${n}-initial.png`});
 for(let i=0;i<board.steps.length;i++){
  const step=board.steps[i],before=await page.evaluate(()=>World.snapshot());
  assert.equal(before.entities.console.birth,'stage-init');
  const item=(step.inputItems||step.use).find(id=>before.inventory.includes(id));
  const id=await page.evaluate(()=>World.actionTarget(state.board.steps[state.step]));
  let click;
  if(step.inputTarget==='bag'){await page.locator(`[data-item="${item}"]`).dragTo(page.locator(`[data-item="${step.target}"]`));click={bag:step.target};}
  else if(step.dropZone){const r=await page.locator('#world').boundingBox(),[x,y]=step.dropZone.center;await page.locator(`[data-item="${item}"]`).dragTo(page.locator('#world'),{targetPosition:{x:x/1200*r.width,y:y/800*r.height}});click={x,y,floor:true};}
  else if(item){
   const hit=await page.evaluate(async id=>{const r=document.querySelector(`#world [data-node="${id}"]`).getBoundingClientRect();for(const fy of [.5,.3,.7,.15,.85,.05,.95])for(const fx of [.5,.3,.7,.15,.85,.05,.95]){const x=r.x+r.width*fx,y=r.y+r.height*fy;if(await World.pick(x,y)===id)return {x,y};}},id);assert.ok(hit,`No painted drop target ${id}`);
   const wr=await page.locator('#world').boundingBox();await page.locator(`[data-item="${item}"]`).dragTo(page.locator('#world'),{targetPosition:{x:hit.x-wr.x,y:hit.y-wr.y}});click=hit;
  }else click=await paintedClick(page,id);
  if(board.puzzle?.step===i&&board.puzzle.mode!=='boxColor'){await page.locator('#puzzleOverlay').waitFor();const input=page.locator('#puzzleAnswer');if(board.puzzle.options)await input.selectOption(board.puzzle.answer);else await input.fill(board.puzzle.answer);await page.locator('#puzzleSubmit').click();}
  await page.waitForFunction(i=>(state.step===i+1&&!state.busy)||window.__errors.length,i,{timeout:75000});
  assert.ok(await page.evaluate(()=>window.__geometry.every(g=>g.inside!==false&&g.overlap!==true)),`Stage ${n}: support or handover geometry`);
  assert.deepEqual(await page.evaluate(()=>window.__errors),[],`Stage ${n} step ${i} ${step.text}`);
  const after=await page.evaluate(()=>({snap:World.snapshot(),identity:state.entities.console===window.__game,found:state.found,region:World.region()})),audit=after.snap.audit.at(-1);
  assert.ok(after.identity,`Stage ${n} game was replaced/spawned`);
  if(after.snap.entities.console.visible&&!after.found)assert.ok(board.steps.slice(i+1).every(s=>['inspect','read','collect'].includes(s.kind)),`Stage ${n}: game exposed before the remaining puzzle`);
  const clipped=await page.evaluate(()=>{const w=document.querySelector('#world').getBoundingClientRect();return [...document.querySelectorAll('#world [data-actor]')].filter(e=>{const r=e.getBoundingClientRect();return r.x<w.x-1||r.y<w.y-1||r.right>w.right+1||r.bottom>w.bottom+1}).map(e=>e.dataset.actor)});assert.deepEqual(clipped,[],`Stage ${n} step ${i}: clipped character`);
  for(const c of audit.contacts)assert.ok(c.error<=1,`Stage ${n} ${c.target}: missed hand contact ${c.error}`);
  if(step.gain){assert.ok(after.snap.inventory.includes(step.gain));assert.ok(audit.transfers.some(t=>t.id===step.gain),`No real transfer ${step.gain}`);for(const id of after.snap.entities[step.gain].parts||[])assert.equal(await page.locator(`#world [data-node="${id}"]`).count(),0,'BAG child left in room');}
  if(step.kind==='give')for(const id of step.use)assert.equal(after.snap.entities[id].holder,step.target);
  if(step.kind==='collect'){
   assert.equal(after.found,true);assert.equal(after.snap.entities.console.holder,'boy');
   const t=audit.transfers.find(t=>t.id==='console');assert.ok(t?.origin.visible);assert.equal(t.origin.place,'room');
   const r=after.region;assert.ok(t.at.x>=r.left-1&&t.at.x<=r.left+r.w+1&&t.at.y>=r.top-1&&t.at.y<=r.top+r.h+1,`Stage ${n}: console outside real hiding compartment`);
  }
  result.steps.push({index:i,text:step.text,kind:step.kind,clicked:id,click,contacts:audit.contacts,transfers:audit.transfers,room:after.snap.room,inventory:after.snap.inventory,identity:after.identity});
  await page.locator('#world').screenshot({path:`${out}/s${n}-step${i}.png`});
 }
 await page.locator('.result-card h2').filter({hasText:'CLEAR!'}).waitFor();
 fs.writeFileSync(`${out}/stage-${n}.json`,JSON.stringify(result,null,2));console.log(`Stage ${n}: ${result.steps.length} actions PASS`);return result;
}
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cursor=0;const results=[],failures=[];
 await Promise.all(Array.from({length:Math.min(4,selected.length)},async()=>{
  const page=await browser.newPage({viewport:{width:1600,height:1100}});
  page.on('pageerror',e=>page.evaluate(m=>window.__errors?.push(m),e.message).catch(()=>{}));
  await page.goto('http://127.0.0.1:8000');
  await page.exposeBinding('captureContact',async(_,data)=>{
   if(data.first)await page.locator('#world').screenshot({path:`${out}/s${data.stage}-contact${data.step}.png`}).catch(()=>{});
  });
  await page.evaluate(()=>{GameTest.captureContact=async()=>{const key=state.stage+'-'+state.step;if(!window.__capturedFrames?.has(key)){window.__capturedFrames?.add(key);await window.captureContact({first:true,stage:state.stage,step:state.step});}};window.addEventListener('physical-contact',e=>{
   const boy=state.actors.boy;if(boy.support){const s=state.entities[boy.support];window.__geometry.push({support:s.id,inside:SceneGeometry.feet(boy).every(p=>SceneGeometry.supportContains(s,p))});}if(state.board.steps[state.step].kind==='give'&&e.detail.target==='papa'){const f=World.frame(boy);window.__geometry.push({handover:true,overlap:SceneGeometry.overlapsActor('boy',boy.x,boy.y,f.h,f.w,boy.elevation)});}const first=!window.__contacts.some(c=>c.step===state.step);window.__contacts.push({step:state.step,...e.detail});

  });});
  while(cursor<selected.length){const n=selected[cursor++];try{results.push(await runStage(page,n));}catch(e){failures.push({stage:n,error:e.stack});console.error(`Stage ${n} FAILED: ${e.message}`);await page.screenshot({path:`${out}/FAILED-${n}.png`});}}
  await page.close();
 }));
 results.sort((a,b)=>a.stage-b.stage);fs.writeFileSync(`${out}/summary.json`,JSON.stringify({stages:results.length,actions:results.reduce((n,r)=>n+r.steps.length,0),failures,results},null,2));
 await browser.close();assert.deepEqual(failures,[]);console.log('ALL SELECTED PAINTED CONTACT TESTS PASS');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
