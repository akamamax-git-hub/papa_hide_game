const {chromium}=require('playwright');const fs=require('node:fs');const assert=require('node:assert/strict');
const boards=JSON.parse(fs.readFileSync('scenario/storyboards.json'));let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cursor=0;const results=[],failures=[];
 await Promise.all(Array.from({length:4},async()=>{
  const p=await browser.newPage({viewport:{width:1600,height:1100}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8000');
  while(cursor<50){const n=++cursor,b=boards[n-1];try{
   for(let f=0;f<b.failures.length;f++){
    await p.evaluate(n=>GameTest.loadStage(n),n);
    while(!await p.locator(`[data-fail="${f}"]`).count()||!await p.locator(`[data-fail="${f}"]`).isEnabled()){
     const i=await p.evaluate(()=>state.step),s=b.steps[i];assert.ok(s,'Failure never available');const bag=await p.evaluate(()=>state.inventory),id=s.use.find(id=>bag.includes(id));if(id)await p.locator(`[data-item="${id}"]`).click();await p.locator('[data-role="correct"]').click();
     if(b.puzzle?.step===i){const input=p.locator('#puzzleAnswer');if(b.puzzle.options)await input.selectOption(b.puzzle.answer);else await input.fill(b.puzzle.answer);await p.locator('#puzzleSubmit').click();}
     await p.waitForFunction(i=>state.step===i+1&&!state.busy,i,{timeout:30000});
    }
    await p.locator(`[data-fail="${f}"]`).click();await p.locator('.result-card.fail').waitFor({timeout:30000});assert.equal(await p.evaluate(()=>state.found),false);
    await p.locator('#resRetry').click();assert.deepEqual(await p.evaluate(()=>({step:state.step,bag:state.inventory,spawn:state.entities.console.birth,hidden:!state.entities.console.visible})),{step:0,bag:[],spawn:'stage-init',hidden:true});results.push({stage:n,failure:f,retry:true});
   }
   console.log(`Stage ${n}: FAILED + Retry PASS`);
  }catch(e){failures.push({stage:n,error:e.stack,errors:[...errors]});console.error(`Stage ${n} failure test: ${e.message}`);await p.screenshot({path:`test-results/v013/FAILED-route-${n}.png`});}
  }assert.deepEqual(errors,[]);await p.close();
 }));
 fs.writeFileSync('test-results/v013/failure-routes.json',JSON.stringify({results,failures},null,2));await browser.close();assert.deepEqual(failures,[]);console.log(`${results.length} failure routes + Retry PASS`);
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
