// Chapter 3 is declarative: every route step describes a target, inventory
// requirement and visible state. The original scenario remains authoritative.
const Chapter3 = (() => {
  const propNames = ['spoon','pudding','fridge','fridgeOpen','microwave','clock',
    'breaker','breakerOn','chair','tea','mug','coffee',
    'pot','drawer','drawerOpen','robot','remote','pantry',
    'books','closet','closetOpen','torch','torchOn','fort'];
  const extraNames = ['grandma','grandmaReceive','grandmaWalk','grandmaSit',
    'blanket','pins','stickers','calendar','dial','dialOpen','panel','panelOpen'];
  const poses = ['idle','pudding','receive','walk1','walk2','eat','surprise','exit'];
  const routes = {
    21: { objects: [['drawer','引き出し',57,42],['sister','妹',37,66],['fridge','冷蔵庫',20,43]],
      steps: [ ['drawer','spoon','スプーン'],['sister','receive',null,'スプーン'],['sister','eat'],['fridge','fridgeOpen'],['fridge','console'] ], initial: {sister:'pudding'}, focus:'drawer' },
    22: { objects: [['microwave','電子レンジ',58,32],['breaker','廊下のブレーカー',8,24],['lock','ロック箱',86,38]],
      steps: [['microwave','microwave'],['breaker','breakerOn'],['microwave','clock'],['lock','dialOpen'],['lock','console']], focus:'microwave' },
    23: { objects: [['grandma','おばあちゃん',43,63],['chair','ダイニングチェア',39,73],['cabinet','食器棚上段',86,26]],
      steps: [['grandma','grandmaReceive'],['chair','chair'],['chair','chair'],['cabinet','console']], initial:{grandma:'grandma',cabinet:'pantry'}, focus:'grandma' },
    24: { objects: [['mug','マグカップ',43,50],['pot','コーヒーポット',65,33],['papa','パパ',84,70],['drawer','カウンター下',58,46]],
      steps: [['mug','mug','マグカップ'],['pot','coffee','コーヒー','マグカップ'],['papa','coffee',null,'コーヒー'],['papa','coffee'],['drawer','drawerOpen']], focus:'mug' },
    25: { objects: [['remote','掃除機リモコン',45,52],['robot','ロボット掃除機',29,76],['key','鍵',20,67],['pantry','パントリー',86,50]],
      steps: [['remote','remote','ロボット掃除機リモコン'],['robot','robot',null,'ロボット掃除機リモコン','keep'],['robot','robot'],['key','key','鍵'],['pantry','drawerOpen',null,'鍵']], focus:'remote' },
    26: { objects: [['books','床の教科書',36,78],['shelf','本棚',68,41],['case','教科書型ケース',69,49]],
      steps: [['books','books','教科書4冊'],['shelf','books',null,'教科書4冊'],['case','books'],['case','console']], initial:{shelf:'books',case:'books'}, focus:'books' },
    27: { objects: [['stickers','シール',56,40],['closet','クローゼット',83,44],['sister','妹',77,63],['box','奥の箱',81,59]],
      steps: [['stickers','stickers','シール'],['closet','closetOpen'],['sister','receive',null,'シール'],['sister','exit'],['box','console']], initial:{box:'box',sister:'surprise'}, focus:'closet' },
    28: { objects: [['torch','懐中電灯',54,36],['bed','ベッド下',20,66],['cat','猫',29,70],['box','箱',41,75]],
      steps: [['torch','torch','懐中電灯'],['bed','torchOn',null,'懐中電灯','keep'],['cat','torchOn',null,'懐中電灯','keep'],['box','box'],['box','console']], initial:{bed:'torch',box:'box'}, focus:'torch' },
    29: { objects: [['calendar','カレンダー',31,25],['dial','机のダイヤル',57,45],['drawer','机の引き出し',56,52]],
      steps: [['calendar','calendar'],['calendar','calendar'],['dial','dialOpen'],['drawer','dialOpen']], initial:{drawer:'dial'}, focus:'calendar' },
    30: { objects: [['blanket','毛布',16,47],['pins','洗濯ばさみ',51,36],['chair','椅子',40,59],['fort','秘密基地',54,75],['panel','隠しパネル',60,55]],
      steps: [['blanket','blanket','毛布'],['pins','pins','洗濯ばさみ2個'],['chair','chair'],['fort','fort',null,['毛布','洗濯ばさみ2個']],['panel','panelOpen'],['panel','console']], focus:'blanket' }
  };
  const itemKeys = {'スプーン':'spoon','マグカップ':'mug','コーヒー':'coffee','ロボット掃除機リモコン':'remote',
    '鍵':'key','教科書4冊':'books','シール':'stickers','懐中電灯':'torch','毛布':'blanket','洗濯ばさみ2個':'pins','椅子':'chair','ダイニングチェア':'chair','カレンダー':'calendar'};
  function enabled() { return !!routes[state?.stage]; }
  function sprite(key, cls='') {
    if(key==='console'||key==='key'||key==='box') return `<img class="detail-img ${cls}" src="${A[key==='console'?'console':key==='key'?'item_鍵':'item_段ボール']}" alt="">`;
    const isSister=key.startsWith('sister-');
    let index=isSister?-1:propNames.indexOf(key),atlas='props_atlas',width=1536,height=1024,x,y,w,h;
    if(index>=0){x=index%6*256+5;y=Math.floor(index/6)*256+5;w=246;h=246;if(index===13||index===14)h=230;}
    else {
      index=isSister?-1:extraNames.indexOf(key);
      if(index>=0){atlas='extras_atlas';width=1448;height=1086;const row=Math.floor(index/4),ys=[0,485,815,1086];x=index%4*362+4;y=ys[row]+4;w=354;h=ys[row+1]-ys[row]-8;}
      else {index=poses.indexOf(key.replace('sister-',''));if(index<0)return '';atlas='sister_atlas';width=1774;height=887;x=index%4*443.5+3;y=Math.floor(index/4)*443.5+3;w=437.5;h=437.5;}
    }
    return `<span aria-hidden="true" class="atlas ${atlas} ${cls}" style="--bw:${width/w*100}%;--bh:${height/h*100}%;--sx:${x/(width-w)*100}%;--sy:${y/(height-h)*100}%"></span>`;

  }
  function installAssets() {
    if(document.getElementById('chapterAssets')) return;
    const style=document.createElement('style');style.id='chapterAssets';
    style.textContent=['props_atlas','extras_atlas','sister_atlas'].map(k=>`.${k}{background-image:url("${A[k]}")}`).join('');
    document.head.appendChild(style);
  }
  function init() {
    if(!enabled()) return;
    installAssets();
    state.scene={...routes[state.stage].initial};state.focus=routes[state.stage].focus;
    state.busy=false;
    document.getElementById('world').classList.add('chapter-world');
    document.querySelector('.game-layout').classList.add('chapter-layout');
    document.querySelector('.stage-banner')?.remove();
    document.querySelector('.npc-row').innerHTML='';
    const world=document.getElementById('world');
    world.insertAdjacentHTML('beforeend','<div class="scene-targets" id="sceneTargets"></div><section class="inspection" aria-label="調べている場所" aria-live="polite" id="inspection"></section><div class="scene-npcs" id="sceneNpcs"></div>');
    render();
  }
  function next() { return routes[state.stage]?.steps[state.step]; }
  function requireItems(step=next()) { return step?.[3] ? [].concat(step[3]) : []; }
  function attempt(id) {
    if(!enabled()||state.status!=='PLAYING'||state.busy) return;
    state.focus=id;
    if(id!==next()?.[0]) { document.getElementById('caption').textContent='ここはまだ変化がない。周りを調べよう。';render();return; }
    const required=requireItems();
    if(required.some(x=>!state.inventory.includes(x)) || (required.length && !required.includes(state.selected))) {
      document.getElementById('caption').textContent='BAGのアイテムを選んで、この場所に使おう。';render();return;
    }
    handleAction('correct',state.data.solution[state.step]);
  }
  function apply() {
    const c=next();if(!c)return;
    state.focus=c[0];state.scene[c[0]]=c[1];
    if(c[2]&&!state.inventory.includes(c[2])) { state.inventory.push(c[2]);state.selected=c[2]; }
    for(const item of (c[4]==='keep'?[]:requireItems(c))) { state.inventory=state.inventory.filter(x=>x!==item); }
    if(!state.inventory.includes(state.selected)) state.selected=null;
    if(state.stage===24&&state.step===1) state.scene.mug='coffee';
    renderInventory();
  }
  function after() {
    if(!enabled())return;render();
    const movingSister=(state.stage===21&&state.step===3)||(state.stage===27&&state.step===4);
    if(movingSister){
      const host=document.getElementById('sceneNpcs');host.innerHTML=`<div class="scene-npc sister sister-walking" aria-label="妹">${sprite('sister-walk1')}</div>`;
      [120,240,360,480].forEach((ms,i)=>stageTimeout(()=>{const el=host.querySelector('.sister');if(el)el.innerHTML=sprite('sister-'+(i%2?'walk1':'walk2'));},ms));
      stageTimeout(()=>render(),650);
    }
  }
  function render() {
    if(!enabled()) return;
    const config=routes[state.stage],step=state.step;
    const available=config.objects.filter(([id])=> !(state.stage===27&&id==='sister'&&step<2) && !(state.stage===25&&id==='key'&&step<3));
    document.getElementById('sceneTargets').innerHTML=available.map(([id,label,x,y])=>`<button class="scene-target ${state.focus===id?'inspecting':''}" data-target="${id}" style="left:${x}%;top:${y}%" aria-label="${esc(label)}を調べる"><i></i><span>${esc(label)}</span></button>`).join('');
    document.querySelectorAll('.scene-target').forEach(b=>{
      b.onclick=()=>attempt(b.dataset.target);
      b.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';};
      b.ondrop=e=>{e.preventDefault();const item=e.dataTransfer.getData('text/plain');if(state.inventory.includes(item)){state.selected=item;renderInventory();attempt(b.dataset.target);}};
    });
    const current=config.objects.find(o=>o[0]===state.focus),key=state.scene[state.focus]||state.focus;
    const detail=document.getElementById('inspection');const displayKey=state.focus==='sister'?'sister-'+key:key;
    detail.innerHTML=`<div class="inspection-title">${esc(current?.[1]||'部屋を調べる')}<small>拡大ビュー</small></div><div class="inspection-art">${sprite(displayKey)}</div><div class="inspection-note">${esc(state.data.solution[Math.max(0,step-1)]||'気になる場所をクリックしてみよう。')}</div>`;
    if(state.stage===22&&step>=3) detail.insertAdjacentHTML('beforeend','<span class="clue-number">12 : 00</span>');
    if(state.stage===29&&state.focus==='calendar'&&step>=2) detail.insertAdjacentHTML('beforeend','<span class="clue-number">★ 7日　★ 14日</span>');
    if(state.stage===26&&step>=2&&state.focus==='shelf') detail.insertAdjacentHTML('beforeend','<span class="clue-number">1 → 2 → 3 → 4</span>');
    let npc='';
    if(state.data.characters.includes('妹')) {
      const hidden=state.stage===27&&step<2, leaving=state.stage===27&&step>=4;
      if(!hidden&&!leaving) npc=`<div class="scene-npc sister ${state.stage===21&&step>=3?'at-table':''}" aria-label="妹">${sprite('sister-'+(state.scene.sister||'pudding'))}</div>`;
    }
    if(state.data.characters.includes('おばあちゃん')) npc+=`<div class="scene-npc grandma ${step?'at-table':''}" aria-label="おばあちゃん">${sprite(state.scene.grandma||'grandma')}</div>`;
    if(state.stage===25) npc+=`<div class="robot-on-floor ${step>=2?'robot-at-fridge':''}" aria-label="ロボット掃除機">${sprite('robot')}</div>`;
    if(state.stage===25&&step>=3&&step<4) npc+=`<div class="key-on-floor">${sprite('key')}</div>`;
    if(state.stage===26&&step===0) npc+=`<div class="books-on-floor">${sprite('books')}</div>`;
    if(state.stage===30&&step>=4) npc+=`<div class="fort-on-floor">${sprite('fort')}</div>`;
    document.getElementById('sceneNpcs').innerHTML=npc;
    if(state.stage===24) document.getElementById('papa')?.classList.toggle('papa-at-table',step>=4);
    if(state.stage===28) document.getElementById('world').classList.toggle('torch-lit',step>=2);
  }
  function inventorySprite(item) { return itemKeys[item] ? sprite(itemKeys[item]) : ''; }
  return {init,enabled,apply,after,attempt,inventorySprite,requireItems};
})();
