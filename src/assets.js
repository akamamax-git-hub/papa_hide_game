/* Decode only this room's artwork. No sound or other stages block the title. */
const AssetManager=(()=>{
 const images=new Map();let sequence=0;
 function load(url){
  if(!images.has(url)){
   const pending=new Promise((resolve,reject)=>{const im=new Image(),timer=setTimeout(()=>{im.src='';reject(Error('Image loading timed out'));},30000);im.onload=()=>{im.decode().then(()=>{clearTimeout(timer);resolve();},e=>{clearTimeout(timer);reject(e);});};im.onerror=()=>{clearTimeout(timer);reject(Error('Image loading failed'));};im.src=url;});
   images.set(url,pending);pending.catch(()=>{if(images.get(url)===pending)images.delete(url);});
  }
  return images.get(url);
 }
 function roomAssets(){
  const keys=new Set([World.backgroundKey(state.room)]),sprite=key=>{if(CATALOG[key])keys.add(CATALOG[key].sheet);};
  for(const e of Object.values(state.entities))if(e.room===state.room&&e.asset){
   for(const suffix of ['','_open','_on','_melted','_full'])sprite(e.asset+suffix);
   if(e.asset==='mug')sprite('coffee');if(e.asset==='note')sprite('note_dry');if(e.asset==='ice')sprite('plate');
  }
  sprite('console');
  for(const a of Object.values(state.actors))if(a.room===state.room){
   const wears=state.room==='entrance'?['indoor','outdoor']:[SceneGeometry.footwear(a.room,a.y)];
   for(const name of Object.keys(CATALOG))if(name.startsWith(a.id+'_')&&!name.endsWith('_indoor')&&!name.endsWith('_outdoor'))for(const wear of wears)sprite(CATALOG[name+'_'+wear]?name+'_'+wear:name);
  }
  return [...keys].map(key=>A[key]).filter(Boolean);
 }
 async function prepare(token){
  const current=++sequence,urls=[...new Set(roomAssets())];let done=0;
  state.loading=true;state.loadError=false;
  const panel=document.createElement('div');panel.id='sceneLoading';panel.className='scene-loading';panel.setAttribute('role','status');panel.innerHTML='<div><p class="load-message">部屋を準備しています…</p><progress aria-label="部屋の読み込み"></progress><button class="load-retry" hidden>もう一度読み込む</button></div>';
  document.getElementById('world').append(panel);const progress=panel.querySelector('progress');progress.max=urls.length;progress.value=0;
  const active=()=>state?.token===token&&sequence===current;
  try{
   await Promise.all(urls.map(async url=>{await load(url);if(active()){progress.value=++done;panel.querySelector('.load-message').textContent=`部屋を準備しています… ${done} / ${urls.length}`;}}));
   if(!active())return false;state.loading=false;panel.remove();return true;
  }catch{
   if(!active())return false;state.loading=false;state.loadError=true;panel.querySelector('.load-message').textContent='画像を読み込めませんでした。接続を確認して、もう一度お試しください。';progress.hidden=true;const retry=panel.querySelector('.load-retry');retry.hidden=false;retry.onclick=()=>loadStage(state.stage);return false;
  }
 }
 return {prepare};
})();
