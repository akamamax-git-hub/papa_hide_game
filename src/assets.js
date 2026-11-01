/* Loading artwork must never lock the whole room or wait for unused frames. */
const AssetManager=(()=>{
 const images=new Map();let sequence=0;
 const active=token=>state?.token===token;
 function load(url,priority='high'){
  let entry=images.get(url);
  if(entry){if(priority==='high')entry.image.fetchPriority='high';return entry.promise;}
  const im=new Image();entry={image:im,ready:false,promise:null};im.fetchPriority=priority;
  entry.promise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{im.src='';reject(Error('Image loading timed out'));},8000);
   im.onload=()=>{clearTimeout(timer);entry.ready=true;resolve(im);};
   im.onerror=()=>{clearTimeout(timer);reject(Error('Image loading failed'));};im.src=url;
  });
  images.set(url,entry);entry.promise.catch(()=>{if(images.get(url)===entry)images.delete(url);});return entry.promise;
 }
 function bitmap(sheet){const e=images.get(A[sheet]);return e?.ready?e.image:null;}
 function spriteURL(name){return CATALOG[name]&&A[CATALOG[name].sheet];}
 function posesURLs(id,poses){const a=state?.actors[id];if(!a)return [];const wears=a.room==='entrance'?['indoor','outdoor']:[SceneGeometry.footwear(a.room,a.y)];const urls=[];
  for(const pose of poses){const base=CATALOG[id+'_'+pose]?id+'_'+pose:id+'_idle';for(const wear of wears)urls.push(spriteURL(CATALOG[base+'_'+wear]?base+'_'+wear:base));}return urls.filter(Boolean);
 }
 function initialURLs(){const urls=[];for(const e of Object.values(state.entities))if(e.asset&&e.asset!=='window'&&!e.parts&&e.asset!=='boxes'&&World.isHere(e))urls.push(spriteURL(World.visual(e)));for(const a of Object.values(state.actors))if(a.room===state.room&&a.visible)urls.push(spriteURL(World.actorAsset(a)));return [...new Set(urls.filter(Boolean))];}
 function notice(token,text,retry){if(!active(token))return;state.assetNotice={text,retry:!!retry};let panel=document.getElementById('sceneLoading');if(!panel){panel=document.createElement('div');panel.id='sceneLoading';panel.className='scene-load-status';panel.setAttribute('role','status');panel.onclick=e=>e.stopPropagation();document.getElementById('world')?.append(panel);}panel.replaceChildren();const message=document.createElement('span');message.textContent=text;panel.append(message);if(retry){const button=document.createElement('button');button.className='load-retry';button.textContent='画像を再読み込み';button.onclick=()=>prepare(token);panel.append(button);}}
 function removeNotice(token){if(active(token)){state.assetNotice=null;document.getElementById('sceneLoading')?.remove();}}
 function restoreNotice(){const n=state?.assetNotice;if(n)notice(state.token,n.text,n.retry);}
 async function ensure(urls,token){try{await Promise.all([...new Set(urls.filter(Boolean))].map(url=>load(url)));return active(token);}catch{if(active(token)){notice(token,'一部の画像を読み込めませんでした。表示できた物は操作できます。',true);}return false;}}
 async function poses(id,list,token){return ensure(posesURLs(id,list),token);}
 async function prepare(token){
  if(!active(token))return false;const current=++sequence,room=state.room,urls=initialURLs();state.loading=true;state.loadError=false;
  notice(token,'画像を読み込み中… 表示できた物は操作できます。');
  // The decorative room background has no dependency on puzzle input.
  state.backgroundLoading=true;state.backgroundError=false;load(A[World.backgroundKey(room)],'low').then(()=>{if(active(token)&&state.room===room){state.backgroundLoading=false;if(!state.loading&&!state.loadError)removeNotice(token);}},()=>{if(active(token)&&state.room===room){state.backgroundLoading=false;state.backgroundError=true;notice(token,'背景を読み込めませんでした。ゲームは操作できます。',true);}});
  const ok=await ensure(urls,token);
  if(!active(token)||sequence!==current)return false;
  state.loading=false;state.loadError=!ok;
  if(ok){if(state.backgroundLoading)notice(token,'背景を読み込み中… ゲームは操作できます。');else if(!state.backgroundError)removeNotice(token);}
  return ok;
 }
 function watchVisible(){const token=state?.token,room=state?.room;if(!token)return;for(const url of initialURLs())load(url).catch(()=>{if(active(token)&&state.room===room)notice(token,'一部の画像を読み込めませんでした。表示できた物は操作できます。',true);});}
 async function action(step,token){const urls=[],visited=new Set();
  function object(id){if(visited.has(id))return;visited.add(id);const e=state.entities[id];if(!e)return;object(e.parent);if(e.controlId)object(e.controlId);for(const part of e.parts||[])object(part);if(e.asset){urls.push(spriteURL(World.visual(e)));for(const suffix of ['','_open','_on','_melted','_full'])urls.push(spriteURL(e.asset+suffix));if(e.asset==='mug')urls.push(spriteURL('coffee'));if(e.asset==='note')urls.push(spriteURL('note_dry'));if(e.asset==='ice')urls.push(spriteURL('plate'));}}
  if(step.kind==='collect'||step.revealGame){object(state.board.console.container);object('console');}
  for(const id of [step.target,step.gain,...step.use,...step.reveal,...Object.keys(step.move),...Object.keys(step.change)])object(id);
  for(const id of new Set([step.actor,step.target,...Object.keys(step.move),...Object.keys(step.change),...step.reveal])){const a=state.actors[id];if(a)urls.push(...posesURLs(id,[CATALOG[id+'_'+a.mode]?a.mode:'idle']));}
  if(step.kind==='climb'||state.actors[step.actor]?.support)urls.push(...posesURLs(step.actor,['idle','climb']));
  if(step.ranged||step.kind==='dry')urls.push(...posesURLs(step.actor,['hold']));
  if(['read','inspect'].includes(step.kind)||state.entities[step.target]?.place==='bag')urls.push(...posesURLs(step.actor,['read']));
  if(step.kind==='shoo')urls.push(...posesURLs(step.actor,['reachUp']));
  if(['give','throw'].includes(step.kind)&&state.actors[step.target])urls.push(...posesURLs(step.target,['receive','eat']));
  if(['open','code','collect'].includes(step.kind)&&state.actors[step.target])urls.push(...posesURLs(step.target,['open']));
  for(const [id,mode] of Object.entries(step.change))if(state.actors[id])urls.push(...posesURLs(id,[mode]));
  for(const id of step.reveal)if(state.actors[id])urls.push(spriteURL(World.actorAsset(state.actors[id])));
  if(step.kind==='collect')urls.push(...posesURLs('boy',['happy']));
  if(step.failure){urls.push(...posesURLs('boy',['surprise']));urls.push(...posesURLs('papa',['angry']));}
  return ensure(urls,token);
 }
 return {prepare,action,poses,bitmap,restoreNotice,watchVisible};
})();
