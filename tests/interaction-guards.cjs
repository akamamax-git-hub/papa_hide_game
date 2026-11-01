const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1600,height:1100}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8000');
 async function correct(){const before=await page.evaluate(()=>{state.assist=true;const s=state.board.steps[state.step];state.selected=s.use.find(id=>state.inventory.includes(id))||null;renderInventory();renderChoices();return state.step;});await page.locator('[data-role="correct"]').click();await page.waitForFunction(i=>state.step===i+1&&!state.busy,before);}
 await page.evaluate(()=>GameTest.loadStage(20));for(let i=0;i<4;i++)await correct();
 await page.locator('[data-item="key"]').click();await page.locator('[data-role="correct"]').click();assert.equal(await page.evaluate(()=>state.step),4);assert.ok((await page.locator('#caption').textContent()).includes('BAG'));
 await page.locator('[data-item="rope"]').dragTo(page.locator('[data-entity="box"]'));await page.waitForFunction(()=>state.step===5&&!state.busy);assert.ok(await page.evaluate(()=>state.inventory.includes('rope')));
 await page.evaluate(()=>{GameTest.loadStage(1);state.assist=true;renderChoices();});await page.locator('[data-role="correct"]').dblclick();await page.waitForFunction(()=>!state.busy);assert.equal(await page.evaluate(()=>state.step),1);
 await page.locator('[data-item="paper"]').click();await page.locator('[data-role="correct"]').click();await page.locator('#retryBtn').click();await page.waitForTimeout(2200);assert.equal(await page.evaluate(()=>state.step),0);await page.evaluate(()=>{state.assist=true;renderChoices();});assert.deepEqual(await page.evaluate(()=>state.inventory),[]);
 await page.locator('[data-role="correct"]').click();await page.locator('#menuBtn').click();await page.waitForTimeout(2200);assert.equal(await page.locator('.stage-card').count(),50);assert.equal(await page.locator('.overlay').count(),0);
 // Wrong input is a real puzzle failure; cancellation preserves the world.
 await page.evaluate(()=>GameTest.loadStage(29));await correct();await correct();await page.locator('[data-role="correct"]').click();await page.locator('#puzzleCancel').click();assert.equal(await page.evaluate(()=>state.step),2);await page.locator('[data-role="correct"]').click();await page.locator('#puzzleAnswer').fill('0000');await page.locator('#puzzleSubmit').click();await page.locator('.result-card.fail').waitFor();assert.equal(await page.evaluate(()=>state.found),false);
 // All scene navigation still works with the connection disabled after loading.
 await context.setOffline(true);await page.evaluate(()=>GameTest.loadStage(34));await correct();await correct();assert.equal(await page.evaluate(()=>state.room),'garden');await correct();await context.setOffline(false);
 // Render all 50 at two PC viewport sizes. No actor may leave the scene bounds.
 for(const viewport of [{width:1366,height:900},{width:1920,height:1080}]){
  await page.setViewportSize(viewport);
  for(let n=1;n<=50;n++){
   await page.evaluate(n=>GameTest.loadStage(n),n);
   const clipped=await page.evaluate(()=>{const b=document.getElementById('world').getBoundingClientRect();return [...document.querySelectorAll('#world [data-actor]')].filter(e=>{const r=e.getBoundingClientRect();return r.x<b.x-1||r.y<b.y-1||r.right>b.right+1||r.bottom>b.bottom+1}).map(e=>e.dataset.actor)});
   assert.deepEqual(clipped,[],`Stage ${n} at ${viewport.width}`);
  }
 }
 await page.locator('#audioBtn').click();assert.equal(await page.evaluate(()=>audio.bgm.paused),true);await page.locator('#audioBtn').click();await page.waitForFunction(()=>audio.bgm.readyState>=2&&!audio.bgm.paused);assert.ok(await page.evaluate(()=>Object.values(audio).every(a=>a.readyState>=2)));
 assert.deepEqual(errors,[]);fs.mkdirSync('test-results/v014',{recursive:true});fs.writeFileSync('test-results/v014/guards.json',JSON.stringify({wrongItemSelection:'PASS',bagDragUse:'PASS',reusableToolRetained:'PASS',doubleClick:'PASS',retryDuringAnimation:'PASS',menuDuringAnimation:'PASS',puzzleCancel:'PASS',wrongCodeFailure:'PASS',offlineRoomChange:'PASS',pcViewportChecks:100,audioDecodeAndToggle:'PASS',errors},null,2));console.log('Interaction guards, direct BAG drag, offline travel, 100 PC viewport checks and audio decode/toggle: PASS');await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
