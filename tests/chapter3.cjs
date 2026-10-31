const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
let browser;

(async () => {
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000');
 fs.mkdirSync('test-results',{recursive:true});
 // After initial delivery, all stage transitions must work offline without a CDN.
 const offline=await browser.newPage();
 await offline.goto('http://127.0.0.1:8000');
 await offline.context().setOffline(true);
 await offline.locator('#startBtn').click();
 assert.equal(await offline.locator('.stage-card').count(),50);
 await offline.context().setOffline(false);
 await offline.close();
 for(const n of [21,22,23,24,25,26,27,28,29,30]){
   await page.evaluate(n=>GameTest.loadStage(n),n);
   await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   assert.ok(await page.locator('.scene-target').count()>0);
   await page.screenshot({path:`test-results/stage-${n}.png`});
   // Exercise every step through scene targets, never the correct-action shortcut.
   while((await page.evaluate(()=>GameTest.getState().status))==='PLAYING'){
     const st=await page.evaluate(()=>({step:state.step,total:state.data.solution.length,target:document.querySelector(`[data-target="${Chapter3.enabled()?state.data.stage&&({21:['drawer','sister','sister','fridge','fridge'],22:['microwave','breaker','microwave','lock','lock'],23:['grandma','chair','chair','cabinet'],24:['mug','pot','papa','papa','drawer'],25:['remote','robot','robot','key','pantry'],26:['books','shelf','case','case'],27:['stickers','closet','sister','sister','box'],28:['torch','bed','cat','box','box'],29:['calendar','calendar','dial','drawer'],30:['blanket','pins','chair','fort','panel','panel']})[state.stage][state.step]:''}"]`)?.dataset.target}));
     if(st.step===st.total){await page.locator('.result-card').waitFor();break;}
     assert.ok(st.target,`Missing target at Stage ${n} step ${st.step}`);
     await page.locator(`[data-target="${st.target}"]`).click();
     await page.waitForFunction(i=>GameTest.getState().step===i,st.step+1);
     await page.waitForFunction(()=>!state.busy);
   }
   await page.locator('.result-card h2').filter({hasText:'CLEAR!'}).waitFor();
 }
 // Click / drag from BAG. Wrong selections and missing items must not advance.
 await page.evaluate(()=>GameTest.loadStage(21));
 await page.locator('[data-target="sister"]').click();
 assert.equal(await page.evaluate(()=>state.step),0);
 await page.locator('[data-target="drawer"]').click();
 await page.waitForFunction(()=>!state.busy);
 await page.evaluate(()=>{state.selected=null;renderInventory()});
 await page.locator('[data-role="correct"]').click();
 assert.equal(await page.evaluate(()=>state.step),1);
 await page.locator('[data-item="スプーン"]').click();
 assert.equal(await page.evaluate(()=>state.selected),'スプーン');
 await page.locator('[data-item="スプーン"]').dragTo(page.locator('[data-target="sister"]'));
 await page.waitForFunction(()=>state.step===2&&!state.busy);
 assert.equal(await page.locator('[data-item="スプーン"]').count(),0);
 // Double clicks and stale callbacks may not solve a later step or next stage.
 await page.evaluate(()=>GameTest.loadStage(30));
 await page.locator('[data-target="blanket"]').dblclick();
 assert.equal(await page.evaluate(()=>state.step),1);
 await page.locator('#retryBtn').click();
 await page.waitForTimeout(1000);
 assert.equal(await page.evaluate(()=>state.step),0);
 assert.equal(await page.locator('[data-item]').count(),0);
 await page.evaluate(()=>GameTest.loadStage(1));
 await page.locator('[data-role="correct"]').click();
 await page.locator('#menuBtn').click();
 await page.waitForTimeout(1200);
 assert.equal(await page.locator('.stage-card').count(),50);
 assert.equal(await page.locator('.overlay').count(),0);
 // Audio sources must decode in Chromium. Mute, resume and Yari invocation remain wired.
 assert.ok(await page.evaluate(()=>audio.bgm.readyState>=2&&audio.clear.readyState>=2));
 await page.locator('#audioBtn').click();
 assert.equal(await page.evaluate(()=>audio.bgm.paused),true);
 await page.locator('#audioBtn').click();
 await page.waitForFunction(()=>!audio.bgm.paused);
 assert.deepEqual(errors,[]);
 fs.writeFileSync('test-results/chapter3.json',JSON.stringify({sceneRoutes:10,bagClickAndDrag:'PASS',itemRequirements:'PASS',doubleClick:'PASS',staleTimers:'PASS',offlineAfterLoad:'PASS',audioDecodeAndToggle:'PASS',errors},null,2));
 await browser.close();console.log('Chapter 3 scene routes, BAG click/drag, inventory requirements, timers, offline and audio: PASS');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
