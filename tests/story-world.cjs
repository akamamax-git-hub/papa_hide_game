// Verify the rendered world, acquisition continuity and on-screen performance,
// rather than just clicking a data-role button until a CLEAR label appears.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const boards=JSON.parse(fs.readFileSync('scenario/storyboards.json','utf8'));
const selected=process.env.STAGES?process.env.STAGES.split(',').map(Number):boards.map(b=>b.stage);
const out='test-results/v012';fs.mkdirSync(out,{recursive:true});
let browser;
async function runStage(page,n){
 const board=boards.find(b=>b.stage===n);await page.evaluate(n=>GameTest.loadStage(n),n);
 await page.waitForFunction(()=>[...document.querySelectorAll('#world .sprite')].every(e=>e.getBoundingClientRect().width>0));
 const result={stage:n,steps:[],failures:[],screenshots:[]};
 async function capture(name){const path=`${out}/stage-${String(n).padStart(2,'0')}-${name}.png`;await page.locator('#world').screenshot({path});result.screenshots.push(path);}
 await capture('initial');
 // Independent physical bounds and adult/child ratios, in actual rendered pixels.
 const scale=await page.evaluate(()=>{
  const wr=document.querySelector('#world').getBoundingClientRect();
  return [...document.querySelectorAll('[data-actor]')].map(e=>{const r=e.getBoundingClientRect();return {id:e.dataset.actor,pose:e.querySelector('.sprite')?.dataset.sprite,x:r.x-wr.x,y:r.y-wr.y,w:r.width,h:r.height,worldW:wr.width,worldH:wr.height};});
 });
 for(const a of scale){assert.ok(a.x>=-1&&a.y>=-1&&a.x+a.w<=a.worldW+1&&a.y+a.h<=a.worldH+1,`Stage ${n}: clipped ${a.id}`);}
 const boy=scale.find(a=>a.id==='boy'),papa=scale.find(a=>a.id==='papa');
 assert.ok(boy.h/boy.worldH>.25&&boy.h/boy.worldH<.37,`Stage ${n}: boy/room scale`);
 if(papa){const normalizedPapaHeight=papa.h/(['papa_read','papa_drink'].includes(papa.pose)?.7:1);assert.ok(boy.h/normalizedPapaHeight>.65&&boy.h/normalizedPapaHeight<.9,`Stage ${n}: boy/papa scale`);}
 for(let i=0;i<board.steps.length;i++){
  const step=board.steps[i];
  const before=await page.evaluate(()=>GameTest.snapshot());
  for(const id of step.use){const e=before.entities[id];assert.ok(e,`Stage ${n}: no required item ${id}`);assert.ok(before.inventory.includes(id)||['stool','chair','ladder','scale'].includes(e.asset),`Stage ${n}: unacquired ${id}`);}
  const selectedItem=step.use.find(id=>before.inventory.includes(id));if(selectedItem)await page.locator(`[data-item="${selectedItem}"]`).click();
  // No stage may advance because the target is absent; the button must exist in
  // the room, or the actor must be rendered there. Hidden children target parents.
  const targetId=await page.evaluate(()=>World.actionTarget(state.board.steps[state.step]));
  const target=page.locator(`#world [data-node="${targetId}"]`);assert.equal(await target.count(),1,`Stage ${n} step ${i}: missing target ${targetId}`);
  assert.ok(await target.isVisible());
  const actionButton=page.locator('[data-role="correct"]');assert.ok(await actionButton.isEnabled(),`Stage ${n} step ${i}: unavailable ${step.text}`);
  await page.evaluate(actor=>{window.__motion=[];window.__trackActor=actor;const tick=()=>{if(!window.__trackActor)return;const e=document.querySelector(`[data-actor="${window.__trackActor}"]`);if(e){const r=e.getBoundingClientRect();window.__motion.push({x:r.x,y:r.y,sprite:e.querySelector('.sprite')?.dataset.sprite});}requestAnimationFrame(tick);};requestAnimationFrame(tick);},step.actor);
  const hit=await target.evaluate(el=>{const r=el.getBoundingClientRect();for(const fy of [.5,.2,.8,.08,.92])for(const fx of [.5,.2,.8,.08,.92]){const top=document.elementFromPoint(r.x+r.width*fx,r.y+r.height*fy)?.closest('[data-node]');if(top===el)return {x:r.width*fx,y:r.height*fy};}return null;});
  assert.ok(hit,`Stage ${n} step ${i}: target completely obscured`);
  await target.click({position:hit});
  if(board.puzzle?.step===i){await page.locator('#puzzleOverlay').waitFor();const input=page.locator('#puzzleAnswer');if(board.puzzle.options)await input.selectOption(board.puzzle.answer);else await input.fill(board.puzzle.answer);await page.locator('#puzzleSubmit').click();}
  if(i===0||i===board.steps.length-1){await page.waitForTimeout(780);await capture('action-'+i);}
  await page.waitForFunction(expected=>state.step===expected&&!state.busy,i+1,{timeout:15000});
  const motion=await page.evaluate(()=>{window.__trackActor=null;return window.__motion;});
  const pose=motion.findLast(f=>!f.sprite.endsWith('_idle'))?.sprite;
  assert.ok(new Set(motion.map(f=>Math.round(f.x)+','+Math.round(f.y))).size>1,`Stage ${n} step ${i}: no rendered movement`);
  assert.ok(new Set(motion.map(f=>f.sprite)).size>1,`Stage ${n} step ${i}: no rendered pose change`);
  const after=await page.evaluate(()=>GameTest.snapshot());
  const badBounds=await page.evaluate(()=>{const wr=document.getElementById('world').getBoundingClientRect();return [...document.querySelectorAll('#world [data-node]')].map(e=>({id:e.dataset.node,r:e.getBoundingClientRect()})).filter(({r})=>r.x<wr.x-2||r.y<wr.y-2||r.right>wr.right+2||r.bottom>wr.bottom+2).map(e=>e.id);});
  assert.deepEqual(badBounds,[],`Stage ${n} step ${i}: clipped world entities`);

  if(step.gain){assert.ok(after.inventory.includes(step.gain),`Stage ${n} missing acquired ${step.gain}`);assert.equal(await page.locator(`#world [data-entity="${step.gain}"]`).count(),0);assert.equal(await page.locator(`[data-item="${step.gain}"]`).count(),1);}
  if(step.kind==='give'){for(const id of step.use){assert.ok(!after.inventory.includes(id));assert.equal(after.entities[id].holder,step.target);}}
  if(['open','collect','code'].includes(step.kind))assert.equal(after.entities[step.target]?.opened||after.actors[step.target]?.opened,true,`Stage ${n} target didn't open`);
  const audit=after.audit.at(-1);assert.deepEqual(audit.phases,i===board.steps.length-1?['approach','anticipation','action','collection','recovery','complete']:['approach','anticipation','action','recovery','complete']);
  assert.ok(new Set(audit.frames).size>=2,`Stage ${n} action ${i}: static pose`);

  result.steps.push({index:i,text:step.text,kind:step.kind,target:targetId,actor:step.actor,actionPose:pose,renderedFrameCount:motion.length,animationFrames:[...new Set(audit.frames)],roomBefore:before.room,roomAfter:after.room,inventoryBefore:before.inventory,inventoryAfter:after.inventory,verified:true});
 }
 await page.locator('.result-card h2').filter({hasText:'CLEAR!'}).waitFor();
 assert.ok(await page.evaluate(()=>state.found));await capture('clear');
 for(let i=0;i<board.failures.length;i++){
  await page.evaluate(n=>GameTest.loadStage(n),n);
  while(!await page.locator(`[data-fail="${i}"]`).count()||!await page.locator(`[data-fail="${i}"]`).isEnabled()){
   const j=await page.evaluate(()=>state.step),s=board.steps[j];assert.ok(s,'Failure target never becomes available');
   const held=await page.evaluate(()=>state.inventory);const item=s.use.find(x=>held.includes(x));if(item)await page.locator(`[data-item="${item}"]`).click();
   await page.locator('[data-role="correct"]').click();
   if(board.puzzle?.step===j){const input=page.locator('#puzzleAnswer');if(board.puzzle.options)await input.selectOption(board.puzzle.answer);else await input.fill(board.puzzle.answer);await page.locator('#puzzleSubmit').click();}
   await page.waitForFunction(j=>state.step===j+1&&!state.busy,j);
  }
  await page.locator(`[data-fail="${i}"]`).click();await page.locator('.result-card.fail').waitFor();assert.equal((await page.evaluate(()=>GameTest.getState())).status,'FAILED');
  await page.locator('#resRetry').click();assert.equal((await page.evaluate(()=>GameTest.getState())).step,0);assert.deepEqual(await page.evaluate(()=>state.inventory),[]);result.failures.push({index:i,failed:true,retry:true});
 }
 fs.writeFileSync(`${out}/stage-${String(n).padStart(2,'0')}.json`,JSON.stringify(result,null,2));console.log(`Stage ${n}: ${result.steps.length} physical actions, ${result.failures.length} failures + Retry verified`);return result;
}
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[],errors=[],failures=[];let cursor=0;
 await Promise.all(Array.from({length:Math.min(4,selected.length)},async()=>{
  const page=await browser.newPage({viewport:{width:1600,height:1100}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000');
  while(cursor<selected.length){const n=selected[cursor++];try{results.push(await runStage(page,n));}catch(e){await page.screenshot({path:`${out}/FAILED-stage-${n}.png`});failures.push({stage:n,error:e.stack});console.error(`Stage ${n} FAILED: ${e.message}`);}}
  await page.close();
 }));
 fs.writeFileSync(`${out}/failures.json`,JSON.stringify(failures,null,2));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);results.sort((a,b)=>a.stage-b.stage);
 fs.writeFileSync(`${out}/summary.json`,JSON.stringify({stages:results.length,actions:results.reduce((n,s)=>n+s.steps.length,0),failures:results.reduce((n,s)=>n+s.failures.length,0),errors,results},null,2));
 await browser.close();console.log('ALL SELECTED PHYSICAL STORY TESTS PASS');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
